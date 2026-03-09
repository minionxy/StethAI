import { useEffect, useRef, useState } from "react";
import API from "../../api/axios";
import Sidebar from "../../components/Sidebar";
import {
  Chart as ChartJS, LineElement, PointElement,
  LinearScale, CategoryScale, Filler, Tooltip, Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

function HeartRing({ bpm }) {
  const value = Number(bpm || 0);
  const size = 140;
  const r = 56;
  const circ = 2 * Math.PI * r;
  const max = 200;
  const fill = Math.min(value / max, 1) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#bpmGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ}`}
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
        <defs>
          <linearGradient id="bpmGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00c6ff" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "26px", fontWeight: 800, lineHeight: 1, color: "var(--text-primary)" }}>{value}</div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>BPM</div>
      </div>
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "24px",
        right: "24px",
        zIndex: 9999,
        padding: "16px 22px",
        background: type === "error" ? "rgba(239,68,68,0.95)" : "rgba(16,185,129,0.95)",
        backdropFilter: "blur(12px)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
        animation: "slideIn 0.3s ease",
        maxWidth: "380px",
      }}
    >
      <span style={{ fontSize: "22px" }}>{type === "error" ? "Alert" : "OK"}</span>
      <div>
        <div style={{ fontWeight: 700, color: "#fff", marginBottom: "2px" }}>
          {type === "error" ? "Abnormal Result Detected" : "Analysis Complete"}
        </div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)" }}>{msg}</div>
      </div>
      <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "18px", padding: "0 0 0 8px" }}>
        x
      </button>
    </div>
  );
}

