import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  adminListOrders,
  adminPatchOrderStatus,
  adminCompleteOrder,
  adminCancelOrder,
  adminGetOrderInvoice,
  adminSettleOrderPayment,
} from "../../services/adminApi";
import {
  ChevronDown,
  ChevronUp,
  CreditCard,
  X,
  RefreshCw,
  CheckCircle,
  SlidersHorizontal,
  ArrowRight,
  Receipt,
  Banknote,
  LayoutGrid,
  List,
  Sparkles,
  Coffee,
  Check,
  Clock,
  Utensils,
  AlertCircle,
} from "lucide-react";
import InvoiceModal from "../../components/InvoiceModal";
import "./AdminLayout.css";

const STATUSES = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
const NEXT_STATUS = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
};

function fmt(p) {
  return `₹${((p || 0) / 100).toFixed(2)}`;
}

export default function AdminOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // View Mode: "list" vs "table" (table-wise grouped)
  const [viewMode, setViewMode] = useState("table");

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTable, setFilterTable] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Accordion Expand States
  const [expandedId, setExpandedId] = useState(null);
  const [expandedTables, setExpandedTables] = useState({});

  // Modals
  const [payModal, setPayModal] = useState(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [invoiceModal, setInvoiceModal] = useState(null);

  const load = useCallback((isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);
    const params = {};
    if (filterStatus)    params.status = filterStatus;
    if (filterTable)     params.table_number = Number(filterTable);
    if (filterStartDate) params.start_date = filterStartDate;
    if (filterEndDate)   params.end_date = filterEndDate;

    adminListOrders(token, params)
      .then((d) => {
        setOrders(d.orders || []);
        setTotal(d.total || 0);
      })
      .catch(() => {
        if (!isSilent) {
          setMsg({ type: "error", text: "Failed to load orders." });
        }
      })
      .finally(() => {
        if (!isSilent) setLoading(false);
        setIsRefreshing(false);
      });
  }, [token, filterStatus, filterTable, filterStartDate, filterEndDate]);

  useEffect(() => {
    load(false);
  }, [load]);

  // Live Auto-Refresh Polling every 4 seconds
  useEffect(() => {
    if (!autoRefresh || !token) return;

    const interval = setInterval(() => {
      if (!payModal && !cancelModal && !invoiceModal) {
        load(true);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [autoRefresh, token, payModal, cancelModal, invoiceModal, load]);

  // ── Group Orders Table-Wise ──
  const tableGroups = useMemo(() => {
    const groups = {};

    orders.forEach((order) => {
      const tNum = order.table_number || "Unknown";
      if (!groups[tNum]) {
        groups[tNum] = {
          tableNumber: tNum,
          tableId: order.table_id,
          orders: [],
          totalPaise: 0,
          activeOrdersCount: 0,
          unpaidPaise: 0,
          paidPaise: 0,
          latestOrderTime: null,
        };
      }

      groups[tNum].orders.push(order);
      groups[tNum].totalPaise += order.total_paise || 0;

      const isPaid = order.payment_status === "PAID" || order.status === "completed";
      if (isPaid) {
        groups[tNum].paidPaise += order.total_paise || 0;
      } else if (order.status !== "cancelled") {
        groups[tNum].unpaidPaise += order.total_paise || 0;
      }

      if (["pending", "confirmed", "preparing", "ready"].includes(order.status)) {
        groups[tNum].activeOrdersCount += 1;
      }

      const oTime = new Date(order.created_at);
      if (!groups[tNum].latestOrderTime || oTime > groups[tNum].latestOrderTime) {
        groups[tNum].latestOrderTime = oTime;
      }
    });

    // Sort tables numerically
    return Object.values(groups).sort((a, b) => {
      const numA = parseInt(a.tableNumber, 10);
      const numB = parseInt(b.tableNumber, 10);
      if (isNaN(numA) || isNaN(numB)) return String(a.tableNumber).localeCompare(String(b.tableNumber));
      return numA - numB;
    });
  }, [orders]);

  // Unique table numbers for quick filter bar
  const availableTables = useMemo(() => {
    const set = new Set();
    orders.forEach((o) => {
      if (o.table_number) set.add(o.table_number);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [orders]);

  function toggleTableExpand(tableNumber) {
    setExpandedTables((prev) => ({
      ...prev,
      [tableNumber]: !prev[tableNumber],
    }));
  }

  async function advance(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await adminPatchOrderStatus(token, order.id, next);
      setMsg({ type: "success", text: `Order for Table ${order.table_number} advanced to ${next}.` });
      load(true);
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.detail || "Status update failed." });
    }
  }

  async function handleOpenInvoice(order) {
    try {
      const invData = await adminGetOrderInvoice(token, order.id);
      setInvoiceModal(invData);
    } catch {
      setInvoiceModal(order);
    }
  }

  async function doComplete() {
    try {
      const orderId = payModal.id;
      const currentPayModal = payModal;
      const currentPayMethod = payMethod;

      if (currentPayModal.status === "ready") {
        await adminCompleteOrder(token, orderId, currentPayMethod);
      } else {
        await adminSettleOrderPayment(token, orderId, currentPayMethod);
      }

      setMsg({ type: "success", text: `Payment settled for Table ${currentPayModal.table_number}.` });
      setPayModal(null);
      load(true);
      try {
        const invData = await adminGetOrderInvoice(token, orderId);
        setInvoiceModal(invData);
      } catch {
        setInvoiceModal({ ...currentPayModal, payment_status: "PAID", payment_method: currentPayMethod });
      }
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.detail || "Payment settlement failed." });
    }
  }

  async function doCancel() {
    try {
      await adminCancelOrder(token, cancelModal.id, cancelReason);
      setMsg({ type: "success", text: `Order for Table ${cancelModal.table_number} cancelled.` });
      setCancelModal(null);
      load(true);
    } catch (e) {
      setMsg({ type: "error", text: e.response?.data?.detail || "Cancellation failed." });
    }
  }

  return (
    <div>
      {/* ── Header ── */}
      <div
        className="ap-header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 className="ap-title">Orders Management</h1>
            {autoRefresh && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: "rgba(63, 112, 77, 0.12)",
                  color: "var(--cafe-status-ready)",
                  border: "1px solid rgba(63, 112, 77, 0.3)",
                  borderRadius: "var(--radius-full)",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "var(--cafe-status-ready)",
                    animation: "pulse 1.8s infinite",
                  }}
                />
                <span>LIVE (4s)</span>
              </span>
            )}
          </div>
          <p className="ap-sub">
            {total} total order{total !== 1 ? "s" : ""} &bull; {tableGroups.length} active table{tableGroups.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Header Right: View Switcher + Refresh ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: "inline-flex",
              backgroundColor: "#F0E9DF",
              padding: "3px",
              borderRadius: "8px",
              border: "1px solid var(--cafe-border)",
            }}
          >
            <button
              type="button"
              className={`ap-btn ${viewMode === "table" ? "ap-btn-primary" : "ap-btn-ghost"}`}
              style={{ padding: "5px 12px", fontSize: "12px", borderRadius: "6px" }}
              onClick={() => setViewMode("table")}
            >
              <LayoutGrid size={13} />
              <span>Table-Wise View</span>
            </button>
            <button
              type="button"
              className={`ap-btn ${viewMode === "list" ? "ap-btn-primary" : "ap-btn-ghost"}`}
              style={{ padding: "5px 12px", fontSize: "12px", borderRadius: "6px" }}
              onClick={() => setViewMode("list")}
            >
              <List size={13} />
              <span>All Orders List</span>
            </button>
          </div>

          <button
            className="ap-btn ap-btn-ghost"
            style={{ border: "1px solid var(--cafe-border)", backgroundColor: "#FFFFFF" }}
            onClick={() => load(false)}
            disabled={loading || isRefreshing}
          >
            <RefreshCw size={13} className={isRefreshing || loading ? "ap-spin" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── Table Quick Filter Bar ── */}
      <div
        className="ap-card"
        style={{
          padding: "10px 16px",
          marginBottom: "14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--cafe-text-muted)", marginRight: 4 }}>
          Quick Table Filter:
        </span>
        <button
          type="button"
          className={`ap-btn ${filterTable === "" ? "ap-btn-primary" : "ap-btn-ghost"}`}
          style={{ padding: "4px 10px", fontSize: "11.5px", borderRadius: "var(--radius-full)" }}
          onClick={() => setFilterTable("")}
        >
          All Tables ({total})
        </button>
        {availableTables.map((tNum) => {
          const tOrders = orders.filter((o) => o.table_number === tNum);
          const hasActive = tOrders.some((o) => ["pending", "confirmed", "preparing", "ready"].includes(o.status));

          return (
            <button
              key={tNum}
              type="button"
              className={`ap-btn ${String(filterTable) === String(tNum) ? "ap-btn-primary" : "ap-btn-ghost"}`}
              style={{
                padding: "4px 10px",
                fontSize: "11.5px",
                borderRadius: "var(--radius-full)",
                border: hasActive ? "1px solid var(--cafe-terracotta)" : "1px solid var(--cafe-border)",
                backgroundColor: String(filterTable) === String(tNum) ? "var(--cafe-roast-primary)" : "#FFFFFF",
              }}
              onClick={() => setFilterTable(String(filterTable) === String(tNum) ? "" : String(tNum))}
            >
              <span>Table {tNum}</span>
              <span style={{ fontSize: "10.5px", opacity: 0.8, marginLeft: 4 }}>
                ({tOrders.length})
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Filters Bar ── */}
      <div
        className="ap-card"
        style={{
          padding: "12px 18px",
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>
          <SlidersHorizontal size={14} />
          <span>Filter:</span>
        </div>

        <select
          className="ap-select"
          style={{ width: "auto" }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>

        <input
          className="ap-input"
          style={{ width: "110px" }}
          type="number"
          min="1"
          placeholder="Table #"
          value={filterTable}
          onChange={(e) => setFilterTable(e.target.value)}
        />
        <input
          className="ap-input"
          style={{ width: "145px" }}
          type="date"
          title="From date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
        />
        <input
          className="ap-input"
          style={{ width: "145px" }}
          type="date"
          title="To date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
        />
        {(filterStatus || filterTable || filterStartDate || filterEndDate) && (
          <button
            className="ap-btn ap-btn-ghost"
            style={{ fontSize: "12px" }}
            onClick={() => {
              setFilterStatus("");
              setFilterTable("");
              setFilterStartDate("");
              setFilterEndDate("");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {msg.text && (
        <div className={`ap-${msg.type}`} onClick={() => setMsg({ type: "", text: "" })}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="ap-empty">
          <div className="ap-spinner" />
        </div>
      ) : orders.length === 0 ? (
        <div className="ap-empty">
          <Receipt size={32} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>No orders match the selected filters.</p>
        </div>
      ) : viewMode === "table" ? (
        /* ============================================================ */
        /* 1. TABLE-WISE GROUPED VIEW                                    */
        /* ============================================================ */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {tableGroups.map((group) => {
            const isExpanded = expandedTables[group.tableNumber] ?? true; // expanded by default

            return (
              <div
                key={group.tableNumber}
                className="ap-card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  border: group.activeOrdersCount > 0 ? "1.5px solid var(--cafe-terracotta)" : "1px solid var(--cafe-border)",
                }}
              >
                {/* Table Group Banner / Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px",
                    backgroundColor: group.activeOrdersCount > 0 ? "rgba(140, 72, 53, 0.05)" : "#FAF6F0",
                    borderBottom: isExpanded ? "1px solid var(--cafe-border)" : "none",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                  onClick={() => toggleTableExpand(group.tableNumber)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div
                      style={{
                        backgroundColor: "var(--cafe-roast-primary)",
                        color: "#FFFFFF",
                        fontFamily: "var(--font-serif)",
                        fontWeight: 700,
                        fontSize: "16px",
                        padding: "4px 12px",
                        borderRadius: "6px",
                      }}
                    >
                      Table {group.tableNumber}
                    </div>

                    {group.activeOrdersCount > 0 ? (
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 700,
                          backgroundColor: "rgba(140, 72, 53, 0.12)",
                          color: "var(--cafe-terracotta)",
                          padding: "3px 10px",
                          borderRadius: "var(--radius-full)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Clock size={12} />
                        <span>{group.activeOrdersCount} Active Order{group.activeOrdersCount !== 1 ? "s" : ""}</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 600,
                          backgroundColor: "rgba(63, 112, 77, 0.1)",
                          color: "var(--cafe-status-ready)",
                          padding: "3px 10px",
                          borderRadius: "var(--radius-full)",
                        }}
                      >
                        All Served
                      </span>
                    )}

                    {group.unpaidPaise > 0 ? (
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 700,
                          backgroundColor: "rgba(194, 109, 36, 0.12)",
                          color: "#C26D24",
                          padding: "3px 10px",
                          borderRadius: "var(--radius-full)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Banknote size={12} />
                        <span>Cash Due: {fmt(group.unpaidPaise)}</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "11.5px",
                          fontWeight: 600,
                          backgroundColor: "rgba(63, 112, 77, 0.1)",
                          color: "var(--cafe-status-ready)",
                          padding: "3px 10px",
                          borderRadius: "var(--radius-full)",
                        }}
                      >
                        Fully Paid
                      </span>
                    )}

                    <span style={{ fontSize: "12.5px", color: "var(--cafe-text-muted)" }}>
                      {group.orders.length} order{group.orders.length !== 1 ? "s" : ""} placed
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--cafe-text-muted)", fontWeight: 600 }}>
                        Table Total
                      </div>
                      <div style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "18px", color: "var(--cafe-roast-primary)" }}>
                        {fmt(group.totalPaise)}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="ap-btn ap-btn-ghost"
                      style={{ padding: "4px" }}
                      aria-label="Toggle Table Expand"
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Table Orders Listing */}
                {isExpanded && (
                  <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#FDFBF7" }}>
                    {group.orders.map((order) => {
                      const isPaid = order.payment_status === "PAID" || order.status === "completed";
                      const isCashPending = order.payment_status === "cash_pending";
                      const isOrderExpanded = expandedId === order.id;

                      return (
                        <div
                          key={order.id}
                          style={{
                            border: "1px solid var(--cafe-border)",
                            borderRadius: "8px",
                            backgroundColor: "#FFFFFF",
                            overflow: "hidden",
                          }}
                        >
                          {/* Order Row Header */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              cursor: "pointer",
                              backgroundColor: isOrderExpanded ? "rgba(239, 232, 221, 0.4)" : "transparent",
                            }}
                            onClick={() => setExpandedId(isOrderExpanded ? null : order.id)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "13px", color: "var(--cafe-text-main)" }}>
                                #{order.id.slice(-6).toUpperCase()}
                              </span>

                              <span className={`ap-badge ap-badge-${order.status}`} style={{ fontSize: "11px", padding: "2px 8px" }}>
                                {order.status}
                              </span>

                              {isPaid ? (
                                <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "rgba(63, 112, 77, 0.12)", color: "#2E5A36", padding: "2px 8px", borderRadius: "4px" }}>
                                  PAID ({order.payment_method?.toUpperCase() || "PREPAID"})
                                </span>
                              ) : isCashPending ? (
                                <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "rgba(194, 120, 42, 0.15)", color: "#9C5A14", padding: "2px 8px", borderRadius: "4px" }}>
                                  CASH DUE
                                </span>
                              ) : (
                                <>
                                  <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "rgba(160, 61, 61, 0.12)", color: "#A03D3D", padding: "2px 8px", borderRadius: "4px" }}>
                                    UNPAID
                                  </span>
                                  {order.status === "pending" && (
                                    <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "rgba(194, 109, 36, 0.12)", color: "#C26D24", padding: "2px 8px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                                      <Clock size={11} />
                                      <span>Expires in {Math.max(0, 30 - Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000))}m</span>
                                    </span>
                                  )}
                                </>
                              )}

                              {order.status === "cancelled" && order.cancel_reason && (
                                <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "rgba(160, 61, 61, 0.08)", color: "#A03D3D", padding: "2px 8px", borderRadius: "4px" }}>
                                  {order.cancel_reason.includes("30") ? "Auto-Expired (Unpaid 30m)" : order.cancel_reason}
                                </span>
                              )}

                              <span style={{ fontSize: "12px", color: "var(--cafe-text-muted)" }}>
                                {order.items.length} item{order.items.length !== 1 ? "s" : ""} &bull; {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--cafe-terracotta)", fontSize: "15px" }}>
                                {fmt(order.total_paise)}
                              </span>
                              {isOrderExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>

                          {/* Expanded Order Items */}
                          {isOrderExpanded && (
                            <div style={{ borderTop: "1px solid var(--cafe-border)", padding: "14px 16px", backgroundColor: "#FAF6F0" }}>
                              <table className="ap-table" style={{ marginBottom: 14, backgroundColor: "#FFFFFF", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--cafe-border)" }}>
                                <thead>
                                  <tr>
                                    <th>Item &amp; Customizations</th>
                                    <th>Qty</th>
                                    <th>Unit Price</th>
                                    <th style={{ textAlign: "right" }}>Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.items.map((item, idx) => (
                                    <tr key={idx}>
                                      <td>
                                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                                        {item.customizations?.length > 0 && (
                                          <div style={{ fontSize: "11px", color: "var(--cafe-terracotta)", fontStyle: "italic", marginTop: 2 }}>
                                            {item.customizations
                                              .map((c) => `${c.group_label}: ${c.choices.map((ch) => ch.label).join(", ")}`)
                                              .join(" | ")}
                                          </div>
                                        )}
                                      </td>
                                      <td>&times;{item.quantity}</td>
                                      <td>{fmt(item.unit_price_paise)}</td>
                                      <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(item.line_total_paise)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                {!isPaid && (
                                  <button className="ap-btn ap-btn-success" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setPayModal(order)}>
                                    <Banknote size={14} />
                                    <span>Settle Cash Payment</span>
                                  </button>
                                )}

                                {NEXT_STATUS[order.status] && (
                                  <button className="ap-btn ap-btn-primary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => advance(order)}>
                                    <span>Advance to {NEXT_STATUS[order.status].toUpperCase()}</span>
                                    <ArrowRight size={13} />
                                  </button>
                                )}

                                {isPaid && (
                                  <button className="ap-btn ap-btn-ghost" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => handleOpenInvoice(order)}>
                                    <Receipt size={14} />
                                    <span>View Tax Invoice</span>
                                  </button>
                                )}

                                {!["completed", "cancelled"].includes(order.status) && (
                                  <button className="ap-btn ap-btn-danger" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => { setCancelModal(order); setCancelReason(""); }}>
                                    <X size={14} />
                                    <span>Void / Cancel</span>
                                  </button>
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
          })}
        </div>
      ) : (
        /* ============================================================ */
        /* 2. CHRONOLOGICAL ALL-ORDERS LIST VIEW                         */
        /* ============================================================ */
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {orders.map((order) => {
            const isPaid = order.payment_status === "PAID" || order.status === "completed";
            const isCashPending = order.payment_status === "cash_pending";

            return (
              <div key={order.id} className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Order header row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 20px",
                    cursor: "pointer",
                    backgroundColor: expandedId === order.id ? "rgba(239, 232, 221, 0.3)" : "transparent",
                    transition: "background-color 0.15s ease",
                  }}
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "var(--font-serif)", fontWeight: 700, fontSize: "17px", color: "var(--cafe-text-main)" }}>
                        Table {order.table_number}
                      </span>
                      <span className={`ap-badge ap-badge-${order.status}`}>{order.status}</span>

                      {isPaid ? (
                        <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "rgba(63, 112, 77, 0.12)", color: "#2E5A36", padding: "2px 8px", borderRadius: "4px" }}>
                          PAID ({order.payment_method?.toUpperCase() || "PREPAID"})
                        </span>
                      ) : isCashPending ? (
                        <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "rgba(194, 120, 42, 0.15)", color: "#9C5A14", padding: "2px 8px", borderRadius: "4px" }}>
                          CASH DUE
                        </span>
                      ) : (
                        <>
                          <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "rgba(160, 61, 61, 0.12)", color: "#A03D3D", padding: "2px 8px", borderRadius: "4px" }}>
                            UNPAID
                          </span>
                          {order.status === "pending" && (
                            <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "rgba(194, 109, 36, 0.12)", color: "#C26D24", padding: "2px 8px", borderRadius: "4px", display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <Clock size={11} />
                              <span>Expires in {Math.max(0, 30 - Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000))}m</span>
                            </span>
                          )}
                        </>
                      )}

                      {order.status === "cancelled" && order.cancel_reason && (
                        <span style={{ fontSize: "11px", fontWeight: 600, backgroundColor: "rgba(160, 61, 61, 0.08)", color: "#A03D3D", padding: "2px 8px", borderRadius: "4px" }}>
                          {order.cancel_reason.includes("30") ? "Auto-Expired (Unpaid 30m)" : order.cancel_reason}
                        </span>
                      )}

                      <span style={{ fontSize: 13, color: "var(--cafe-text-muted)" }}>
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--cafe-text-light)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                      {order.id} &bull; {new Date(order.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--cafe-terracotta)", fontSize: "18px" }}>
                    {fmt(order.total_paise)}
                  </div>

                  <div style={{ color: "var(--cafe-text-muted)", display: "flex", alignItems: "center" }}>
                    {expandedId === order.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Expanded items */}
                {expandedId === order.id && (
                  <div style={{ borderTop: "1px solid var(--cafe-border)", padding: "18px 20px", backgroundColor: "var(--cafe-peach-light)" }}>
                    <table className="ap-table" style={{ marginBottom: 18, backgroundColor: "var(--cafe-card-bg)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--cafe-border)" }}>
                      <thead>
                        <tr>
                          <th>Item &amp; Customizations</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th style={{ textAlign: "right" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{item.name}</div>
                              {item.customizations?.length > 0 && (
                                <div style={{ fontSize: "11.5px", color: "var(--cafe-terracotta)", fontStyle: "italic", marginTop: 2 }}>
                                  {item.customizations
                                    .map((c) => `${c.group_label}: ${c.choices.map((ch) => ch.label).join(", ")}`)
                                    .join(" | ")}
                                </div>
                              )}
                            </td>
                            <td>&times;{item.quantity}</td>
                            <td>{fmt(item.unit_price_paise)}</td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(item.line_total_paise)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      {!isPaid && (
                        <button className="ap-btn ap-btn-success" onClick={() => setPayModal(order)}>
                          <Banknote size={15} />
                          <span>Settle Cash / Bill Payment</span>
                        </button>
                      )}

                      {NEXT_STATUS[order.status] && (
                        <button className="ap-btn ap-btn-primary" onClick={() => advance(order)}>
                          <span>Advance to {NEXT_STATUS[order.status].toUpperCase()}</span>
                          <ArrowRight size={14} />
                        </button>
                      )}

                      {isPaid && (
                        <button className="ap-btn ap-btn-ghost" onClick={() => handleOpenInvoice(order)}>
                          <Receipt size={15} />
                          <span>View / Print Invoice</span>
                        </button>
                      )}

                      {!["completed", "cancelled"].includes(order.status) && (
                        <button className="ap-btn ap-btn-danger" onClick={() => { setCancelModal(order); setCancelReason(""); }}>
                          <X size={15} />
                          <span>Cancel Order</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment modal */}
      {payModal && (
        <div className="ap-modal-overlay" onClick={() => setPayModal(null)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">Complete Order — Table {payModal.table_number}</h3>
              <button className="ap-btn ap-btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setPayModal(null)}>
                <X size={16} />
              </button>
            </div>
            <p style={{ color: "var(--cafe-text-muted)", marginBottom: 18 }}>
              Amount Due: <strong style={{ color: "var(--cafe-terracotta)", fontSize: "18px", fontFamily: "var(--font-serif)" }}>{fmt(payModal.total_paise)}</strong>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>
                Payment Method
              </label>
              <select className="ap-select" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <option value="cash">Cash Settlement</option>
                <option value="card">Credit / Debit Card</option>
                <option value="upi">UPI / Instant QR</option>
                <option value="other">Other Method</option>
              </select>
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-ghost" onClick={() => setPayModal(null)}>Back</button>
              <button className="ap-btn ap-btn-success" onClick={doComplete}>
                <CheckCircle size={15} />
                <span>Confirm Payment Received</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelModal && (
        <div className="ap-modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">Cancel Order — Table {cancelModal.table_number}</h3>
              <button className="ap-btn ap-btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setCancelModal(null)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>
                Reason for cancellation (optional)
              </label>
              <input className="ap-input" placeholder="e.g. Customer change of mind" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-ghost" onClick={() => setCancelModal(null)}>Keep Order</button>
              <button className="ap-btn ap-btn-danger" onClick={doCancel}>
                <X size={15} />
                <span>Void &amp; Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModal && (
        <InvoiceModal invoice={invoiceModal} onClose={() => setInvoiceModal(null)} />
      )}
    </div>
  );
}
