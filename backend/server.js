const express = require("express");
const cors = require("cors");
const axios = require("axios");
const connectDB = require("./config/db");

const app = express();

// 🔥 connect database FIRST
connectDB();

app.use(cors());
app.use(express.json());

// routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

// AI trigger route
app.post("/api/analyze/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const response = await axios.post(
      `http://localhost:6000/analyze/${userId}`
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Python service not running" });
  }
});

app.listen(5000, () =>
  console.log("🚀 Backend running on http://localhost:5000")
);