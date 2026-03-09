import { useEffect, useState } from "react";
import API from "../../api/axios";
import Sidebar from "../../components/Sidebar";

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

export default function PatientHistory() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    API.get(`/reports/user/${user._id}`)
      .then(res => setReports(res.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // Summary stats
  const total = reports.length;
  const abnormal = reports.filter(r => r.diagnosis === "Abnormal").length;
  const treated = reports.filter(r => r.treatment).length;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">My Reports</h1>
          <p className="page-subtitle">Your cardiac monitoring history and doctor recommendations</p>
        </div>

        {/* Mini stats */}
        {!loading && total > 0 && (
          <div className="grid-4" style={{ marginBottom: "24px" }}>
            <div className="metric-card">
              <div className="metric-icon">📋</div>
              <div className="metric-label">Total Scans</div>
              <div><span className="metric-value">{total}</span></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">✅</div>
              <div className="metric-label">Normal</div>
              <div><span className="metric-value" style={{ backgroundImage: "linear-gradient(135deg,#10b981,#059669)" }}>{total - abnormal}</span></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">⚠️</div>
              <div className="metric-label">Abnormal</div>
              <div><span className="metric-value" style={{ backgroundImage: "linear-gradient(135deg,#ef4444,#dc2626)" }}>{abnormal}</span></div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">💊</div>
              <div className="metric-label">Treated</div>
              <div><span className="metric-value" style={{ backgroundImage: "linear-gradient(135deg,#10b981,#059669)" }}>{treated}</span></div>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "50px", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ margin: "0 auto 12px" }} />Loading reports…
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
              <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>No reports yet</div>
              <div style={{ fontSize: "14px" }}>Run an analysis from the Live Monitor to create your first report.</div>
            </div>
          ) : (
            reports.map((r, i) => (
              <div
                key={r._id}
                style={{ borderBottom: i < reports.length - 1 ? "1px solid var(--border-color)" : "none" }}
              >
                {/* Row header */}
                <div
                  id={`history-row-${i}`}
                  onClick={() => setExpanded(prev => prev === r._id ? null : r._id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 120px 90px 90px 120px 110px 110px 30px",
                    alignItems: "center",
                    gap: "10px",
                    padding: "14px 20px",
                    cursor: r.treatment ? "pointer" : "default",
                    transition: "background var(--transition)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>#{i + 1}</span>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{fmt(r.createdAt)}</div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>HR</div>
                    <div style={{ fontWeight: 700 }}>{r.heartRate} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>BPM</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>SpO₂</div>
                    <div style={{ fontWeight: 700 }}>{r.spo2} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>%</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Blood Pressure</div>
                    <div style={{ fontWeight: 700 }}>{r.bp} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>mmHg</span></div>
                  </div>
                  <span className={`badge ${r.diagnosis === "Normal" || r.diagnosis === "Live-Sensor" ? "badge-normal" : "badge-abnormal"}`}>
                    {r.diagnosis === "Normal" ? "✓ " : r.diagnosis === "Live-Sensor" ? "📡 " : "⚠ "}
                    {r.diagnosis}
                  </span>
                  {r.treatment
                    ? <span className="badge badge-normal" style={{ fontSize: "11px" }}>💊 Treated</span>
                    : <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>—</span>
                  }
                  {r.treatment
                    ? <span style={{ color: "var(--text-muted)", fontSize: "18px", transform: expanded === r._id ? "rotate(180deg)" : "rotate(0)", display: "block", textAlign: "center", transition: "transform 0.2s" }}>▾</span>
                    : <span />
                  }
                </div>

                {/* Expanded: show doctor's treatment */}
                {expanded === r._id && r.treatment && (
                  <div style={{ borderTop: "1px solid var(--border-color)", padding: "18px 20px 20px", background: "rgba(0,0,0,0.2)", animation: "fadeIn 0.2s ease" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-green)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.7px" }}>
                      💊 Doctor's Treatment Recommendation
                    </div>
                    <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.8", whiteSpace: "pre-wrap" }}>
                      {r.treatment}
                    </div>
                    {r.treatedBy && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "10px" }}>
                        — Dr. {r.treatedBy}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);} }`}</style>
    </div>
  );
}
