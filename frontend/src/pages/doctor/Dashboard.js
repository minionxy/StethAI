import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import Sidebar from "../../components/Sidebar";

function fmt(date) {
  if (!date) return "--";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function DoctorDashboard() {
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async (firstLoad = false) => {
      try {
        const res = await API.get("/reports/stats");
        if (active) {
          setStats(res.data);
        }
      } catch (err) {
      } finally {
        if (active && firstLoad) {
          setLoadingStats(false);
        }
      }
    };

    load(true);
    const id = setInterval(() => load(false), 5000);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const StatCard = ({ icon, label, value, sub, colorClass }) => (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
        {loadingStats ? (
          <div style={{ height: "32px", width: "60px", background: "rgba(255,255,255,0.07)", borderRadius: "6px" }} />
        ) : (
          <>
            <span
              className="metric-value"
              style={
                colorClass === "red"
                  ? { backgroundImage: "linear-gradient(135deg,#ef4444,#dc2626)" }
                  : colorClass === "green"
                    ? { backgroundImage: "linear-gradient(135deg,#10b981,#059669)" }
                    : colorClass === "orange"
                      ? { backgroundImage: "linear-gradient(135deg,#f59e0b,#d97706)" }
                      : {}
              }
            >
              {value ?? "--"}
            </span>
            {sub && <span className="metric-unit">{sub}</span>}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Doctor Dashboard</h1>
          <p className="page-subtitle">Welcome, Dr. {user.name || "Doctor"}. Sensor vitals auto-refresh every 5 seconds.</p>
        </div>

        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontWeight: 700, marginBottom: "10px" }}>Live Sensor Feed</div>
          <div style={{ marginBottom: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
            Status: {stats?.liveStatus === "ok" ? "Live and stable" : (stats?.liveMessage || "Waiting for sensor")}
          </div>
          <div className="grid-4">
            <StatCard icon="HR" label="Live Heart Rate" value={stats?.liveStatus === "ok" ? (stats?.liveHeartRate ?? 0) : "--"} sub="BPM" />
            <StatCard icon="SpO2" label="Live SpO2" value={stats?.liveStatus === "ok" ? (stats?.liveSpO2 ?? 0) : "--"} sub="%" colorClass="green" />
            <StatCard icon="BP" label="Live BP" value={stats?.liveStatus === "ok" ? (stats?.liveBP || "--") : "--"} sub="mmHg" />
            <StatCard icon="AVG" label="Sensor Avg SpO2 (50)" value={stats?.sensorAvgSpO2 ?? 0} sub="%" colorClass="green" />
          </div>
          <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
            Last sensor update: {fmt(stats?.liveAt)}
          </div>
        </div>

        <div className="grid-4" style={{ marginBottom: "28px" }}>
          <StatCard icon="Reports" label="Total Reports" value={stats?.total} />
          <StatCard icon="Normal" label="Normal Cases" value={stats?.normal} colorClass="green" />
          <StatCard icon="Abn" label="Abnormal Cases" value={stats?.abnormal} colorClass="red" />
          <StatCard icon="Pend" label="Pending Treatment" value={stats?.pending} colorClass="orange" />
        </div>

        <div className="grid-4" style={{ marginBottom: "32px" }}>
          <StatCard icon="HR" label="Avg Heart Rate" value={stats?.avgHR} sub="BPM" />
          <StatCard icon="SpO2" label="Avg SpO2" value={stats?.avgSpO2} sub="%" />
          <StatCard icon="Done" label="Cases Treated" value={stats?.treated} colorClass="green" />
          <StatCard
            icon="Rate"
            label="Abnormal Rate"
            value={stats?.total ? `${Math.round((stats.abnormal / stats.total) * 100)}` : "0"}
            sub="%"
            colorClass={stats?.abnormal / stats?.total > 0.3 ? "red" : "green"}
          />
        </div>

        {!loadingStats && stats?.pending > 0 && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "28px",
            }}
          >
            <span style={{ fontSize: "24px" }}>!</span>
            <div>
              <div style={{ fontWeight: 700, color: "#fca5a5", marginBottom: "2px" }}>
                {stats.pending} abnormal case{stats.pending !== 1 ? "s" : ""} awaiting treatment
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Open Patient Records and filter by untreated to review them.
              </div>
            </div>
            <Link to="/doctor/reports" className="btn btn-danger" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
              Review Now
            </Link>
          </div>
        )}

        <div className="grid-2">
          <div className="card">
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>Records</div>
            <div style={{ fontWeight: 700, marginBottom: "6px", fontSize: "16px" }}>Patient Records</div>
            <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "18px", lineHeight: "1.6" }}>
              Browse all cardiac reports, filter by diagnosis, search by patient, and add treatment notes.
            </div>
            <Link to="/doctor/reports" className="btn btn-primary" id="go-to-records-btn">
              Open Patient Records
            </Link>
          </div>
          <div className="card">
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>Flow</div>
            <div style={{ fontWeight: 700, marginBottom: "6px", fontSize: "16px" }}>Treatment Workflow</div>
            <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.6" }}>
              Click any patient card to expand it, type treatment recommendations, and save to the report.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
