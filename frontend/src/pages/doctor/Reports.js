import { useEffect, useState } from "react";
import API from "../../api/axios";
import Sidebar from "../../components/Sidebar";

export default function DoctorReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);      // which report card is open
  const [treatments, setTreatments] = useState({});    // { reportId: text }
  const [saving, setSaving] = useState({});             // { reportId: bool }
  const [saved, setSaved] = useState({});               // { reportId: bool }
  const doctor = JSON.parse(localStorage.getItem("user")) || {};

  useEffect(() => {
    API.get("/reports")
      .then(res => {
        setReports(res.data);
        // Pre-fill treatment inputs with existing values
        const existing = {};
        res.data.forEach(r => { if (r.treatment) existing[r._id] = r.treatment; });
        setTreatments(existing);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const saveTreatment = async (reportId) => {
    setSaving(s => ({ ...s, [reportId]: true }));
    try {
      const res = await API.patch(`/reports/${reportId}/treatment`, {
        treatment: treatments[reportId] || "",
        treatedBy: doctor.name || "Doctor"
      });
      // Update report in list
      setReports(prev => prev.map(r => r._id === reportId ? res.data : r));
      setSaved(s => ({ ...s, [reportId]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [reportId]: false })), 2500);
    } catch {
      alert("Failed to save treatment.");
    } finally {
      setSaving(s => ({ ...s, [reportId]: false }));
    }
  };

  const toggle = (id) => setExpanded(prev => prev === id ? null : id);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Patient Records</h1>
          <p className="page-subtitle">
            {loading ? "Loading…" : `${reports.length} report${reports.length !== 1 ? "s" : ""} on record — click a row to add treatment`}
          </p>
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: "center", padding: "50px", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />
            Fetching records…
          </div>
        ) : reports.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📂</div>
            <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>No reports yet</div>
            <div style={{ fontSize: "14px" }}>Patient analyses will appear here once recorded.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {reports.map((r, i) => (
              <div
                key={r._id}
                className="card"
                style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
              >
                {/* ── Row header (always visible) ── */}
                <div
                  id={`report-row-${i}`}
                  onClick={() => toggle(r._id)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 1fr 1fr 1fr 130px 30px",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px 22px",
                    transition: "background var(--transition)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-card-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>#{i + 1}</span>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "2px" }}>Heart Rate</div>
                    <div style={{ fontWeight: 700 }}>{r.heartRate} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>BPM</span></div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "2px" }}>SpO₂</div>
                    <div style={{ fontWeight: 700 }}>{r.spo2} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>%</span></div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "2px" }}>Blood Pressure</div>
                    <div style={{ fontWeight: 700 }}>{r.bp} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>mmHg</span></div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "2px" }}>Patient ID</div>
                    <div style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>…{r.userId?.slice(-8)}</div>
                  </div>

                  <span className={`badge ${r.diagnosis === "Normal" ? "badge-normal" : "badge-abnormal"}`}>
                    {r.diagnosis === "Normal" ? "✓ " : "⚠ "}{r.diagnosis}
                  </span>

                  <span style={{ color: "var(--text-muted)", fontSize: "18px", transition: "transform 0.2s", transform: expanded === r._id ? "rotate(180deg)" : "rotate(0deg)", display: "block", textAlign: "center" }}>
                    ▾
                  </span>
                </div>

                {/* ── Expanded treatment panel ── */}
                {expanded === r._id && (
                  <div style={{
                    borderTop: "1px solid var(--border-color)",
                    padding: "22px 22px 24px",
                    background: "rgba(0,0,0,0.2)",
                    animation: "fadeIn 0.2s ease"
                  }}>
                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>
                        💊 Doctor's Treatment Suggestion
                      </div>
                      <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                        {r.treatedBy
                          ? `Last updated by Dr. ${r.treatedBy}`
                          : "No treatment added yet — type your recommendation below"}
                      </div>
                    </div>

                    <textarea
                      id={`treatment-input-${i}`}
                      className="form-input"
                      rows={4}
                      placeholder="e.g. Prescribe Metoprolol 25mg twice daily. Advise low-sodium diet, limit strenuous activity. Follow up in 2 weeks for ECG review..."
                      value={treatments[r._id] || ""}
                      onChange={e => setTreatments(t => ({ ...t, [r._id]: e.target.value }))}
                      style={{ resize: "vertical", fontFamily: "inherit", lineHeight: "1.6" }}
                      onClick={e => e.stopPropagation()}
                    />

                    <div style={{ display: "flex", gap: "12px", marginTop: "14px", alignItems: "center" }}>
                      <button
                        id={`save-treatment-btn-${i}`}
                        className="btn btn-primary"
                        onClick={(e) => { e.stopPropagation(); saveTreatment(r._id); }}
                        disabled={saving[r._id] || !treatments[r._id]?.trim()}
                      >
                        {saving[r._id]
                          ? <><div className="spinner" /> Saving…</>
                          : "💾 Save Treatment"
                        }
                      </button>

                      {saved[r._id] && (
                        <div className="analysis-status analysis-status-done" style={{ padding: "8px 14px" }}>
                          ✓ Treatment saved
                        </div>
                      )}
                    </div>

                    {/* Show current saved treatment if exists */}
                    {r.treatment && (
                      <div style={{
                        marginTop: "18px",
                        padding: "14px 16px",
                        background: "rgba(16,185,129,0.07)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        borderRadius: "var(--radius-sm)",
                      }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-green)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.7px" }}>
                          ✓ Current Treatment on Record
                        </div>
                        <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
                          {r.treatment}
                        </div>
                        {r.treatedBy && (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>
                            — Dr. {r.treatedBy}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}