export default function PatientDashboard() {
  const [data, setData] = useState(null);
  const [liveVitals, setLiveVitals] = useState({
    heartRate: 0,
    spo2: 0,
    bp: "",
    timestamp: null,
    status: "waiting",
    message: "Waiting for sensor data",
    stable: false,
    sampleCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [monitoring, setMonitoring] = useState({ vitals: false });
  const [submitting, setSubmitting] = useState(false);
  const [manualVitals, setManualVitals] = useState({ heartRate: null, spo2: null, bp: "" });
  const [manualReady, setManualReady] = useState({ vitals: false, bp: false });
  const [submitInfo, setSubmitInfo] = useState(null);
  const [monitorNote, setMonitorNote] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const user = JSON.parse(localStorage.getItem("user"));
  const vitalsBufferRef = useRef([]);
  const latestLiveRef = useRef(liveVitals);
  const lastPushedTsRef = useRef(0);
  const liveTs = Number(liveVitals.timestamp || 0);
  const vitalsFresh = Boolean(liveTs) && Date.now() - liveTs <= 7000;
  const sensorReady = liveVitals.status === "ok" && Boolean(liveVitals.stable) && vitalsFresh;
  const canSubmitManual = manualReady.vitals && manualReady.bp && Boolean(user?._id);
  const liveAgeSec = liveTs ? Math.max(0, Math.floor((Date.now() - liveTs) / 1000)) : null;
  const liveTimeText = liveTs ? new Date(liveTs).toLocaleTimeString() : "--";
  const debugRows = [
    ["raw status", String(liveVitals.status || "unknown")],
    ["raw message", String(liveVitals.message || "") || "--"],
    ["stable", String(Boolean(liveVitals.stable))],
    ["sampleCount", String(liveVitals.sampleCount ?? 0)],
    ["last update", liveTimeText],
    ["age (sec)", liveAgeSec === null ? "--" : String(liveAgeSec)],
    ["raw heartRate", String(liveVitals.heartRate ?? 0)],
    ["raw spo2", String(liveVitals.spo2 ?? 0)],
    ["raw bp", String(liveVitals.bp || "--")],
    ["buffered samples", String(vitalsBufferRef.current.length)],
  ];

  const statusMessage = (() => {
    if (liveVitals.status === "no_finger") return "Place finger on sensor";
    if (liveVitals.status === "invalid") return "Invalid/unstable reading";
    if (liveVitals.status === "stale") return "Sensor disconnected or stale data";
    if (liveVitals.status === "ok" && !liveVitals.stable) return "Analyzing signal quality...";
    if (sensorReady) return "Live and stable";
    return liveVitals.message || "Waiting for sensor data";
  })();

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const estimateBP = (hrValue) => {
    const hr = Number(hrValue || 0);
    if (!Number.isFinite(hr) || hr <= 0) return "";
    const sys = 110 + Math.floor(hr / 2);
    const dia = 70 + Math.floor(hr / 4);
    return `${sys}/${dia}`;
  };

  const averageFromBuffer = (key) => {
    const samples = vitalsBufferRef.current;
    if (!samples.length) return 0;
    const sum = samples.reduce((acc, row) => acc + Number(row[key] || 0), 0);
    return Number((sum / samples.length).toFixed(1));
  };

  const collectStableVitals = async () => {
    const startedAt = Date.now();
    const timeoutMs = 30000;
    const minSamples = 6;
    const maxHrSpread = 4;
    const maxSpo2Spread = 2;

    while (Date.now() - startedAt < timeoutMs) {
      const live = latestLiveRef.current || {};
      if (live.status === "no_finger") {
        setMonitorNote("No finger detected. Waiting for valid sensor contact...");
      } else if (live.status === "invalid" || live.status === "stale" || live.status === "waiting") {
        setMonitorNote("Waiting for valid HR/SpO2 samples from sensor...");
      } else {
        setMonitorNote("Collecting stable HR/SpO2 samples...");
      }

      const samples = vitalsBufferRef.current
        .filter((row) => Number(row.timestamp || 0) >= startedAt)
        .filter((row) => {
          const hr = Number(row.heartRate || 0);
          const spo2 = Number(row.spo2 || 0);
          return Number.isFinite(hr) && Number.isFinite(spo2) && hr >= 40 && hr <= 190 && spo2 >= 80 && spo2 <= 100;
        });

      if (samples.length >= minSamples) {
        const hrValues = samples.map((row) => Number(row.heartRate || 0));
        const spo2Values = samples.map((row) => Number(row.spo2 || 0));
        const hrSpread = Math.max(...hrValues) - Math.min(...hrValues);
        const spo2Spread = Math.max(...spo2Values) - Math.min(...spo2Values);

        if (hrSpread <= maxHrSpread && spo2Spread <= maxSpo2Spread) {
          const avgHr = Number((hrValues.reduce((acc, value) => acc + value, 0) / hrValues.length).toFixed(1));
          const avgSpo2 = Number((spo2Values.reduce((acc, value) => acc + value, 0) / spo2Values.length).toFixed(1));
          setMonitorNote("Stable HR and SpO2 captured from sensor.");
          return { heartRate: avgHr, spo2: avgSpo2 };
        }
      }

      await sleep(500);
    }

    throw new Error("Timed out waiting for stable HR/SpO2 readings. Keep finger steady and retry.");
  };

  useEffect(() => {
    latestLiveRef.current = liveVitals;
  }, [liveVitals]);

  useEffect(() => {
    let stopped = false;

    const fetchVitals = async () => {
      try {
        const res = await API.get("/vitals/live");
        if (!stopped && res.data) {
          setLiveVitals(res.data);
          if (res.data.status === "ok" && res.data.stable) {
            const ts = Number(res.data.timestamp || Date.now());
            if (ts <= lastPushedTsRef.current) return;
            lastPushedTsRef.current = ts;
            const next = {
              heartRate: Number(res.data.heartRate || 0),
              spo2: Number(res.data.spo2 || 0),
              bp: String(res.data.bp || ""),
              timestamp: ts,
              status: "ok",
            };
            const buf = vitalsBufferRef.current;
            buf.push(next);
            while (buf.length > 20) buf.shift();
          }
        }
      } catch (err) {
        if (!stopped) {
          setLiveVitals((prev) => ({
            ...prev,
            status: "stale",
            message: "Unable to reach live sensor feed",
            stable: false,
          }));
        }
      }
    };

    fetchVitals();
    const id = setInterval(fetchVitals, 1000);

    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  const startVitalsMonitoring = async () => {
    setError("");
    setMonitorNote("");

    setMonitoring({ vitals: true });
    try {
      const stableVitals = await collectStableVitals();
      setManualVitals((prev) => ({
        ...prev,
        heartRate: stableVitals.heartRate,
        spo2: stableVitals.spo2,
      }));
      setManualReady((prev) => ({ ...prev, vitals: true }));
    } catch (err) {
      setError(err.message || "Unable to capture valid HR/SpO2 readings.");
    } finally {
      setMonitoring({ vitals: false });
    }
  };

  const calculateBP = () => {
    setError("");
    const currentHr = Number(manualVitals.heartRate || averageFromBuffer("heartRate") || liveVitals.heartRate || 0);
    if (!Number.isFinite(currentHr) || currentHr <= 0) {
      setError("Capture HR/SpO2 first, then calculate BP.");
      return;
    }
    const bp = String(liveVitals.bp || "").trim() || estimateBP(currentHr);
    if (!bp) {
      setError("Unable to calculate BP right now.");
      return;
    }
    setManualVitals((prev) => ({ ...prev, bp }));
    setManualReady((prev) => ({ ...prev, bp: true }));
  };

  const submitManualReport = async () => {
    if (!canSubmitManual) return;
    setSubmitting(true);
    setError("");
    setSubmitInfo(null);

    try {
      const payload = {
        userId: user._id,
        heartRate: Number(manualVitals.heartRate),
        spo2: Number(manualVitals.spo2),
        bp: String(manualVitals.bp || ""),
      };
      const res = await API.post("/reports/manual-submit", payload);
      setSubmitInfo(res.data?.doctorNotification || null);
      setToast({
        type: "ok",
        msg: `Report submitted. Notified ${res.data?.doctorNotification?.sent || 0} doctor(s).`,
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit report to doctor.");
    } finally {
      setSubmitting(false);
    }
  };

  const start = async () => {
    const startedAt = Date.now();
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await API.post(`/analyze/${user._id}`);
      setData(res.data);
      if (res.data.diagnosis === "Abnormal") {
        setToast({ msg: `Heart rate ${res.data.heartRate} BPM. Please consult a doctor.`, type: "error" });
      } else {
        setToast({ msg: `Heart rate ${res.data.heartRate} BPM. Everything looks good.`, type: "ok" });
      }
      setTimeout(() => setToast(null), 6000);
    } catch (err) {
      setError(err.response?.data?.error || "Analysis failed. Make sure Python service and ESP32 feed are running.");
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) {
        await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));
      }
      setLoading(false);
    }
  };

  const shown = data || {
    heartRate: Number(liveVitals.heartRate || 0),
    spo2: Number(liveVitals.spo2 || 0),
    bp: String(liveVitals.bp || ""),
  };
  const chartData = data
    ? {
        labels: data.waveform.map((_, i) => i),
        datasets: [
          {
            label: "PCG Waveform",
            data: data.waveform,
            borderColor: "#00c6ff",
            backgroundColor: "rgba(0,198,255,0.07)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.4,
            fill: true,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    animation: { duration: 800 },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#64748b", font: { size: 11 } } },
    },
  };

  return (
    <div className="app-layout">
      <Sidebar />
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Live Heart Monitor</h1>
          <p className="page-subtitle">ESP32 vitals stream plus AI heart sound analysis</p>
        </div>

        <div style={{ marginBottom: "12px", color: "var(--text-muted)", fontSize: "13px" }}>
          Live sensor status: {statusMessage}
        </div>

        <div className="card" style={{ marginBottom: "18px", padding: "12px 14px" }}>
          <div style={{ fontWeight: 700, marginBottom: "8px", fontSize: "13px" }}>Sensor Debug (Raw)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(160px, 1fr))", gap: "6px 12px" }}>
            {debugRows.map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "8px", borderBottom: "1px dashed rgba(255,255,255,0.06)", paddingBottom: "3px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{k}</span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "monospace", textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginBottom: "18px" }}>
          <div style={{ fontWeight: 700, marginBottom: "10px" }}>Step-by-Step Vitals Capture</div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
            1) Start HR + SpO2 monitoring 2) Calculate BP 3) Submit report to doctor
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
            <button className="btn btn-primary" onClick={startVitalsMonitoring} disabled={monitoring.vitals || submitting}>
              {monitoring.vitals ? "Monitoring HR + SpO2..." : "Start HR + SpO2 Monitoring"}
            </button>
            <button className="btn btn-primary" onClick={calculateBP} disabled={!manualReady.vitals || monitoring.vitals || submitting}>
              Calculate BP
            </button>
            {canSubmitManual && (
              <button className="btn btn-danger" onClick={submitManualReport} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            )}
          </div>

          {monitorNote && (
            <div style={{ marginBottom: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
              {monitorNote}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(140px, 1fr))", gap: "10px" }}>
            <div style={{ padding: "10px", border: "1px solid var(--border-color)", borderRadius: "10px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Heart Rate</div>
              <div style={{ fontWeight: 700 }}>{manualReady.vitals ? `${manualVitals.heartRate} BPM` : "Not captured"}</div>
            </div>
            <div style={{ padding: "10px", border: "1px solid var(--border-color)", borderRadius: "10px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>SpO2</div>
              <div style={{ fontWeight: 700 }}>{manualReady.vitals ? `${manualVitals.spo2}%` : "Not captured"}</div>
            </div>
            <div style={{ padding: "10px", border: "1px solid var(--border-color)", borderRadius: "10px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Blood Pressure</div>
              <div style={{ fontWeight: 700 }}>{manualReady.bp ? `${manualVitals.bp} mmHg` : "Not calculated"}</div>
            </div>
          </div>

          {submitInfo && (
            <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
              Doctor notification: sent {submitInfo.sent || 0}, failed {submitInfo.failed || 0}, skipped {submitInfo.skipped || 0}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "28px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <button id="start-analysis-btn" className="btn btn-danger btn-lg" onClick={start} disabled={loading || !sensorReady}>
            {loading ? (
              <>
                <div className="spinner" />
                Analysing...
              </>
            ) : (
              <>Start Analysis</>
            )}
          </button>
          {data && <div className="analysis-status analysis-status-done">Analysis complete</div>}
          {loading && <div className="analysis-status analysis-status-loading">Processing phonocardiogram...</div>}
        </div>

        {error && <div className="form-error" style={{ marginBottom: "24px" }}>{error}</div>}
        {!sensorReady && (
          <div className="form-error" style={{ marginBottom: "24px" }}>
            {statusMessage}. Close Arduino Serial Monitor, run `esp32_reader.py`, then keep finger still for 3-5 seconds.
          </div>
        )}

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "28px", alignItems: "stretch" }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", minWidth: "180px", flex: "0 0 auto" }}>
            <HeartRing bpm={shown.heartRate} />
            <div style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 600 }}>Heart Rate</div>
          </div>

          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <div className="metric-card">
              <div className="metric-icon">SpO2</div>
              <div className="metric-label">Oxygen Saturation</div>
              <div>
                <span className="metric-value">{shown.spo2 || "--"}</span> <span className="metric-unit">%</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">BP</div>
              <div className="metric-label">Blood Pressure</div>
              <div>
                <span className="metric-value" style={{ fontSize: "22px" }}>{shown.bp || "--"}</span> <span className="metric-unit">mmHg</span>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">AI</div>
              <div className="metric-label">AI Diagnosis</div>
              <div style={{ marginTop: "8px" }}>
                {data ? (
                  <span className={`badge ${data.diagnosis === "Normal" ? "badge-normal" : "badge-abnormal"}`} style={{ fontSize: "14px", padding: "6px 14px" }}>
                    {data.diagnosis}
                  </span>
                ) : (
                  <span className="badge" style={{ fontSize: "14px", padding: "6px 14px" }}>
                    Not analyzed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {data && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "2px" }}>Phonocardiogram Waveform</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>PCG signal from recorded audio</div>
              </div>
              <span className={`badge ${data.diagnosis === "Normal" ? "badge-normal" : "badge-abnormal"}`}>{data.diagnosis}</span>
            </div>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        {!data && !loading && (
          <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            Run analysis to add AI diagnosis. Live vitals already update from ESP32.
          </div>
        )}
      </div>

      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}
