const router = require("express").Router();
const Report = require("../models/Report");
const User = require("../models/User");
const { sendReportEmail } = require("../services/emailService");

router.post("/doctor-report", async (req, res) => {

  const report = await Report.create(req.body);

  const user = await User.findById(req.body.patientId);

  await sendReportEmail(user.email, report);

  res.json(report);
});

module.exports = router;
