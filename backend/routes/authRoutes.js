const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = "stethai_secret_key"; // later move to .env

// ================= SIGNUP =================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 🔍 basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields required" });
    }

    // 🔍 check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    // 🔐 hash password
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role
    });

    // 🔑 create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 🔍 find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 🔐 compare password
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // 🔑 create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;