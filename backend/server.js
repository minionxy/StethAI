const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const connectDB = require("./config/db");
const reportRoutes = require("./routes/reports");
const reportCrudRoutes = require("./routes/reportRoutes");
const { router: vitalsRoute, getLatestVitals } = require("./routes/vitals");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/reports", reportCrudRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/vitals", vitalsRoute);

app.post("/api/analyze/:userId", async (req, res) => {
  try {
    const { userId } = req.params; // retained for request context
    const vitals = getLatestVitals();
    const now = Date.now();
    const vitalsTs = Number(vitals?.timestamp || 0);

    if (vitals?.status === "no_finger") {
      return res.status(400).json({
        error: "Place finger on sensor and keep still for a few seconds.",
      });
    }

    if (vitals?.status === "invalid") {
      return res.status(400).json({
        error: "Sensor reading is invalid/unstable. Reposition finger and try again.",
      });
    }

    if (vitals?.status !== "ok") {
      return res.status(400).json({
        error: "No valid live sensor vitals yet. Start esp32_reader and place finger on sensor.",
      });
    }

    if (!vitalsTs || now - vitalsTs > 10000) {
      return res.status(400).json({
        error: "Sensor data is stale. Keep finger on sensor and wait for a fresh live reading.",
      });
    }

    if (!vitals?.stable) {
      return res.status(400).json({
        error: "Collecting stable readings. Keep finger steady for a few more seconds.",
      });
    }

    let ai;
    try {
      const aiResponse = await axios.post(`http://localhost:6000/analyze/${userId}`, {}, { timeout: 30000 });
      ai = aiResponse.data || {};
    } catch (aiErr) {
      const msg = aiErr.response?.data?.error || aiErr.message;
      return res.status(502).json({ error: `AI service failed: ${msg}` });
    }

    if (!ai?.diagnosis || ai.diagnosis === "Sensor-Only") {
      return res.status(502).json({ error: "AI result is not available. Check python_service/app.py mode." });
    }

    const mergedResult = {
      userId,
      heartRate: Number(vitals.heartRate || 0),
      spo2: Number(vitals.spo2 || 0),
      bp: vitals.bp || "",
      diagnosis: ai.diagnosis,
      confidence: Number(ai.confidence || 0),
      audioPath: ai.audioPath || "",
      waveform: Array.isArray(ai.waveform) ? ai.waveform : [],
    };

    // Analysis now returns a live result only. Report persistence happens from sensor change snapshots.
    res.json(mergedResult);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Analysis failed. Check backend logs." });
  }
});

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});
