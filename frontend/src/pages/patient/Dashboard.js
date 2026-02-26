import { useState } from "react";
import API from "../../api/axios";
import Sidebar from "../../components/Sidebar";
import {
  Chart as ChartJS,
  LineElement, PointElement,
  LinearScale, CategoryScale,
  Filler, Tooltip, Legend
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend);

export default function PatientDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));

  const start = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.post(`/analyze/${user._id}`);
      setData(res.data);
    } catch (err) {
      setError("Analysis failed. Make sure the Python service is running.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = data ? {
    labels: data.waveform.map((_, i) => i),
    datasets: [{
      label: "Heart Waveform",
      data: data.waveform,
      borderColor: "#00c6ff",
      backgroundColor: "rgba(0, 198, 255, 0.08)",
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#64748b", font: { size: 11 } }
      }
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Live Heart Monitor</h1>
          <p className="page-subtitle">Record and analyse your heart sound in real time</p>
        </div>

        {/* Action button */}
        <div style={{ marginBottom: "28px", display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            id="start-analysis-btn"
            className="btn btn-danger btn-lg"
            onClick={start}
            disabled={loading}
          >
            {loading
              ? <><div className="spinner" /> Analysing…</>
              : <><span className="pulse-dot" style={{ width: 10, height: 10, background: '#fff', borderRadius: '50%', display: 'inline-block' }} /> Start Analysis</>
            }
          </button>
          {data && (
            <div className="analysis-status analysis-status-done">
              ✓ Analysis complete
            </div>
          )}
          {loading && (
            <div className="analysis-status analysis-status-loading">
              Processing phonocardiogram…
            </div>
          )}
        </div>

        {error && <div className="form-error" style={{ marginBottom: "24px" }}>⚠️ {error}</div>}

        {/* Metrics */}
        <div className="grid-4" style={{ marginBottom: "28px" }}>
          <div className="metric-card">
            <div className="metric-icon">❤️</div>
            <div className="metric-label">Heart Rate</div>
            <div>
              <span className="metric-value">{data ? data.heartRate : "--"}</span>
              {" "}<span className="metric-unit">BPM</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🩸</div>
            <div className="metric-label">SpO₂</div>
            <div>
              <span className="metric-value">{data ? data.spo2 : "--"}</span>
              {" "}<span className="metric-unit">%</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">💊</div>
            <div className="metric-label">Blood Pressure</div>
            <div>
              <span className="metric-value" style={{ fontSize: "22px" }}>{data ? data.bp : "--"}</span>
              {" "}<span className="metric-unit">mmHg</span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">🔬</div>
            <div className="metric-label">AI Diagnosis</div>
            <div style={{ marginTop: "8px" }}>
              {data
                ? <span className={`badge ${data.diagnosis === "Normal" ? "badge-normal" : "badge-abnormal"}`} style={{ fontSize: "14px", padding: "6px 14px" }}>
                  {data.diagnosis === "Normal" ? "✓ " : "⚠ "}{data.diagnosis}
                </span>
                : <span style={{ color: "var(--text-muted)" }}>—</span>
              }
            </div>
          </div>
        </div>

        {/* Waveform chart */}
        {data && (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: "2px" }}>Phonocardiogram Waveform</div>
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>PCG signal from recorded audio</div>
              </div>
              <span className={`badge ${data.diagnosis === "Normal" ? "badge-normal" : "badge-abnormal"}`}>
                {data.diagnosis}
              </span>
            </div>
            <Line data={chartData} options={chartOptions} />
          </div>
        )}

        {!data && !loading && (
          <div className="card" style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎙️</div>
            <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px", color: "var(--text-secondary)" }}>
              Ready to analyse
            </div>
            <div style={{ fontSize: "14px" }}>Press "Start Analysis" to record and classify your heart sounds</div>
          </div>
        )}
      </div>
    </div>
  );
}