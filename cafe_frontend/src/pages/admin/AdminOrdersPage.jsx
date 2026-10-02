import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  adminListOrders, adminPatchOrderStatus,
  adminCompleteOrder, adminCancelOrder,
  adminGetOrderInvoice, adminSettleOrderPayment,
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
  Banknote
} from "lucide-react";
import InvoiceModal from "../../components/InvoiceModal";
import "./AdminLayout.css";

const STATUSES = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
const NEXT_STATUS = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
};

function fmt(p) { return `₹${((p || 0) / 100).toFixed(2)}`; }

export default function AdminOrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTable, setFilterTable] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [expandedId, setExpandedId] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payMethod, setPayMethod] = useState("cash");
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [invoiceModal, setInvoiceModal] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filterStatus)    params.status = filterStatus;
    if (filterTable)     params.table_number = Number(filterTable);
    if (filterStartDate) params.start_date = filterStartDate;
    if (filterEndDate)   params.end_date = filterEndDate;
    adminListOrders(token, params)
      .then(d => { setOrders(d.orders || []); setTotal(d.total || 0); })
      .catch(() => setMsg({ type: "error", text: "Failed to load orders." }))
      .finally(() => setLoading(false));
  }, [token, filterStatus, filterTable, filterStartDate, filterEndDate]);

  useEffect(() => { load(); }, [load]);

  async function advance(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await adminPatchOrderStatus(token, order.id, next);
      setMsg({ type: "success", text: `Order advanced to ${next}.` });
      load();
    } catch(e) { setMsg({ type: "error", text: e.response?.data?.detail || "Status update failed." }); }
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
      load();
      try {
        const invData = await adminGetOrderInvoice(token, orderId);
        setInvoiceModal(invData);
      } catch {
        setInvoiceModal({ ...currentPayModal, payment_status: "PAID", payment_method: currentPayMethod });
      }
    } catch(e) { setMsg({ type: "error", text: e.response?.data?.detail || "Payment settlement failed." }); }
  }

  async function doCancel() {
    try {
      await adminCancelOrder(token, cancelModal.id, cancelReason);
      setMsg({ type: "success", text: `Order for Table ${cancelModal.table_number} cancelled.` });
      setCancelModal(null);
      load();
    } catch(e) { setMsg({ type: "error", text: e.response?.data?.detail || "Cancellation failed." }); }
  }

  return (
    <div>
      <div className="ap-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="ap-title">Orders Management</h1>
          <p className="ap-sub">{total} order{total !== 1 ? "s" : ""} on record</p>
        </div>
        <button className="ap-btn ap-btn-ghost" onClick={load}>
          <RefreshCw size={14} className={loading ? "ap-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Filters Bar ── */}
      <div className="ap-card" style={{ padding: "14px 18px", marginBottom: "22px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--cafe-text-muted)", marginRight: 4 }}>
          <SlidersHorizontal size={14} />
          <span>Filter:</span>
        </div>
        <select className="ap-select" style={{ width: "auto" }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="ap-input" style={{ width: "110px" }} type="number" min="1" placeholder="Table #" value={filterTable} onChange={e => setFilterTable(e.target.value)} />
        <input className="ap-input" style={{ width: "145px" }} type="date" title="From date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
        <input className="ap-input" style={{ width: "145px" }} type="date" title="To date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
        <button className="ap-btn ap-btn-ghost" style={{ fontSize: "12px" }} onClick={() => { setFilterStatus(""); setFilterTable(""); setFilterStartDate(""); setFilterEndDate(""); }}>
          Clear Filters
        </button>
      </div>

      {msg.text && (
        <div className={`ap-${msg.type}`} onClick={() => setMsg({ type: "", text: "" })}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="ap-empty"><div className="ap-spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="ap-empty">
          <Receipt size={32} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>No orders match the selected filters.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {orders.map(order => {
            const isPaid = order.payment_status === "PAID" || order.status === "completed";
            const isCashPending = order.payment_status === "cash_pending";

            return (
              <div key={order.id} className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Order header row */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", cursor: "pointer", backgroundColor: expandedId === order.id ? "rgba(239, 232, 221, 0.3)" : "transparent", transition: "background-color 0.15s ease" }}
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
                        <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: "rgba(160, 61, 61, 0.12)", color: "#A03D3D", padding: "2px 8px", borderRadius: "4px" }}>
                          UNPAID
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
                        <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th style={{ textAlign: "right" }}>Total</th></tr>
                      </thead>
                      <tbody>
                        {order.items.map(item => (
                          <tr key={item.menu_item_id}>
                            <td style={{ fontWeight: 600 }}>{item.name}</td>
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
                          <span>Advance to {NEXT_STATUS[order.status]}</span>
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
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
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
              <select className="ap-select" value={payMethod} onChange={e => setPayMethod(e.target.value)}>
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
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
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
              <input className="ap-input" placeholder="e.g. Customer change of mind" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
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
