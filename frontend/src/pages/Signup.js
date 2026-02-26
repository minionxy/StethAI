import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";

export default function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "patient" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await API.post("/auth/signup", form);
      nav("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-bg-blob auth-bg-blob-1" />
      <div className="auth-bg-blob auth-bg-blob-2" />

      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🫀</div>
          <span className="auth-logo-text">StethAI</span>
        </div>

        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Join StethAI and start monitoring cardiac health</p>

        {error && <div className="form-error">⚠️ {error}</div>}

        {/* ── Role selector — prominent at top ── */}
        <div style={{ marginBottom: "24px" }}>
          <label className="form-label" style={{ fontSize: "14px", marginBottom: "10px" }}>
            I am signing up as a…
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { value: "patient", icon: "🧑‍⚕️", title: "Patient", desc: "Record & monitor my heart health" },
              { value: "doctor", icon: "👨‍⚕️", title: "Doctor", desc: "View patient records & suggest treatment" }
            ].map(({ value, icon, title, desc }) => (
              <button
                key={value}
                id={`role-select-${value}`}
                type="button"
                onClick={() => setForm({ ...form, role: value })}
                style={{
                  background: form.role === value
                    ? "linear-gradient(135deg, rgba(0,198,255,0.15), rgba(0,114,255,0.1))"
                    : "rgba(255,255,255,0.03)",
                  border: `2px solid ${form.role === value ? "var(--accent-primary)" : "var(--border-color)"}`,
                  borderRadius: "var(--radius-md)",
                  padding: "16px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "var(--transition)",
                  color: "var(--text-primary)",
                }}
              >
                <div style={{ fontSize: "26px", marginBottom: "8px" }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px", color: form.role === value ? "var(--accent-primary)" : "var(--text-primary)" }}>
                  {title}
                  {form.role === value && (
                    <span style={{ marginLeft: "6px", fontSize: "13px" }}>✓</span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            id="signup-name"
            type="text"
            className="form-input"
            placeholder={form.role === "doctor" ? "Dr. A. Sharma" : "John Doe"}
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email address</label>
          <input
            id="signup-email"
            type="email"
            className="form-input"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            id="signup-password"
            type="password"
            className="form-input"
            placeholder="Choose a strong password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <button
          id="signup-submit-btn"
          className="btn btn-primary"
          style={{ width: "100%", padding: "13px" }}
          onClick={signup}
          disabled={loading}
        >
          {loading
            ? <><div className="spinner" /> Creating account…</>
            : `Create ${form.role === "doctor" ? "Doctor" : "Patient"} Account →`
          }
        </button>

        <div className="auth-footer-link">
          Already have an account?&nbsp;
          <Link to="/login" id="go-to-login-link">Sign in →</Link>
        </div>

        <div className="auth-footer-link" style={{ marginTop: "10px" }}>
          <Link to="/" style={{ color: "var(--text-muted)", fontSize: "13px" }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}