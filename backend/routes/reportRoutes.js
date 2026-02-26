const router = require("express").Router();
const Report = require("../models/Report");

// ===== save report from Python =====
router.post("/", async (req, res) => {
  try {
    const report = await Report.create(req.body);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== get reports by user =====
router.get("/user/:userId", async (req, res) => {
  const data = await Report.find({ userId: req.params.userId }).sort({ createdAt: -1 });
  res.json(data);
});

// ===== doctor: get all reports =====
router.get("/", async (req, res) => {
  const data = await Report.find().sort({ createdAt: -1 });
  res.json(data);
});

// ===== doctor: add treatment suggestion =====
router.patch("/:reportId/treatment", async (req, res) => {
  try {
    const { treatment, treatedBy } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      { treatment, treatedBy },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;