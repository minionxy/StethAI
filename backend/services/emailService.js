let sgMail = null;

try {
  sgMail = require("@sendgrid/mail");
} catch (err) {
  sgMail = null;
}

const apiKey = process.env.SENDGRID_API_KEY;
if (sgMail && apiKey) {
  sgMail.setApiKey(apiKey);
}

const senderEmail = process.env.SENDGRID_FROM_EMAIL;

function logSkip(reason, email) {
  console.log(`[email] skipped: ${reason}${email ? ` (to: ${email})` : ""}`);
}

function logSent(kind, email) {
  console.log(`[email] sent: ${kind} (to: ${email})`);
}

function logFail(kind, email, err) {
  const msg = err?.response?.body?.errors?.map((e) => e.message).join("; ") || err?.message || "unknown";
  console.error(`[email] failed: ${kind} (to: ${email}) -> ${msg}`);
}

async function sendReportEmail(email, report) {
  if (!sgMail) {
    logSkip("package @sendgrid/mail not installed", email);
    return { sent: false, reason: "sendgrid_package_missing" };
  }
  if (!apiKey) {
    logSkip("SENDGRID_API_KEY missing", email);
    return { sent: false, reason: "sendgrid_api_key_missing" };
  }
  if (!senderEmail) {
    logSkip("SENDGRID_FROM_EMAIL missing", email);
    return { sent: false, reason: "sendgrid_from_email_missing" };
  }
  if (!email) {
    logSkip("recipient email missing");
    return { sent: false, reason: "recipient_email_missing" };
  }

  const msg = {
    to: email,
    from: senderEmail,
    subject: "Heart Health Report",
    html: `
      <h2>Heart Health Report</h2>
      <p>Heart Rate: ${report.heartRate ?? "N/A"}</p>
      <p>SpO2: ${report.spo2 ?? "N/A"}</p>
      <p>Diagnosis: ${report.diagnosis ?? "N/A"}</p>
      <h3>Medicines</h3>
      <p>${report.medicines || "N/A"}</p>
      <h3>Dosage</h3>
      <p>${report.dosage || "N/A"}</p>
      <h3>Advice</h3>
      <p>${report.advice || "N/A"}</p>
    `,
  };

  try {
    await sgMail.send(msg);
    logSent("report", email);
    return { sent: true };
  } catch (err) {
    logFail("report", email, err);
    return { sent: false, reason: "send_failed", error: err?.message || "unknown" };
  }
}

async function sendTreatmentEmail(email, { doctorName, patientName, report, treatmentPlan, treatmentSummary }) {
  if (!sgMail) {
    logSkip("package @sendgrid/mail not installed", email);
    return { sent: false, reason: "sendgrid_package_missing" };
  }
  if (!apiKey) {
    logSkip("SENDGRID_API_KEY missing", email);
    return { sent: false, reason: "sendgrid_api_key_missing" };
  }
  if (!senderEmail) {
    logSkip("SENDGRID_FROM_EMAIL missing", email);
    return { sent: false, reason: "sendgrid_from_email_missing" };
  }
  if (!email) {
    logSkip("recipient email missing");
    return { sent: false, reason: "recipient_email_missing" };
  }

  const faceToFace =
    typeof treatmentPlan?.faceToFaceRequired === "boolean"
      ? (treatmentPlan.faceToFaceRequired ? "Yes, visit doctor in person" : "No, remote follow-up is okay")
      : "Not specified";

  const msg = {
    to: email,
    from: senderEmail,
    subject: "Doctor Treatment Plan - StethAI",
    html: `
      <h2>Treatment Plan</h2>
      <p>Hello ${patientName || "Patient"},</p>
      <p>Dr. ${doctorName || "Doctor"} has added a treatment recommendation for your latest cardiac report.</p>

      <h3>Latest Vitals</h3>
      <p>Heart Rate: ${report?.heartRate ?? "N/A"} BPM</p>
      <p>SpO2: ${report?.spo2 ?? "N/A"}%</p>
      <p>Blood Pressure: ${report?.bp || "N/A"}</p>
      <p>Diagnosis: ${report?.diagnosis || "N/A"}</p>

      <h3>Detailed Treatment</h3>
      <p><strong>Medication/Tablets:</strong> ${treatmentPlan?.medication || "Not specified"}</p>
      <p><strong>Tablets per day:</strong> ${treatmentPlan?.tabletsPerDay || "Not specified"}</p>
      <p><strong>Duration (days):</strong> ${treatmentPlan?.durationDays || "Not specified"}</p>
      <p><strong>When to use:</strong> ${treatmentPlan?.timing || "Not specified"}</p>
      <p><strong>Face-to-face consult needed:</strong> ${faceToFace}</p>
      <p><strong>Additional notes:</strong> ${treatmentPlan?.notes || "Not specified"}</p>

      <h3>Summary</h3>
      <p style="white-space: pre-wrap;">${treatmentSummary || "Not specified"}</p>

      <p>Please consult your doctor immediately if symptoms worsen.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    logSent("treatment", email);
    return { sent: true };
  } catch (err) {
    logFail("treatment", email, err);
    return { sent: false, reason: "send_failed", error: err?.message || "unknown" };
  }
}

async function sendDoctorAlertEmail(email, { doctorName, patientName, patientEmail, report }) {
  if (!sgMail) {
    logSkip("package @sendgrid/mail not installed", email);
    return { sent: false, reason: "sendgrid_package_missing" };
  }
  if (!apiKey) {
    logSkip("SENDGRID_API_KEY missing", email);
    return { sent: false, reason: "sendgrid_api_key_missing" };
  }
  if (!senderEmail) {
    logSkip("SENDGRID_FROM_EMAIL missing", email);
    return { sent: false, reason: "sendgrid_from_email_missing" };
  }
  if (!email) {
    logSkip("recipient email missing");
    return { sent: false, reason: "recipient_email_missing" };
  }

  const msg = {
    to: email,
    from: senderEmail,
    subject: "New Patient Vitals Submitted - StethAI",
    html: `
      <h2>New Patient Vitals Submitted</h2>
      <p>Hello Dr. ${doctorName || "Doctor"},</p>
      <p>A patient has submitted fresh vitals for your review.</p>

      <h3>Patient Details</h3>
      <p>Name: ${patientName || "Unknown"}</p>
      <p>Email: ${patientEmail || "Unknown"}</p>

      <h3>Submitted Vitals</h3>
      <p>Heart Rate: ${report?.heartRate ?? "N/A"} BPM</p>
      <p>SpO2: ${report?.spo2 ?? "N/A"}%</p>
      <p>Blood Pressure: ${report?.bp || "N/A"}</p>
      <p>Diagnosis: ${report?.diagnosis || "Pending"}</p>

      <p>Please review this case in the doctor dashboard.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    logSent("doctor_alert", email);
    return { sent: true };
  } catch (err) {
    logFail("doctor_alert", email, err);
    return { sent: false, reason: "send_failed", error: err?.message || "unknown" };
  }
}

module.exports = {
  sendReportEmail,
  sendTreatmentEmail,
  sendDoctorAlertEmail,
};
