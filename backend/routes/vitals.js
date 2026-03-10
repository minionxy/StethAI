const router = require("express").Router();
const SensorVital = require("../models/SensorVital");

let latestVitals = {
  heartRate: 0,
  spo2: 0,
  bp: "",
  waveform: [],
  timestamp: null,
  status: "waiting",
  message: "Waiting for sensor data",
  stable: false,
  sampleCount: 0,
};

let vitalsHistory = [];
let hasHydratedFromDb = false;
let hrWindow = [];
let spo2Window = [];
let lastDbSaveAt = 0;
let lastSaved = { heartRate: 0, spo2: 0, bp: "" };
let nonOkStreak = 0;
let lastNonOkStatus = "";

const STABLE_WINDOW = Number(process.env.SENSOR_STABLE_WINDOW || 5);
const MIN_STABLE_SAMPLES = Number(process.env.SENSOR_MIN_STABLE_SAMPLES || 3);
const DB_SAVE_INTERVAL_MS = Number(process.env.SENSOR_DB_SAVE_INTERVAL_MS || 5000);
const LIVE_STALE_MS = Number(process.env.SENSOR_LIVE_STALE_MS || 7000);

function estimateBP(hr) {
  if (!Number.isFinite(hr) || hr <= 0) return "";
  const sys = 110 + Math.floor(hr / 2);
  const dia = 70 + Math.floor(hr / 4);
  return `${sys}/${dia}`;
}

function isValidVitals(heartRate, spo2) {
  return Number.isFinite(heartRate) &&
    Number.isFinite(spo2) &&
    heartRate >= 35 &&
    heartRate <= 230 &&
    spo2 >= 50 &&
    spo2 <= 100;
}

function average(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + Number(value || 0), 0);
  return sum / values.length;
}

function pushStableSamples(heartRate, spo2) {
  hrWindow.push(heartRate);
  spo2Window.push(spo2);

  while (hrWindow.length > STABLE_WINDOW) hrWindow.shift();
  while (spo2Window.length > STABLE_WINDOW) spo2Window.shift();
}

function clearStableSamples() {
  hrWindow = [];
  spo2Window = [];
}

function setLatestVitals(payload = {}) {
  const status = String(payload.status || "").trim().toLowerCase();
  const message = String(payload.message || "").trim();

  if (status && status !== "ok") {
    if (status === lastNonOkStatus) {
      nonOkStreak += 1;
    } else {
      lastNonOkStatus = status;
      nonOkStreak = 1;
    }

    const now = Date.now();
    const hadRecentOk = latestVitals.status === "ok" &&
      Number(latestVitals.timestamp || 0) > 0 &&
      now - Number(latestVitals.timestamp) < 2500;

    // Ignore brief status glitches between valid frames.
    if (hadRecentOk && nonOkStreak < 3) {
      latestVitals = {
        ...latestVitals,
        status: "waiting",
        message: "Signal stabilizing. Keep finger steady.",
        timestamp: now,
        stable: false,
        sampleCount: hrWindow.length,
      };
      return latestVitals;
    }

    clearStableSamples();
    latestVitals = {
      ...latestVitals,
      status,
      message: message || (status === "no_finger" ? "Place finger on sensor" : "Invalid/unstable reading"),
      timestamp: Date.now(),
      stable: false,
      sampleCount: 0,
    };
    return latestVitals;
  }

  const heartRate = Number(payload.heartRate);
  const spo2 = Number(payload.spo2);
  if (!isValidVitals(heartRate, spo2)) return null;
  nonOkStreak = 0;
  lastNonOkStatus = "";

  pushStableSamples(heartRate, spo2);

  const avgHeartRate = Number(average(hrWindow).toFixed(1));
  const avgSpo2 = Number(average(spo2Window).toFixed(1));
  const bp = payload.bp || estimateBP(avgHeartRate);
  const waveform = Array.isArray(payload.waveform) ? payload.waveform : [];
  const stable = hrWindow.length >= MIN_STABLE_SAMPLES;
  const sampleCount = hrWindow.length;

  latestVitals = {
    heartRate: avgHeartRate,
    spo2: avgSpo2,
    bp,
    waveform,
    timestamp: Date.now(),
    status: "ok",
    message: stable ? "Live data stable" : "Collecting stable reading...",
    stable,
    sampleCount,
  };

  vitalsHistory.push({
    heartRate: avgHeartRate,
    spo2: avgSpo2,
    timestamp: latestVitals.timestamp,
  });

  if (vitalsHistory.length > 100) {
    vitalsHistory.shift();
  }

  return latestVitals;
}

function getLatestVitals() {
  if (latestVitals.status === "ok" && latestVitals.timestamp) {
    const age = Date.now() - Number(latestVitals.timestamp);
    if (age > LIVE_STALE_MS) {
      return {
        ...latestVitals,
        status: "stale",
        message: "No recent sensor data",
        stable: false,
      };
    }
  }
  return latestVitals;
}

async function hydrateLatestFromDbIfNeeded() {
  if (hasHydratedFromDb) return;
  hasHydratedFromDb = true;

  const last = await SensorVital.findOne()
    .sort({ createdAt: -1 })
    .select("heartRate spo2 bp createdAt")
    .lean();

  if (last) {
    latestVitals = {
      heartRate: Number(last.heartRate || 0),
      spo2: Number(last.spo2 || 0),
      bp: last.bp || "",
      waveform: [],
      timestamp: last.createdAt ? new Date(last.createdAt).getTime() : Date.now(),
      status: "stale",
      message: "Waiting for fresh sensor data",
      stable: false,
      sampleCount: 0,
    };
  }
}

async function persistStableVitalsIfNeeded(updated) {
  if (!updated || updated.status !== "ok" || !updated.stable) {
    return false;
  }

  const now = Date.now();
  const due = now - lastDbSaveAt >= DB_SAVE_INTERVAL_MS;
  const hrDelta = Math.abs(Number(lastSaved.heartRate || 0) - Number(updated.heartRate || 0));
  const spo2Delta = Math.abs(Number(lastSaved.spo2 || 0) - Number(updated.spo2 || 0));
  const bpChanged = String(lastSaved.bp || "") !== String(updated.bp || "");
  const changed = hrDelta >= 1 || spo2Delta >= 1 || bpChanged;

  if (!due && !changed) {
    return false;
  }

  await SensorVital.create({
    heartRate: updated.heartRate,
    spo2: updated.spo2,
    bp: updated.bp,
    source: "esp32",
  });

  lastDbSaveAt = now;
  lastSaved = { heartRate: updated.heartRate, spo2: updated.spo2, bp: updated.bp };
  return true;
}

async function ingestLiveVitals(payload = {}) {
  const updated = setLatestVitals(payload);
  if (!updated) {
    return { updated: null, saved: false };
  }
  const saved = await persistStableVitalsIfNeeded(updated);
  return { updated: getLatestVitals(), saved };
}

router.post("/live", async (req, res) => {
  try {
    const result = await ingestLiveVitals(req.body);
    if (!result.updated) {
      return res.status(400).json({ error: "Invalid vitals payload" });
    }
    res.json({ success: true, vitals: result.updated, saved: result.saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/live", async (req, res) => {
  try {
    await hydrateLatestFromDbIfNeeded();
    res.json(getLatestVitals());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", async (req, res) => {
  try {
    const history = await SensorVital.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .select("heartRate spo2 bp createdAt");

    res.json(history.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, getLatestVitals, setLatestVitals, ingestLiveVitals };
