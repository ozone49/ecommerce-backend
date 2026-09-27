const User = require("./models/User");
const Product = require("./models/Product");

async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.insertMany([
        { name: "Demo User", email: "user@example.com", password: "123456" },
        { name: "Demo Account", email: "demo@example.com", password: "123456" }
      ]);
      console.log("Seeded sample users.");
    }

    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      // Images are served by the frontend from frontend/public/products/,
      // so they are reachable at http://localhost:3000/products/<file>.jpg
      // regardless of the backend address (no hardcoded API host needed).
      await Product.insertMany([
        {
          name: "Wireless Mouse",
          description: "A comfortable wireless mouse with USB receiver.",
          price: 15.99,
          image: "/products/wireless-mouse.png",
          stock: 50
        },
        {
          name: "Mechanical Keyboard",
          description: "RGB mechanical keyboard with blue switches.",
          price: 49.99,
          image: "/products/mechanical-keyboard.png",
          stock: 30
        },
        {
          name: "USB-C Cable",
          description: "1.5m fast-charging USB-C cable.",
          price: 6.99,
          image: "/products/usb-c-cable.png",
          stock: 100
        },
        {
          name: "Headphones",
          description: "Over-ear headphones with noise isolation.",
          price: 29.99,
          image: "/products/headphones.png",
          stock: 40
        },
        {
          name: "Laptop Stand",
          description: "Adjustable aluminum laptop stand.",
          price: 22.5,
          image: "/products/laptop-stand.png",
          stock: 25
        },
        {
          name: "Webcam",
          description: "1080p HD webcam with built-in microphone.",
          price: 34.99,
          image: "/products/webcam.png",
          stock: 20
        }
      ]);
      console.log("Seeded sample products.");
    }
  } catch (err) {
    console.error("Seeding error:", err.message);
  }
}

module.exports = seedDatabase;
