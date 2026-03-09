import { useEffect, useState } from "react";
import API from "../../api/axios";
import Sidebar from "../../components/Sidebar";

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Normal", value: "Normal" },
  { label: "Abnormal", value: "Abnormal" },
  { label: "Live Sensor", value: "sensor" },
  { label: "Untreated", value: "untreated" },
];

function fmt(date) {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function defaultForm() {
  return {
    summary: "",
    medication: "",
    tabletsPerDay: "",
    durationDays: "",
    timing: "",
    faceToFaceRequired: false,
    notes: "",
  };
}

export default function DoctorReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [forms, setForms] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [emailState, setEmailState] = useState({});
  const doctor = JSON.parse(localStorage.getItem("user")) || {};

  const loadReports = (activeFilter) => {
    setLoading(true);
    const params = {};

    if (activeFilter === "Normal" || activeFilter === "Abnormal") {
      params.diagnosis = activeFilter;
    }
    if (activeFilter === "sensor") {
      params.source = "sensor";
    }
    if (activeFilter === "untreated") {
      params.treated = "false";
    }

    API.get("/reports", { params })
      .then((res) => {
        setReports(res.data);
        const nextForms = {};
        res.data.forEach((r) => {
          nextForms[r._id] = {
            summary: r.treatment || "",
            medication: r.treatmentPlan?.medication || "",
            tabletsPerDay: r.treatmentPlan?.tabletsPerDay || "",
            durationDays: r.treatmentPlan?.durationDays ? String(r.treatmentPlan.durationDays) : "",
            timing: r.treatmentPlan?.timing || "",
            faceToFaceRequired: Boolean(r.treatmentPlan?.faceToFaceRequired),
            notes: r.treatmentPlan?.notes || "",
          };
        });
        setForms(nextForms);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports("all");
  }, []);

  const handleFilter = (f) => {
    setFilter(f);
    setSearch("");
    loadReports(f);
  };

  const updateForm = (reportId, patch) => {
    setForms((prev) => ({
      ...prev,
      [reportId]: { ...(prev[reportId] || defaultForm()), ...patch },
    }));
  };

  const saveTreatment = async (reportId) => {
    const form = forms[reportId] || defaultForm();

    setSaving((s) => ({ ...s, [reportId]: true }));
    try {
      const res = await API.patch(`/reports/${reportId}/treatment`, {
        treatment: form.summary,
        treatedBy: doctor.name || "Doctor",
        medication: form.medication,
        tabletsPerDay: form.tabletsPerDay,
        durationDays: form.durationDays,
        timing: form.timing,
        faceToFaceRequired: form.faceToFaceRequired,
        notes: form.notes,
      });

      setReports((prev) => prev.map((r) => (r._id === reportId ? res.data : r)));
      setSaved((s) => ({ ...s, [reportId]: true }));
      setEmailState((s) => ({
        ...s,
        [reportId]: {
          sent: Boolean(res.data?.email?.sent),
          reason: String(res.data?.email?.reason || ""),
          patientEmail: res.data?.patientEmail || "",
        },
      }));
      setTimeout(() => setSaved((s) => ({ ...s, [reportId]: false })), 2500);
    } catch {
      alert("Failed to save treatment/email.");
    } finally {
      setSaving((s) => ({ ...s, [reportId]: false }));
    }
  };

  const visible = reports.filter((r) => {
    if (!search) return true;

    const q = search.toLowerCase();
    const patientName = (typeof r.userId === "object" ? r.userId?.name : "") || "";
    const patientEmail = (typeof r.userId === "object" ? r.userId?.email : "") || "";
    const patientId = typeof r.userId === "string" ? r.userId : r.userId?._id || "";

    return (
      patientName.toLowerCase().includes(q) ||
      patientEmail.toLowerCase().includes(q) ||
      patientId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Patient Records</h1>
          <p className="page-subtitle">
            {loading ? "Loading..." : `${visible.length} record${visible.length !== 1 ? "s" : ""} shown`}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "22px", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                id={`filter-${f.value}-btn`}
                className="btn"
                onClick={() => handleFilter(f.value)}
                style={{
                  padding: "8px 16px",
                  fontSize: "13px",
                  background:
                    filter === f.value
                      ? "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))"
                      : "rgba(255,255,255,0.05)",
                  border: `1px solid ${filter === f.value ? "var(--accent-primary)" : "var(--border-color)"}`,
                  color: filter === f.value ? "#fff" : "var(--text-secondary)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <input
            id="search-patient-input"
            type="text"
            className="form-input"
            placeholder="Search by patient name/email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "320px", padding: "8px 14px", fontSize: "13px" }}
          />
        </div>

        {loading ? (
          <div className="card" style={{ textAlign: "center", padding: "50px", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }} />Fetching records...
          </div>
        ) : visible.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>Records</div>
            <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>No records found</div>
            <div style={{ fontSize: "14px" }}>Try changing the filter or search term.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {visible.map((r, i) => {
              const patient = typeof r.userId === "object" ? r.userId : null;
              const patientName = patient?.name || "Unknown Patient";
              const patientEmail = patient?.email || "";
              const patientId = typeof r.userId === "string" ? r.userId : patient?._id || "";
              const form = forms[r._id] || defaultForm();
              const hasAnyTreatmentInput =
                Boolean(form.summary?.trim()) ||
                Boolean(form.medication?.trim()) ||
                Boolean(form.tabletsPerDay?.trim()) ||
                Boolean(form.durationDays);

              return (
                <div key={r._id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div
                    id={`report-row-${i}`}
                    onClick={() => setExpanded((prev) => (prev === r._id ? null : r._id))}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px 1fr 90px 90px 110px 160px 120px 30px",
                      alignItems: "center",
                      gap: "10px",
                      padding: "14px 20px",
                      cursor: "pointer",
                      transition: "background var(--transition)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>#{i + 1}</span>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "1px" }}>Patient</div>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 600 }}>{patientName}</div>
                      {patientEmail && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{patientEmail}</div>}
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{fmt(r.createdAt)}</div>
                      <div style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--text-muted)" }}>...{String(patientId).slice(-8)}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Heart Rate</div>
                      <div style={{ fontWeight: 700 }}>{r.heartRate} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>BPM</span></div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>SpO2</div>
                      <div style={{ fontWeight: 700 }}>{r.spo2} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>%</span></div>
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Blood Pressure</div>
                      <div style={{ fontWeight: 700 }}>{r.bp} <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>mmHg</span></div>
                    </div>

                    <span className={`badge ${r.diagnosis === "Normal" || r.diagnosis === "Live-Sensor" ? "badge-normal" : "badge-abnormal"}`} style={{ justifySelf: "start" }}>
                      {r.diagnosis === "Normal" ? "OK " : r.diagnosis === "Live-Sensor" ? "LIVE " : "ALERT "}
                      {r.diagnosis}
                    </span>

                    {r.source === "sensor"
                      ? <span className="badge badge-normal" style={{ fontSize: "11px" }}>Live Feed</span>
                      : r.treatment
                        ? <span className="badge badge-normal" style={{ fontSize: "11px" }}>Treated</span>
                        : <span className="badge badge-abnormal" style={{ fontSize: "11px", background: "rgba(245,158,11,0.12)", color: "var(--accent-orange)", borderColor: "rgba(245,158,11,0.3)" }}>Pending</span>
                    }

                    <span style={{ color: "var(--text-muted)", fontSize: "18px", transform: expanded === r._id ? "rotate(180deg)" : "rotate(0)", display: "block", textAlign: "center", transition: "transform 0.2s" }}>v</span>
                  </div>

                  {expanded === r._id && (
                    <div style={{ borderTop: "1px solid var(--border-color)", padding: "20px 20px 22px", background: "rgba(0,0,0,0.2)", animation: "fadeIn 0.2s ease" }}>
                      <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>Detailed Treatment Plan</div>
                      <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "14px" }}>
                        {r.treatedBy ? `Last saved by Dr. ${r.treatedBy}` : "No treatment on record yet"}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                        <input
                          className="form-input"
                          placeholder="Medication / tablet name"
                          value={form.medication}
                          onChange={(e) => updateForm(r._id, { medication: e.target.value })}
                        />
                        <input
                          className="form-input"
                          placeholder="Tablets per day (e.g. 1-0-1)"
                          value={form.tabletsPerDay}
                          onChange={(e) => updateForm(r._id, { tabletsPerDay: e.target.value })}
                        />
                        <input
                          className="form-input"
                          type="number"
                          min="0"
                          placeholder="Duration in days"
                          value={form.durationDays}
                          onChange={(e) => updateForm(r._id, { durationDays: e.target.value })}
                        />
                        <input
                          className="form-input"
                          placeholder="When to use (before/after food, morning/night)"
                          value={form.timing}
                          onChange={(e) => updateForm(r._id, { timing: e.target.value })}
                        />
                      </div>

                      <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          id={`face-to-face-${i}`}
                          type="checkbox"
                          checked={Boolean(form.faceToFaceRequired)}
                          onChange={(e) => updateForm(r._id, { faceToFaceRequired: e.target.checked })}
                        />
                        <label htmlFor={`face-to-face-${i}`} style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                          Face-to-face consultation required
                        </label>
                      </div>

                      <textarea
                        className="form-input"
                        rows={3}
                        placeholder="Additional doctor notes"
                        value={form.notes}
                        onChange={(e) => updateForm(r._id, { notes: e.target.value })}
                        style={{ marginTop: "12px", resize: "vertical", fontFamily: "inherit", lineHeight: "1.6" }}
                      />

                      <textarea
                        className="form-input"
                        rows={4}
                        placeholder="Overall treatment summary for patient"
                        value={form.summary}
                        onChange={(e) => updateForm(r._id, { summary: e.target.value })}
                        style={{ marginTop: "12px", resize: "vertical", fontFamily: "inherit", lineHeight: "1.6" }}
                      />

                      <div style={{ display: "flex", gap: "12px", marginTop: "12px", alignItems: "center" }}>
                        <button
                          className="btn btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveTreatment(r._id);
                          }}
                          disabled={saving[r._id] || !hasAnyTreatmentInput}
                        >
                          {saving[r._id] ? <><div className="spinner" /> Saving...</> : "Save Treatment + Email"}
                        </button>
                        {saved[r._id] && emailState[r._id] && !emailState[r._id].sent && (
                          <div
                            style={{
                              padding: "8px 14px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 600,
                              border: "1px solid rgba(245,158,11,0.35)",
                              color: "var(--accent-orange)",
                              background: "rgba(245,158,11,0.12)",
                            }}
                          >
                            Saved only. Email not sent ({emailState[r._id].reason || "unknown reason"}).
                          </div>
                        )}
                        {saved[r._id] && emailState[r._id]?.sent && (
                          <div className="analysis-status analysis-status-done" style={{ padding: "8px 14px" }}>
                            Saved and mailed to {emailState[r._id].patientEmail || "patient"}
                          </div>
                        )}
                      </div>

                      {r.treatment && (
                        <div style={{ marginTop: "16px", padding: "14px 16px", background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius-sm)" }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-green)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.7px" }}>Current Treatment on Record</div>
                          <div style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{r.treatment}</div>
                          {r.treatedBy && <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px" }}>- Dr. {r.treatedBy}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
