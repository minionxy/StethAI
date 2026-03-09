const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  // 👤 patient reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // ❤️ vital signs
  heartRate: Number,
  spo2: Number,
  bp: String,

  // 🧠 AI prediction
  diagnosis: String,
  confidence: Number,
  source: {
    type: String,
    enum: ["ai", "sensor"],
    default: "ai"
  },
  capturedAt: {
    type: Date,
    default: Date.now
  },

  // 📈 waveform data (for graphs)
  waveform: {
    type: [Number],
    default: []
  },

  // 🎙 recorded heart sound
  audioPath: String,

  // =========================
  // 👨‍⚕️ DOCTOR REPORT SECTION
  // =========================

  doctorName: {
    type: String,
    default: ""
  },

  medicines: {
    type: String,
    default: ""
  },

  dosage: {
    type: String,
    default: ""
  },

  advice: {
    type: String,
    default: ""
  },

  treatment: {
    type: String,
    default: ""
  },

  treatedBy: {
    type: String,
    default: ""
  },

  treatmentPlan: {
    medication: { type: String, default: "" },
    tabletsPerDay: { type: String, default: "" },
    durationDays: { type: Number, default: 0 },
    timing: { type: String, default: "" },
    faceToFaceRequired: { type: Boolean, default: false },
    notes: { type: String, default: "" }
  },

  // doctor response message
  doctorReply: {
    type: String,
    default: ""
  },

  // ⭐ report status
  status: {
    type: String,
    enum: ["Pending", "Reviewed"],
    default: "Pending"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Report", ReportSchema);
