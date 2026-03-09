const router = require("express").Router();
const Report = require("../models/Report");
const SensorVital = require("../models/SensorVital");
const User = require("../models/User");
const { sendTreatmentEmail, sendDoctorAlertEmail } = require("../services/emailService");
const { getLatestVitals } = require("./vitals");

function estimateBP(hr) {
  if (!Number.isFinite(hr) || hr <= 0) return "";
  const sys = 110 + Math.floor(hr / 2);
  const dia = 70 + Math.floor(hr / 4);
  return `${sys}/${dia}`;
}

// ===== save report from Python =====
router.post("/", async (req, res) => {
  try {
    const report = await Report.create(req.body);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== save changed live vitals as patient report =====
router.post("/sensor-snapshot", async (req, res) => {
  try {
    const userId = req.body.userId;
    const heartRate = Number(req.body.heartRate);
    const spo2 = Number(req.body.spo2);
    const bp = req.body.bp || estimateBP(heartRate);

    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (!Number.isFinite(heartRate) || !Number.isFinite(spo2)) {
      return res.status(400).json({ error: "Invalid vitals" });
    }
    if (heartRate < 40 || heartRate > 190 || spo2 < 80 || spo2 > 100) {
      return res.status(400).json({ error: "Vitals out of range" });
    }

    const last = await Report.findOne({ userId, source: "sensor" }).sort({ createdAt: -1 });
    const now = Date.now();

    if (last) {
      const dt = now - new Date(last.createdAt).getTime();
      const hrDelta = Math.abs(Number(last.heartRate || 0) - heartRate);
      const spo2Delta = Math.abs(Number(last.spo2 || 0) - spo2);
      const bpSame = (last.bp || "") === (bp || "");

      // Skip near-duplicate snapshots to avoid flooding reports.
      if (dt < 120000 && hrDelta < 2 && spo2Delta < 1 && bpSame) {
        return res.json({ saved: false, report: last });
      }
    }

    const report = await Report.create({
      userId,
      heartRate,
      spo2,
      bp,
      diagnosis: "Live-Sensor",
      confidence: 0,
      waveform: [],
      audioPath: "",
      source: "sensor",
      capturedAt: new Date(now),
    });

    return res.json({ saved: true, report });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ===== patient: submit manually measured vitals and notify doctor(s) =====
router.post("/manual-submit", async (req, res) => {
  try {
    const userId = req.body.userId;
    const heartRate = Number(req.body.heartRate);
    const spo2 = Number(req.body.spo2);
    const bp = String(req.body.bp || estimateBP(heartRate)).trim();

    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (!Number.isFinite(heartRate) || !Number.isFinite(spo2)) {
      return res.status(400).json({ error: "Invalid vitals" });
    }
    if (heartRate < 40 || heartRate > 190 || spo2 < 80 || spo2 > 100) {
      return res.status(400).json({ error: "Vitals out of range" });
    }

    const report = await Report.create({
      userId,
      heartRate,
      spo2,
      bp,
      diagnosis: "Pending Doctor Review",
      confidence: 0,
      waveform: [],
      audioPath: "",
      source: "sensor",
      capturedAt: new Date(),
      status: "Pending",
    });

    const patient = await User.findById(userId).select("name email").lean();
    const doctors = await User.find({ role: "doctor" }).select("name email").lean();

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const doctor of doctors) {
      const emailResult = await sendDoctorAlertEmail(doctor.email, {
        doctorName: doctor.name,
        patientName: patient?.name || "Patient",
        patientEmail: patient?.email || "",
        report,
      });

      if (emailResult?.sent) {
        sent += 1;
      } else if (String(emailResult?.reason || "").includes("missing")) {
        skipped += 1;
      } else {
        failed += 1;
      }
    }

    return res.json({
      saved: true,
      report,
      doctorNotification: {
        totalDoctors: doctors.length,
        sent,
        failed,
        skipped,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ===== get reports by user =====
router.get("/user/:userId", async (req, res) => {
  const data = await Report.find({ userId: req.params.userId }).sort({ createdAt: -1 });
  res.json(data);
});

// ===== doctor: dashboard stats =====
router.get("/stats", async (req, res) => {
  try {
    const aiFilter = { source: { $ne: "sensor" } };
    const total = await Report.countDocuments(aiFilter);
    const sensorReports = await Report.countDocuments({ source: "sensor" });
    const normal = await Report.countDocuments({ ...aiFilter, diagnosis: "Normal" });
    const abnormal = await Report.countDocuments({ ...aiFilter, diagnosis: "Abnormal" });
    const treated = await Report.countDocuments({ ...aiFilter, treatment: { $ne: "" } });
    const pending = abnormal - await Report.countDocuments({ ...aiFilter, diagnosis: "Abnormal", treatment: { $ne: "" } });

    const avgHR = await Report.aggregate([{ $match: aiFilter }, { $group: { _id: null, avg: { $avg: "$heartRate" } } }]);
    const avgSpO2 = await Report.aggregate([{ $match: aiFilter }, { $group: { _id: null, avg: { $avg: "$spo2" } } }]);

    const latestSensor = await SensorVital.findOne().sort({ createdAt: -1 }).lean();
    const live = getLatestVitals();
    const liveStatus = String(live?.status || "waiting");
    const liveIsOk = liveStatus === "ok";

    // Short-term sensor average over last 50 readings for smoother doctor view.
    const sensorWindow = await SensorVital.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("heartRate spo2")
      .lean();

    const sensorAvgHR = sensorWindow.length
      ? Math.round(sensorWindow.reduce((sum, row) => sum + (Number(row.heartRate) || 0), 0) / sensorWindow.length)
      : 0;

    const sensorAvgSpO2 = sensorWindow.length
      ? Math.round(sensorWindow.reduce((sum, row) => sum + (Number(row.spo2) || 0), 0) / sensorWindow.length)
      : 0;

    res.json({
      total,
      sensorReports,
      normal,
      abnormal,
      treated,
      pending: Math.max(0, pending),
      avgHR: avgHR[0] ? Math.round(avgHR[0].avg) : 0,
      avgSpO2: avgSpO2[0] ? Math.round(avgSpO2[0].avg) : 0,
      liveHeartRate: liveIsOk ? Number(live.heartRate || 0) : 0,
      liveSpO2: liveIsOk ? Number(live.spo2 || 0) : 0,
      liveBP: liveIsOk ? (live.bp || "") : "",
      liveAt: live?.timestamp ? new Date(Number(live.timestamp)).toISOString() : (latestSensor?.createdAt || null),
      liveStatus,
      liveMessage: String(live?.message || ""),
      sensorAvgHR,
      sensorAvgSpO2,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== doctor: get all reports (with optional filter) =====
router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.diagnosis) filter.diagnosis = req.query.diagnosis;
  if (req.query.treated === "false") {
    filter.treatment = "";
    filter.source = { $ne: "sensor" };
  }
  if (req.query.source) filter.source = req.query.source;
  const data = await Report.find(filter)
    .populate("userId", "name email")
    .sort({ createdAt: -1 });
  res.json(data);
});

// ===== doctor: add treatment suggestion =====
router.patch("/:reportId/treatment", async (req, res) => {
  try {
    const {
      treatment,
      treatedBy,
      medication,
      tabletsPerDay,
      durationDays,
      timing,
      faceToFaceRequired,
      notes,
    } = req.body;

    const plan = {
      medication: String(medication || "").trim(),
      tabletsPerDay: String(tabletsPerDay || "").trim(),
      durationDays: Number(durationDays || 0),
      timing: String(timing || "").trim(),
      faceToFaceRequired: Boolean(faceToFaceRequired),
      notes: String(notes || "").trim(),
    };

    const summaryParts = [
      plan.medication ? `Medication/Tablets: ${plan.medication}` : "",
      plan.tabletsPerDay ? `Tablets per day: ${plan.tabletsPerDay}` : "",
      plan.durationDays > 0 ? `Duration: ${plan.durationDays} day(s)` : "",
      plan.timing ? `When to use: ${plan.timing}` : "",
      `Face-to-face consult needed: ${plan.faceToFaceRequired ? "Yes" : "No"}`,
      plan.notes ? `Additional notes: ${plan.notes}` : "",
      treatment ? `Doctor summary: ${String(treatment).trim()}` : "",
    ].filter(Boolean);

    const treatmentSummary = summaryParts.join("\n");

    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      {
        treatment: treatmentSummary,
        treatedBy: String(treatedBy || "").trim(),
        treatmentPlan: plan,
      },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: "Report not found" });

    const patient = await User.findById(report.userId).select("name email").lean();
    let emailResult = { sent: false, reason: "patient_email_missing" };

    if (patient?.email) {
      emailResult = await sendTreatmentEmail(patient.email, {
        doctorName: String(treatedBy || "").trim() || "Doctor",
        patientName: patient.name,
        report,
        treatmentPlan: plan,
        treatmentSummary,
      });
    } else {
      console.error("Treatment email skipped: patient email missing for user", String(report.userId));
    }

    res.json({
      ...report.toObject(),
      email: emailResult,
      patientEmail: patient?.email || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
