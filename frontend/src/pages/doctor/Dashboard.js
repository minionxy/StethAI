import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";

export default function DoctorDashboard() {
  const user = JSON.parse(localStorage.getItem("user")) || {};

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Doctor Dashboard</h1>
          <p className="page-subtitle">Welcome, Dr. {user.name || "Doctor"} — review your patients and provide treatment.</p>
        </div>

        <div className="grid-4" style={{ marginBottom: "28px" }}>
          <div className="metric-card">
            <div className="metric-icon">👨‍⚕️</div>
            <div className="metric-label">Your Role</div>
            <div style={{ marginTop: "6px" }}>
              <span className="badge badge-doctor" style={{ fontSize: "13px", padding: "5px 12px" }}>
                Doctor
              </span>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">📡</div>
            <div className="metric-label">Services</div>
            <div style={{ marginTop: "6px" }}>
              <span className="badge badge-normal" style={{ fontSize: "13px", padding: "5px 12px" }}>
                ✓ Online
              </span>
            </div>
          </div>
        </div>

        {/* Quick info cards */}
        <div className="grid-2" style={{ marginBottom: "24px" }}>
          <div className="card">
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>📂</div>
            <div style={{ fontWeight: 700, marginBottom: "6px", fontSize: "16px" }}>Patient Records</div>
            <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "18px", lineHeight: "1.6" }}>
              View all patient cardiac reports, check AI diagnosis results, and add your treatment recommendation.
            </div>
            <Link to="/doctor/reports" className="btn btn-primary" id="go-to-records-btn">
              Open Patient Records →
            </Link>
          </div>

          <div className="card">
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>💊</div>
            <div style={{ fontWeight: 700, marginBottom: "6px", fontSize: "16px" }}>Treatment Workflow</div>
            <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6" }}>
              Click any patient record to expand it, type your treatment suggestion, and save it directly to the patient's report.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}