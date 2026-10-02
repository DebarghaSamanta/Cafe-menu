import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { staffListOrders, staffUpdateOrderStatus } from "../../services/staffApi";
import { adminListOrders, adminPatchOrderStatus } from "../../services/adminApi";
import {
  ChefHat,
  RefreshCw,
  Clock,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react";
import "../admin/AdminLayout.css";

const NEXT = { pending: "confirmed", confirmed: "preparing", preparing: "ready" };
const LABEL = { pending: "Confirm Ticket", confirmed: "Start Brewing / Cooking", preparing: "Mark Ready for Pickup" };

function fmt(p) { return `₹${((p || 0) / 100).toFixed(2)}`; }

function elapsed(dateStr, currentTime) {
  if (!dateStr) return "—";
  const diffSec = Math.max(0, Math.floor(((currentTime || Date.now()) - new Date(dateStr)) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  const secs = diffSec % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (mins > 0 || hours > 0 || days > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);

  return `${parts.join(" ")} ago`;
}

export default function KitchenPage() {
  const { token, isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(() => {
    setLoading(true);
    const params = filterStatus ? { status: filterStatus } : {};
    const fetcher = isAdmin ? adminListOrders : staffListOrders;
    fetcher(token, params)
      .then(d => setOrders(d.orders || []))
      .catch(() => setMsg({ type: "error", text: "Failed to load live kitchen queue." }))
      .finally(() => setLoading(false));
  }, [token, isAdmin, filterStatus]);

  // Periodic API fetch every 15s + live second ticker every 1s
  useEffect(() => {
    load();
    const fetchTimer = setInterval(load, 15000);
    const tickTimer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(fetchTimer);
      clearInterval(tickTimer);
    };
  }, [load]);

  async function advance(order) {
    const next = NEXT[order.status];
    if (!next) return;
    try {
      if (isAdmin) await adminPatchOrderStatus(token, order.id, next);
      else await staffUpdateOrderStatus(token, order.id, next);
      setMsg({ type: "success", text: `Table ${order.table_number} order advanced to ${next}!` });
      load();
    } catch(e) {
      setMsg({ type: "error", text: e.response?.data?.detail || "Status transition failed." });
    }
  }

  const active = orders.filter(o => !["completed", "cancelled"].includes(o.status));
  const done   = orders.filter(o =>  ["completed", "cancelled"].includes(o.status));

  return (
    <div>
      <div className="ap-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="ap-title">Kitchen Live Queue</h1>
          <p className="ap-sub">{active.length} active ticket{active.length !== 1 ? "s" : ""} &bull; auto-refreshes every 15s</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select className="ap-select" style={{ width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Active Tickets</option>
            <option value="pending">Pending Confirmation</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready for Table</option>
            <option value="completed">Completed &amp; Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="ap-btn ap-btn-ghost" onClick={load} title="Refresh live queue">
            <RefreshCw size={14} className={loading ? "ap-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`ap-${msg.type}`} onClick={() => setMsg({ type: "", text: "" })}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="ap-empty"><div className="ap-spinner" /></div>
      ) : active.length === 0 && done.length === 0 ? (
        <div className="ap-empty">
          <ChefHat size={36} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>Kitchen queue is all caught up. No active orders waiting.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[...active, ...done].map(order => {
            const next = NEXT[order.status];
            const isUrgent = order.status === "pending";
            return (
              <div
                key={order.id}
                className="ap-card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  borderColor: isUrgent ? "var(--cafe-terracotta)" : "var(--cafe-border)",
                  opacity: ["completed", "cancelled"].includes(order.status) ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 20px",
                    cursor: "pointer",
                    backgroundColor: isUrgent ? "rgba(140, 72, 53, 0.04)" : "transparent"
                  }}
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  {isUrgent && (
                    <div style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: "var(--cafe-terracotta)", flexShrink: 0 }} />
                  )}

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-serif)", fontSize: "17px", fontWeight: 700, color: "var(--cafe-text-main)" }}>
                        Table {order.table_number}
                      </span>
                      <span className={`ap-badge ap-badge-${order.status}`}>{order.status}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--cafe-text-muted)" }}>
                        <Clock size={12} />
                        <span>{elapsed(order.created_at, now)}</span>
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--cafe-text-body)", marginTop: 4 }}>
                      {order.items.map(i => `${i.name} × ${i.quantity}`).join(" &bull; ")}
                    </div>
                  </div>

                  <div style={{ fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--cafe-terracotta)", fontSize: "16px" }}>
                    {fmt(order.total_paise)}
                  </div>

                  <div style={{ color: "var(--cafe-text-muted)" }}>
                    {expandedId === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {expandedId === order.id && (
                  <div style={{ borderTop: "1px solid var(--cafe-border)", padding: "16px 20px", backgroundColor: "var(--cafe-peach-light)" }}>
                    <table className="ap-table" style={{ marginBottom: 16, backgroundColor: "var(--cafe-card-bg)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--cafe-border)" }}>
                      <thead>
                        <tr><th>Item</th><th>Quantity</th><th>Unit Price</th><th style={{ textAlign: "right" }}>Total</th></tr>
                      </thead>
                      <tbody>
                        {order.items.map(item => (
                          <tr key={item.menu_item_id}>
                            <td style={{ fontWeight: 600 }}>{item.name}</td>
                            <td>&times; {item.quantity}</td>
                            <td>{fmt(item.unit_price_paise)}</td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(item.line_total_paise)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      {order.payment_status !== "PAID" && order.status === "pending" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--cafe-terracotta)", fontWeight: 600, fontSize: "13px", backgroundColor: "rgba(140, 72, 53, 0.08)", padding: "6px 12px", borderRadius: "8px" }}>
                          <Clock size={14} />
                          <span>Awaiting Admin Payment Settlement before prep</span>
                        </div>
                      ) : next ? (
                        <button className="ap-btn ap-btn-primary" onClick={() => advance(order)}>
                          <span>{LABEL[order.status]}</span>
                          <ArrowRight size={14} />
                        </button>
                      ) : null}

                      {order.status === "ready" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--cafe-status-ready)", fontWeight: 600, fontSize: "13.5px" }}>
                          <CheckCircle2 size={16} />
                          <span>Ready for table runner pickup</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
