import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getDashboard } from "../../services/adminApi";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  TrendingUp,
  Calendar,
  Layers,
  ArrowUpRight,
  Coffee,
  Sparkles,
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";
import "./AdminLayout.css";
import "./DashboardPage.css";

function fmt(paise) {
  return `₹${((paise || 0) / 100).toFixed(2)}`;
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const PRESETS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "this_month", label: "This Month" },
  { id: "custom", label: "Custom Range" },
];

export default function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activePreset, setActivePreset] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeRange, setActiveRange] = useState({ start_date: null, end_date: null, label: "All Time" });

  const loadStats = useCallback((params) => {
    setLoading(true);
    setError("");
    const query = {};
    if (params.start_date) query.start_date = params.start_date;
    if (params.end_date) query.end_date = params.end_date;

    getDashboard(token, query)
      .then(setStats)
      .catch(() => setError("Unable to load overview statistics."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadStats(activeRange);
  }, [loadStats, activeRange]);

  function handlePresetSelect(presetId) {
    setActivePreset(presetId);
    const now = new Date();

    if (presetId === "all") {
      setActiveRange({ start_date: null, end_date: null, label: "All Time" });
    } else if (presetId === "today") {
      const todayStr = toISODate(now);
      setActiveRange({ start_date: todayStr, end_date: todayStr, label: `Today (${todayStr})` });
    } else if (presetId === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = toISODate(yest);
      setActiveRange({ start_date: yestStr, end_date: yestStr, label: `Yesterday (${yestStr})` });
    } else if (presetId === "last7") {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setActiveRange({ start_date: toISODate(past), end_date: toISODate(now), label: "Last 7 Days" });
    } else if (presetId === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setActiveRange({ start_date: toISODate(firstDay), end_date: toISODate(now), label: "This Month" });
    } else if (presetId === "custom") {
      if (!customStart) setCustomStart(toISODate(now));
      if (!customEnd) setCustomEnd(toISODate(now));
    }
  }

  function handleApplyCustom(e) {
    e.preventDefault();
    if (!customStart && !customEnd) return;
    setActiveRange({
      start_date: customStart || null,
      end_date: customEnd || null,
      label: customStart && customEnd ? `${customStart} to ${customEnd}` : customStart ? `From ${customStart}` : `Up to ${customEnd}`
    });
  }

  const byStatus = stats ? Object.fromEntries(stats.orders_by_status.map(s => [s.status, s.count])) : {};

  return (
    <div className="db-root">
      {/* ── Header: European Bistro Overview Title ── */}
      <div className="db-hero">
        <div>
          <h1 className="db-title">Overview</h1>
          <p className="db-sub">Here's what's happening at The Artisan Café today.</p>
        </div>

        <button className="ap-btn ap-btn-ghost db-refresh-btn" onClick={() => loadStats(activeRange)} title="Refresh Data">
          <RefreshCw size={14} className={loading ? "ap-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── macOS Style Filter Bar ── */}
      <div className="db-controls-bar">
        <div className="db-presets-group">
          <div className="db-filter-label">
            <SlidersHorizontal size={14} />
            <span>Timeframe:</span>
          </div>
          <div className="db-pills-list">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className={`db-pill-btn ${activePreset === p.id ? "active" : ""}`}
                onClick={() => handlePresetSelect(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {activePreset === "custom" && (
          <form className="db-custom-box" onSubmit={handleApplyCustom}>
            <div className="db-field">
              <label>From</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="ap-input db-date-input"
              />
            </div>
            <div className="db-field">
              <label>To</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="ap-input db-date-input"
              />
            </div>
            <button type="submit" className="ap-btn ap-btn-primary" style={{ padding: "8px 14px", fontSize: "12px" }}>
              Apply
            </button>
          </form>
        )}
      </div>

      {loading && (
        <div className="ap-empty"><div className="ap-spinner" /></div>
      )}

      {error && (
        <div className="ap-error">{error}</div>
      )}

      {!loading && !error && stats && (
        <>
          {/* ── KPI Cards (Matches Reference Layout) ── */}
          <div className="db-metrics-grid">
            <div className="db-metric-box">
              <span className="db-metric-title">Orders ({activeRange.label})</span>
              <div className="db-metric-val">{stats.total_orders}</div>
              <div className="db-metric-meta">
                <span>{stats.today_orders} placed today</span>
              </div>
            </div>

            <div className="db-metric-box db-metric-highlight">
              <span className="db-metric-title">Revenue ({activeRange.label})</span>
              <div className="db-metric-val db-revenue-val">{fmt(stats.total_revenue_paise)}</div>
              <div className="db-metric-meta">
                <span>{fmt(stats.today_revenue_paise)} earned today</span>
              </div>
            </div>

            <div className="db-metric-box">
              <span className="db-metric-title">Completed Orders</span>
              <div className="db-metric-val">{byStatus["completed"] || 0}</div>
              <div className="db-metric-meta">
                <span>{byStatus["pending"] || 0} pending in kitchen</span>
              </div>
            </div>

            <div className="db-metric-box">
              <span className="db-metric-title">Avg. Order Value</span>
              <div className="db-metric-val">{fmt(stats.average_order_value_paise)}</div>
              <div className="db-metric-meta">
                <span>Per completed ticket</span>
              </div>
            </div>
          </div>

          {/* ── Two Column Editorial Breakdown ── */}
          <div className="db-content-grid">
            {/* Left: Orders by Status */}
            <div className="ap-card db-card">
              <div className="db-card-header">
                <h2 className="db-card-title">Order Status Flow</h2>
                <Link to="/admin/orders" className="db-card-link">
                  <span>View all orders</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>

              <div className="db-status-breakdown">
                {[
                  { status: "pending",   label: "Pending Receipt", desc: "Awaiting kitchen confirmation" },
                  { status: "confirmed", label: "Confirmed",       desc: "Accepted by station" },
                  { status: "preparing", label: "Preparing",       desc: "Brewing / Cooking" },
                  { status: "ready",     label: "Ready for Pickup",desc: "Ready to serve to table" },
                  { status: "completed", label: "Completed & Paid",desc: "Settled payment" },
                  { status: "cancelled", label: "Cancelled",       desc: "Voided tickets" },
                ].map(({ status, label, desc }) => (
                  <div key={status} className="db-status-item">
                    <div className="db-status-info">
                      <span className={`ap-badge ap-badge-${status}`}>{label}</span>
                      <span className="db-status-desc">{desc}</span>
                    </div>
                    <span className="db-status-num">{byStatus[status] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Top Selling Menu Items */}
            <div className="ap-card db-card">
              <div className="db-card-header">
                <h2 className="db-card-title">Popular Items Sold</h2>
                <Link to="/admin/menu" className="db-card-link">
                  <span>Manage menu</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>

              {stats.top_items.length === 0 ? (
                <div className="ap-empty" style={{ padding: "36px 20px" }}>
                  <Coffee size={32} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>No item sales recorded in this timeframe.</p>
                </div>
              ) : (
                <div className="db-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th style={{ width: "40px" }}>#</th>
                        <th>Item</th>
                        <th style={{ textAlign: "center" }}>Qty Sold</th>
                        <th style={{ textAlign: "right" }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.top_items.map((item, i) => (
                        <tr key={item.menu_item_id}>
                          <td className="db-rank-num">{i + 1}</td>
                          <td style={{ fontWeight: 600, color: "var(--cafe-text-main)" }}>
                            {item.name}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 600, color: "var(--cafe-roast-primary)" }}>
                            {item.total_quantity}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "var(--cafe-terracotta)" }}>
                            {fmt(item.total_revenue_paise)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
