import { useEffect, useState } from "react";
import API from "../../api/axios";
import Sidebar from "../../components/Sidebar";

export default function PatientHistory() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    API.get(`/reports/user/${user._id}`)
      .then(res => setReports(res.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">My Reports</h1>
          <p className="page-subtitle">Your historical cardiac monitoring records</p>
        </div>

        <div className="card">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              <div className="spinner" style={{ margin: "0 auto 12px" }} />
              Loading reports…
            </div>
          ) : reports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
              <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>No reports yet</div>
              <div style={{ fontSize: "14px" }}>Run an analysis from the Live Monitor to create your first report.</div>
            </div>
          ) : (
            <table className="styled-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Heart Rate</th>
                  <th>SpO₂</th>
                  <th>Blood Pressure</th>
                  <th>Diagnosis</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr key={r._id}>
                    <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                    <td><strong>{r.heartRate}</strong> <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>BPM</span></td>
                    <td><strong>{r.spo2}</strong> <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>%</span></td>
                    <td>{r.bp} <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>mmHg</span></td>
                    <td>
                      <span className={`badge ${r.diagnosis === "Normal" ? "badge-normal" : "badge-abnormal"}`}>
                        {r.diagnosis === "Normal" ? "✓ " : "⚠ "}{r.diagnosis}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}