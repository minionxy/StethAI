const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const HR_MIN = Number(process.env.HR_MIN || 35);
const HR_MAX = Number(process.env.HR_MAX || 220);
const SPO2_MIN = Number(process.env.SPO2_MIN || 50);
const SPO2_MAX = Number(process.env.SPO2_MAX || 100);

const NO_FINGER_MARKERS = [
  "NO_FINGER",
  "place finger",
  "no finger detected",
  "finger not detected",
];

const INVALID_MARKERS = [
  "INVALID",
  "unstable",
];

function inRange(hr, spo2) {
  return Number.isFinite(hr) &&
    Number.isFinite(spo2) &&
    hr >= HR_MIN &&
    hr <= HR_MAX &&
    spo2 >= SPO2_MIN &&
    spo2 <= SPO2_MAX;
}

function parseDataLine(line = "") {
  const text = String(line || "").trim();
  if (!text) return null;

  const parts = text.split(",");
  if (parts.length === 3 && String(parts[0]).trim().toUpperCase() === "DATA") {
    const hr = Number(parts[1]);
    const spo2 = Number(parts[2]);
    if (Number.isFinite(hr) && Number.isFinite(spo2)) {
      return { heartRate: hr, spo2 };
    }
  }

  // Accept debug text from alternate sketches:
  // "HR: 78, SpO2: 97" or "Heart Rate=78 SpO2=97"
  const hrMatch = text.match(/(?:HR|Heart\s*Rate)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i);
  const spo2Match = text.match(/(?:SpO2|SPO2)\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (hrMatch && spo2Match) {
    return { heartRate: Number(hrMatch[1]), spo2: Number(spo2Match[1]) };
  }

  if (parts.length === 2) {
    const hr = Number(parts[0]);
    const spo2 = Number(parts[1]);
    if (Number.isFinite(hr) && Number.isFinite(spo2)) {
      return { heartRate: hr, spo2 };
    }
  }

  return null;
}

function startSerialReader(options = {}) {
  const portPath = String(options.portPath || process.env.ESP32_PORT || process.env.SERIAL_PORT || "COM4");
  const baudRate = Number(options.baudRate || process.env.ESP32_BAUD || process.env.SERIAL_BAUD || 115200);
  const reconnectMs = Number(options.reconnectMs || process.env.SERIAL_RECONNECT_MS || 2000);
  const onPayload = typeof options.onPayload === "function" ? options.onPayload : null;
  const debug = String(process.env.SERIAL_DEBUG || "false").toLowerCase() === "true";

  let port = null;

  const emit = async (payload) => {
    if (!onPayload) return;
    try {
      await onPayload(payload);
    } catch (err) {
      console.error("Serial payload handler error:", err.message);
    }
  };

  const connect = () => {
    try {
      port = new SerialPort({ path: portPath, baudRate, autoOpen: true });
    } catch (err) {
      console.error(`Serial init failed on ${portPath}: ${err.message}`);
      emit({ status: "port_busy", message: `Serial port ${portPath} unavailable. Close Serial Monitor.` });
      setTimeout(connect, reconnectMs);
      return;
    }

    console.log(`Serial reader connecting on ${portPath} @ ${baudRate}`);
    const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

    parser.on("data", async (line) => {
      const text = String(line || "").trim();
      if (!text) return;
      if (debug) console.log(`[SERIAL] ${text}`);

      const lower = text.toLowerCase();
      if (NO_FINGER_MARKERS.some((mark) => lower.includes(String(mark).toLowerCase()))) {
        await emit({ status: "no_finger", message: "Place finger on sensor" });
        return;
      }

      if (INVALID_MARKERS.some((mark) => lower.includes(String(mark).toLowerCase()))) {
        await emit({ status: "invalid", message: "Invalid/unstable reading" });
        return;
      }

      const parsed = parseDataLine(text);
      if (!parsed) return;

      if (!inRange(parsed.heartRate, parsed.spo2)) {
        await emit({ status: "invalid", message: "Reading out of range" });
        return;
      }

      await emit({
        heartRate: Number(parsed.heartRate),
        spo2: Number(parsed.spo2),
        status: "ok",
        message: "Live data",
        timestamp: Date.now(),
      });
    });

    port.on("open", () => {
      console.log(`Serial reader connected on ${portPath}`);
    });

    port.on("error", (err) => {
      console.error(`Serial error on ${portPath}: ${err.message}`);
      if (/Access is denied|busy|cannot open/i.test(String(err.message || ""))) {
        emit({ status: "port_busy", message: `Serial port ${portPath} is busy. Close Arduino Serial Monitor.` });
      }
    });

    port.on("close", () => {
      console.warn(`Serial port closed (${portPath}). Reconnecting in ${reconnectMs}ms...`);
      setTimeout(connect, reconnectMs);
    });
  };

  connect();

  return {
    close: () => {
      if (port && port.isOpen) {
        port.close();
      }
    },
  };
}

module.exports = { startSerialReader, parseDataLine };
