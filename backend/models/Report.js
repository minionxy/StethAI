const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema({
  userId: String,
  heartRate: Number,
  spo2: Number,
  bp: String,
  diagnosis: String,
  audioPath: String,
  treatment: { type: String, default: "" },
  treatedBy: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Report", ReportSchema);