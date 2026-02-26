import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
  const nav = useNavigate();
  const loc = useLocation();
  const raw = localStorage.getItem("user");
  const user = raw ? JSON.parse(raw) : null;

  const logout = () => {
    localStorage.removeItem("user");
    nav("/login");
  };

  const isActive = (path) => loc.pathname === path;

  if (!user) return null;

  const patientLinks = [
    { to: "/patient/dashboard", icon: "📡", label: "Live Monitor" },
    { to: "/patient/history", icon: "📋", label: "My Reports" },
  ];

  const doctorLinks = [
    { to: "/doctor/dashboard", icon: "🏥", label: "Dashboard" },
    { to: "/doctor/reports", icon: "📂", label: "All Reports" },
  ];

  const links = user.role === "doctor" ? doctorLinks : patientLinks;

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">🫀</div>
        <span className="sidebar-brand-text">StethAI</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={`sidebar-link${isActive(link.to) ? " active" : ""}`}
            id={`sidebar-link-${link.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="user-avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
          <div>
            <div className="user-info-name">{user.name}</div>
            <div className="user-info-role">{user.role}</div>
          </div>
        </div>
        <button
          id="logout-btn"
          className="btn btn-ghost"
          style={{ width: "100%", justifyContent: "flex-start", gap: "10px", fontSize: "13px" }}
          onClick={logout}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}