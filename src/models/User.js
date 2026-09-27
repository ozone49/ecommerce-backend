const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // NOTE: For this student assignment, the password is stored in plain text
  // to keep things simple. In a real application you should always hash
  // passwords (e.g. with bcrypt) before saving them.
  password: { type: String, required: true }
});

module.exports = mongoose.model("User", userSchema);
