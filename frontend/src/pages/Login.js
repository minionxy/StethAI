import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api/axios";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/auth/login", { email, password });
      localStorage.setItem("user", JSON.stringify(res.data));
      if (res.data.role === "doctor") nav("/doctor/dashboard");
      else nav("/patient/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") login();
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-bg-blob auth-bg-blob-1" />
      <div className="auth-bg-blob auth-bg-blob-2" />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🫀</div>
          <span className="auth-logo-text">StethAI</span>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-subtitle">Sign in to your cardiac monitoring account</p>

        {error && <div className="form-error">⚠️ {error}</div>}

        <div className="form-group">
          <label className="form-label">Email address</label>
          <input
            id="login-email"
            type="email"
            className="form-input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            id="login-password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
          />
        </div>

        <button
          id="login-submit-btn"
          className="btn btn-primary"
          style={{ width: "100%", padding: "13px" }}
          onClick={login}
          disabled={loading}
        >
          {loading ? <><div className="spinner" /> Signing in…</> : "Sign In →"}
        </button>

        <div className="auth-footer-link">
          Don't have an account?&nbsp;
          <Link to="/signup" id="go-to-signup-link">Create one →</Link>
        </div>

        <div className="auth-footer-link" style={{ marginTop: '10px' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}