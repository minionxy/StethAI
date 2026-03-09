const mongoose = require("mongoose");

const SensorVitalSchema = new mongoose.Schema({
  heartRate: {
    type: Number,
    default: 0,
  },
  spo2: {
    type: Number,
    default: 0,
  },
  bp: {
    type: String,
    default: "",
  },
  source: {
    type: String,
    default: "esp32",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model("SensorVital", SensorVitalSchema);
