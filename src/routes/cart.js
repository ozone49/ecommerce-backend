const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Helper: recalculate cart totals for the response
function cartWithTotal(cart) {
  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { ...cart.toObject(), total };
}

// POST /api/cart  { userId, productId, quantity }
router.post("/", async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({ message: "userId and productId are required." });
    }

    const qty = quantity && quantity > 0 ? quantity : 1;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (product.stock < qty) {
      return res.status(400).json({ message: "Insufficient stock." });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find((i) => i.productId.toString() === productId);
    if (existingItem) {
      existingItem.quantity += qty;
      // Backfill the image for items added to the cart before this field
      // existed, so older carts also display correctly.
      if (!existingItem.image) {
        existingItem.image = product.image;
      }
    } else {
      cart.items.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: qty
      });
    }

    await cart.save();
    res.status(201).json(cartWithTotal(cart));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add item to cart." });
  }
});

// GET /api/cart/:userId
router.get("/:userId", async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) {
      cart = { userId: req.params.userId, items: [] };
      return res.json({ ...cart, total: 0 });
    }

    // Backfill product images for cart items that were added before the
    // "image" field existed on the Cart schema, so older carts still show
    // the correct product picture without needing to re-add the item.
    let needsSave = false;
    for (const item of cart.items) {
      if (!item.image) {
        const product = await Product.findById(item.productId);
        if (product && product.image) {
          item.image = product.image;
          needsSave = true;
        }
      }
    }
    if (needsSave) {
      await cart.save();
    }

    res.json(cartWithTotal(cart));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch cart." });
  }
});

// PUT /api/cart/:userId  { productId, quantity }
router.put("/:userId", async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({ message: "productId and quantity are required." });
    }

    const cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item) {
      return res.status(404).json({ message: "Item not found in cart." });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    res.json(cartWithTotal(cart));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update cart." });
  }
});

// DELETE /api/cart/:userId/:productId
router.delete("/:userId/:productId", async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    cart.items = cart.items.filter((i) => i.productId.toString() !== req.params.productId);
    await cart.save();
    res.json(cartWithTotal(cart));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove item from cart." });
  }
});

module.exports = router;
