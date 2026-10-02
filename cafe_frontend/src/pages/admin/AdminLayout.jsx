import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  LayoutDashboard,
  ClipboardList,
  Coffee,
  Grid,
  LogOut,
  ChevronDown,
  PackageCheck,
} from "lucide-react";
import "./AdminLayout.css";

const NAV = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Overview" },
  { to: "/admin/menu",      icon: Coffee,          label: "Menu & Options" },
  { to: "/admin/inventory", icon: PackageCheck,    label: "Live Stock & Refill" },
  { to: "/admin/orders",    icon: ClipboardList,   label: "Orders" },
  { to: "/admin/tables",    icon: Grid,            label: "Tables & QR" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!e.target.closest(".al-user-menu-container")) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuOpen]);

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const options = {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      };
      const datePart = now.toLocaleDateString("en-US", options);
      const timePart = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setTimeStr(`${datePart}  |  ${timePart}`);
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
    <div className="al-root">
      {/* ── Left Vintage European Cafe Sidebar ── */}
      <aside className="al-sidebar">
        <div className="al-brand">
          <h2 className="al-brand-name">The Artisan Café</h2>
          <div className="al-brand-role">A D M I N</div>
        </div>

        <nav className="al-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `al-nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon className="al-nav-icon" size={18} strokeWidth={1.9} />
              <span className="al-nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="al-sidebar-footer">
          <div className="al-quote">
            <em>
              Good Coffee
              <br />
              Runs on
              <br />
              Good Care.
            </em>
            <div className="al-quote-dash" />
          </div>

          <div className="al-user">
            <div className="al-avatar">
              {user?.username?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="al-user-text">
              <span className="al-user-name">{user?.username || "Admin"}</span>
              <span className="al-user-role">Administrator</span>
            </div>
            <button
              className="al-logout"
              onClick={handleLogout}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <div className="al-main-wrapper">
        <header className="al-topbar">
          <div className="al-topbar-left">
            <span className="al-tagline">
              CAFÉ OPERATIONS &bull; CRAFTED WITH CARE
            </span>
          </div>

          <div className="al-topbar-right">
            <span className="al-clock">{timeStr}</span>
            <div className="al-user-menu-container" style={{ position: "relative" }}>
              <div
                className={`al-admin-pill ${menuOpen ? "active" : ""}`}
                onClick={() => setMenuOpen((o) => !o)}
                title="Account Settings & Sign Out"
              >
                <div className="al-pill-avatar">
                  {user?.username?.[0]?.toUpperCase() || "A"}
                </div>
                <span className="al-pill-name">{user?.username || "Admin"}</span>
                <ChevronDown
                  size={14}
                  style={{
                    opacity: 0.7,
                    transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </div>

              {/* User Dropdown Menu */}
              {menuOpen && (
                <div className="al-dropdown-menu">
                  <div className="al-dropdown-header">
                    <div className="al-dropdown-avatar">
                      {user?.username?.[0]?.toUpperCase() || "A"}
                    </div>
                    <div className="al-dropdown-info">
                      <span className="al-dropdown-name">{user?.username || "Administrator"}</span>
                      <span className="al-dropdown-role">Portal Administrator</span>
                    </div>
                  </div>

                  <div className="al-dropdown-divider" />

                  <button
                    type="button"
                    className="al-dropdown-item al-dropdown-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="al-content">
          <Outlet />
        </main>

        <footer className="al-footer">
          <span>Sales &bull; Orders &bull; Menu &bull; Table QR Management</span>
          <span style={{ letterSpacing: "0.08em", fontSize: "11px" }}>
            GOOD FOOD &bull; BETTER DAYS
          </span>
        </footer>
      </div>
    </div>
  );
}
