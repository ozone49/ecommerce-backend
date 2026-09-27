const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || "mongodb://mongodb:27017/ecommerce";

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected:", mongoUri);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    // Retry after a delay so we survive Mongo starting up a bit slower than backend
    setTimeout(connectDB, 5000);
  }
}

module.exports = connectDB;
