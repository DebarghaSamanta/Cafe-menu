import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  ChefHat,
  Coffee,
  Grid,
  User,
  LogOut,
  LayoutDashboard,
  Clock
} from "lucide-react";
import "./StaffLayout.css";

const NAV = [
  { to: "/staff/orders",  icon: ChefHat, label: "Kitchen Queue" },
  { to: "/staff/menu",    icon: Coffee,  label: "Stock & Availability" },
  { to: "/staff/tables",  icon: Grid,    label: "Dining Tables" },
  { to: "/staff/profile", icon: User,    label: "Staff Profile" },
];

export default function StaffLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState("");

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    }
    updateClock();
    const timer = setInterval(updateClock, 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="sl-root">
      <aside className="sl-sidebar">
        <div className="sl-brand">
          <h2 className="sl-brand-name">Kitchen Station</h2>
          <div className="sl-brand-role">STAFF OPERATIONS</div>
        </div>

        <nav className="sl-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sl-nav-item ${isActive ? "active" : ""}`}
            >
              <Icon className="sl-nav-icon" size={18} strokeWidth={1.9} />
              <span>{label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="sl-nav-divider" />
              <NavLink to="/admin/dashboard" className="sl-nav-item sl-nav-sub">
                <LayoutDashboard className="sl-nav-icon" size={17} strokeWidth={1.8} />
                <span>Return to Admin</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sl-sidebar-footer">
          <div className="sl-user">
            <div className="sl-avatar">{user?.username?.[0]?.toUpperCase() || "S"}</div>
            <div className="sl-user-text">
              <span className="sl-user-name">{user?.username || "Staff"}</span>
              <span className="sl-user-role">{user?.role === "ADMIN" ? "Admin (Kitchen Mode)" : "Station Barista"}</span>
            </div>
            <button className="sl-logout" onClick={handleLogout} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="sl-main-wrapper">
        <header className="sl-topbar">
          <div className="sl-topbar-left">
            <span className="sl-tagline">ARTISAN KITCHEN &bull; LIVE ORDERS DISPATCH</span>
          </div>
          <div className="sl-topbar-right">
            <div className="sl-clock-pill">
              <Clock size={14} />
              <span>{timeStr}</span>
            </div>
          </div>
        </header>

        <main className="sl-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
