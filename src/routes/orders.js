const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const upload = require("../middleware/upload");

// ---------------------------------------------------------------------
// Simple simulated payment verification (no real payment gateway, no
// admin panel). Once a payment slip has been uploaded, the order
// automatically progresses through statuses based on elapsed time:
//   Pending Verification --(10s)--> Paid --(20s)--> Completed
// This is recalculated every time orders are read from the API, so the
// status visibly updates whenever the customer refreshes/reopens the
// Order History page.
// ---------------------------------------------------------------------
const PENDING_TO_PAID_MS = 10 * 1000;
const PAID_TO_COMPLETED_MS = 20 * 1000;

function getSimulatedStatus(order) {
  if (!order.paymentSlip) {
    return "Pending Verification";
  }

  const elapsed = Date.now() - new Date(order.createdAt).getTime();

  if (elapsed >= PENDING_TO_PAID_MS + PAID_TO_COMPLETED_MS) {
    return "Completed";
  }
  if (elapsed >= PENDING_TO_PAID_MS) {
    return "Paid";
  }
  return "Pending Verification";
}

async function refreshOrderStatus(order) {
  const simulated = getSimulatedStatus(order);
  if (simulated !== order.status) {
    order.status = simulated;
    await order.save();
  }
  return order;
}

// POST /api/orders  { userId }
// Creates an order from the user's current cart.
router.post("/", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Your cart is empty." });
    }

    // Verify stock is still available for every item
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${item.name}.`
        });
      }
    }

    const totalAmount = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = new Order({
      userId,
      items: cart.items,
      totalAmount,
      status: "Pending Verification"
    });

    await order.save();

    // Reduce stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity }
      });
    }

    // Clear the cart
    cart.items = [];
    await cart.save();

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create order." });
  }
});

// GET /api/orders/:userId
router.get("/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });

    // Advance each order's status according to the simple simulated timeline
    for (const order of orders) {
      await refreshOrderStatus(order);
    }

    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
});

// POST /api/orders/:id/payment-slip  (multipart/form-data, field name "slip")
router.post("/:id/payment-slip", (req, res) => {
  upload.single("slip")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Payment slip file is required." });
    }

    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found." });
      }

      order.paymentSlip = req.file.filename;
      await order.save();

      res.json({
        message: "Order submitted successfully. Waiting for payment verification.",
        order
      });
    } catch (err2) {
      console.error(err2);
      res.status(500).json({ message: "Failed to save payment slip." });
    }
  });
});

module.exports = router;
