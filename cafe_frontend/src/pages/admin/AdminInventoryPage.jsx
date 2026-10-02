import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  adminListMenu,
  adminUpdateMenuItem,
} from "../../services/adminApi";
import {
  PackagePlus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Minus,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  X,
  Boxes,
  Check,
  Coffee,
} from "lucide-react";
import "./AdminLayout.css";

function fmtPaise(p) {
  return `₹${((p || 0) / 100).toFixed(2)}`;
}

export default function AdminInventoryPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(4);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // "all" | "out" | "low" | "healthy"
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Refill Modal State
  const [refillModalItem, setRefillModalItem] = useState(null); // item object or null
  const [refillAmount, setRefillAmount] = useState(25);
  const [isSavingRefill, setIsSavingRefill] = useState(false);

  const loadMenuData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);
    try {
      const data = await adminListMenu(token);
      setItems(Array.isArray(data) ? data : []);
      setLastSyncTime(new Date());
    } catch {
      if (!isSilent) {
        setMsg({ type: "error", text: "Failed to load live inventory." });
      }
    } finally {
      if (!isSilent) setLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    loadMenuData(false);
  }, [loadMenuData]);

  // Live Auto-Refresh Polling
  useEffect(() => {
    if (!autoRefresh || !token) return;

    const timer = setInterval(() => {
      // Don't disturb user if they are currently typing in the refill modal
      if (!refillModalItem) {
        loadMenuData(true);
      }
    }, refreshIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshIntervalSec, token, refillModalItem, loadMenuData]);

  // Inventory Metrics
  const metrics = useMemo(() => {
    let totalItems = items.length;
    let outOfStock = 0;
    let lowStock = 0;
    let healthyStock = 0;
    let totalUnits = 0;

    items.forEach((item) => {
      const stock = item.stock_quantity ?? 50;
      totalUnits += stock;
      if (!item.is_available || stock <= 0) {
        outOfStock += 1;
      } else if (stock <= 10) {
        lowStock += 1;
      } else {
        healthyStock += 1;
      }
    });

    return { totalItems, outOfStock, lowStock, healthyStock, totalUnits };
  }, [items]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ["all", ...Array.from(set).sort()];
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();

    return items.filter((item) => {
      const stock = item.stock_quantity ?? 50;
      const isOut = !item.is_available || stock <= 0;
      const isLow = stock > 0 && stock <= 10;
      const isHealthy = stock > 10;

      // Status filter
      if (stockFilter === "out" && !isOut) return false;
      if (stockFilter === "low" && !isLow) return false;
      if (stockFilter === "healthy" && !isHealthy) return false;

      // Category filter
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }

      // Search match
      if (q) {
        const matchesName = (item.name || "").toLowerCase().includes(q);
        const matchesCat = (item.category || "").toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }

      return true;
    });
  }, [items, stockFilter, selectedCategory, searchQuery]);

  // Inline Stock Adjuster
  async function adjustStock(item, delta) {
    const curr = item.stock_quantity ?? 50;
    const nextStock = Math.max(0, curr + delta);
    const nextAvail = nextStock > 0;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) =>
        i._id === item._id
          ? { ...i, stock_quantity: nextStock, is_available: nextAvail }
          : i
      )
    );

    try {
      await adminUpdateMenuItem(token, item._id, {
        stock_quantity: nextStock,
        is_available: nextAvail,
      });
    } catch {
      setMsg({ type: "error", text: "Failed to update stock quantity." });
      loadMenuData();
    }
  }

  // Open Refill Dialog
  function openRefillModal(item) {
    setRefillModalItem(item);
    setRefillAmount(25);
  }

  // Confirm Refill
  async function handleConfirmRefill() {
    if (!refillModalItem) return;
    const addQty = parseInt(refillAmount, 10);
    if (isNaN(addQty) || addQty <= 0) {
      setMsg({ type: "error", text: "Please enter a valid positive quantity to restock." });
      return;
    }

    setIsSavingRefill(true);
    setMsg({ type: "", text: "" });

    const currentStock = refillModalItem.stock_quantity ?? 50;
    const newStock = currentStock + addQty;

    try {
      await adminUpdateMenuItem(token, refillModalItem._id, {
        stock_quantity: newStock,
        is_available: true,
      });

      setMsg({
        type: "success",
        text: `Restocked "${refillModalItem.name}" by +${addQty} units. New Live Stock: ${newStock} units.`,
      });

      setItems((prev) =>
        prev.map((i) =>
          i._id === refillModalItem._id
            ? { ...i, stock_quantity: newStock, is_available: true }
            : i
        )
      );
      setRefillModalItem(null);
    } catch {
      setMsg({ type: "error", text: "Stock refill failed. Please try again." });
    } finally {
      setIsSavingRefill(false);
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
            <h1 className="ap-title">Live Stock &amp; Inventory Refill</h1>
            {autoRefresh ? (
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
                  letterSpacing: "0.02em",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: "var(--cafe-status-ready)",
                    boxShadow: "0 0 6px var(--cafe-status-ready)",
                    animation: "pulse 1.8s infinite",
                  }}
                />
                <span>LIVE AUTO-SYNC ({refreshIntervalSec}s)</span>
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "rgba(160, 61, 61, 0.08)",
                  color: "var(--cafe-text-muted)",
                  border: "1px solid var(--cafe-border)",
                  borderRadius: "var(--radius-full)",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                <span>SYNC PAUSED</span>
              </span>
            )}
          </div>
          <p className="ap-sub">
            Real-time stock numbers update live as orders are placed. Last synced:{" "}
            <strong>{lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong>
          </p>
        </div>

        {/* ── Auto-Refresh Controls ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Toggle Button */}
          <button
            type="button"
            className={`ap-btn ${autoRefresh ? "ap-btn-ghost" : "ap-btn-primary"}`}
            style={{
              fontSize: "12px",
              padding: "6px 12px",
              border: "1px solid var(--cafe-border)",
              backgroundColor: autoRefresh ? "#FFFFFF" : "var(--cafe-roast-primary)",
            }}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? "Click to Pause Auto-Sync" : "Click to Enable Auto-Sync"}
          >
            <Sparkles size={13} color={autoRefresh ? "var(--cafe-terracotta)" : "#FFFFFF"} />
            <span>{autoRefresh ? "Pause Auto-Sync" : "Enable Auto-Sync"}</span>
          </button>

          {/* Interval Selector */}
          {autoRefresh && (
            <select
              className="ap-input"
              style={{ padding: "6px 8px", fontSize: "12px", width: "100px", height: "34px" }}
              value={refreshIntervalSec}
              onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
              title="Auto-refresh polling frequency"
            >
              <option value={3}>Every 3s</option>
              <option value={4}>Every 4s</option>
              <option value={8}>Every 8s</option>
              <option value={15}>Every 15s</option>
            </select>
          )}

          {/* Manual Refresh Button */}
          <button
            type="button"
            className="ap-btn ap-btn-ghost"
            style={{
              border: "1px solid var(--cafe-border)",
              backgroundColor: "#FFFFFF",
              fontSize: "12px",
              padding: "6px 12px",
            }}
            onClick={() => loadMenuData(false)}
            disabled={loading || isRefreshing}
            title="Force immediate refresh"
          >
            <RefreshCw size={13} className={isRefreshing || loading ? "ap-spin" : ""} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Total Items */}
        <div
          className="ap-card"
          style={{
            padding: "16px 18px",
            borderLeft: "4px solid var(--cafe-roast-primary)",
            cursor: "pointer",
          }}
          onClick={() => { setStockFilter("all"); setSelectedCategory("all"); }}
        >
          <div style={{ fontSize: "12px", color: "var(--cafe-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            Total Tracked Items
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "26px", fontWeight: 700, color: "var(--cafe-roast-primary)", marginTop: 4 }}>
            {metrics.totalItems}
          </div>
          <div style={{ fontSize: "12px", color: "var(--cafe-text-muted)", marginTop: 2 }}>
            {metrics.totalUnits} total units in inventory
          </div>
        </div>

        {/* Out of Stock */}
        <div
          className="ap-card"
          style={{
            padding: "16px 18px",
            borderLeft: "4px solid #A03D3D",
            backgroundColor: metrics.outOfStock > 0 ? "rgba(160, 61, 61, 0.04)" : "#FFFFFF",
            cursor: "pointer",
          }}
          onClick={() => setStockFilter("out")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#A03D3D", fontWeight: 700, textTransform: "uppercase" }}>
              Out of Stock (0)
            </span>
            <XCircle size={16} color="#A03D3D" />
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "26px", fontWeight: 700, color: "#A03D3D", marginTop: 4 }}>
            {metrics.outOfStock}
          </div>
          <div style={{ fontSize: "12px", color: "#A03D3D", marginTop: 2 }}>
            {metrics.outOfStock > 0 ? "Needs immediate restock" : "All items available"}
          </div>
        </div>

        {/* Low Stock */}
        <div
          className="ap-card"
          style={{
            padding: "16px 18px",
            borderLeft: "4px solid #C26D24",
            backgroundColor: metrics.lowStock > 0 ? "rgba(194, 109, 36, 0.04)" : "#FFFFFF",
            cursor: "pointer",
          }}
          onClick={() => setStockFilter("low")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#C26D24", fontWeight: 700, textTransform: "uppercase" }}>
              Low Stock (&le;10)
            </span>
            <AlertTriangle size={16} color="#C26D24" />
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "26px", fontWeight: 700, color: "#C26D24", marginTop: 4 }}>
            {metrics.lowStock}
          </div>
          <div style={{ fontSize: "12px", color: "#C26D24", marginTop: 2 }}>
            Replenishment advised
          </div>
        </div>

        {/* Healthy Stock */}
        <div
          className="ap-card"
          style={{
            padding: "16px 18px",
            borderLeft: "4px solid var(--cafe-status-ready)",
            cursor: "pointer",
          }}
          onClick={() => setStockFilter("healthy")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--cafe-status-ready)", fontWeight: 700, textTransform: "uppercase" }}>
              Healthy Stock (&gt;10)
            </span>
            <CheckCircle2 size={16} color="var(--cafe-status-ready)" />
          </div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "26px", fontWeight: 700, color: "var(--cafe-status-ready)", marginTop: 4 }}>
            {metrics.healthyStock}
          </div>
          <div style={{ fontSize: "12px", color: "var(--cafe-text-muted)", marginTop: 2 }}>
            Optimum inventory levels
          </div>
        </div>
      </div>

      {/* ── Status Message ── */}
      {msg.text && (
        <div
          className={`ap-${msg.type}`}
          style={{ marginBottom: 16 }}
          onClick={() => setMsg({ type: "", text: "" })}
        >
          {msg.text}
        </div>
      )}

      {/* ── Search and Filter Controls ── */}
      <div
        className="ap-card"
        style={{
          padding: "12px 16px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 240px" }}>
          <Search size={16} color="var(--cafe-text-muted)" />
          <input
            type="text"
            className="ap-input"
            style={{
              border: "none",
              padding: "4px 8px",
              backgroundColor: "transparent",
              width: "100%",
            }}
            placeholder="Search items to restock…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="ap-btn ap-btn-ghost"
              style={{ padding: "4px" }}
              onClick={() => setSearchQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            className={`ap-btn ${stockFilter === "all" ? "ap-btn-primary" : "ap-btn-ghost"}`}
            style={{ padding: "5px 12px", fontSize: "12px", borderRadius: "var(--radius-full)" }}
            onClick={() => setStockFilter("all")}
          >
            All Items ({items.length})
          </button>
          <button
            type="button"
            className={`ap-btn ${stockFilter === "out" ? "ap-btn-primary" : "ap-btn-ghost"}`}
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              borderRadius: "var(--radius-full)",
              color: stockFilter === "out" ? "#FFFFFF" : "#A03D3D",
              borderColor: "#A03D3D",
            }}
            onClick={() => setStockFilter("out")}
          >
            Out of Stock ({metrics.outOfStock})
          </button>
          <button
            type="button"
            className={`ap-btn ${stockFilter === "low" ? "ap-btn-primary" : "ap-btn-ghost"}`}
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              borderRadius: "var(--radius-full)",
              color: stockFilter === "low" ? "#FFFFFF" : "#C26D24",
              borderColor: "#C26D24",
            }}
            onClick={() => setStockFilter("low")}
          >
            Low Stock ({metrics.lowStock})
          </button>
          <button
            type="button"
            className={`ap-btn ${stockFilter === "healthy" ? "ap-btn-primary" : "ap-btn-ghost"}`}
            style={{
              padding: "5px 12px",
              fontSize: "12px",
              borderRadius: "var(--radius-full)",
              color: stockFilter === "healthy" ? "#FFFFFF" : "var(--cafe-status-ready)",
              borderColor: "var(--cafe-status-ready)",
            }}
            onClick={() => setStockFilter("healthy")}
          >
            Healthy ({metrics.healthyStock})
          </button>
        </div>

        {/* Category Select */}
        <div style={{ marginLeft: "auto" }}>
          <select
            className="ap-input"
            style={{ padding: "6px 10px", fontSize: "12px", width: "150px" }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Categories" : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table View ── */}
      {loading ? (
        <div className="ap-empty">
          <div className="ap-spinner" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="ap-empty">
          <Boxes size={36} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>No inventory items match your criteria.</p>
        </div>
      ) : (
        <div className="ap-card" style={{ padding: 0 }}>
          <table className="ap-table">
            <thead>
              <tr>
                <th>Menu Item &amp; Category</th>
                <th style={{ width: "110px" }}>Unit Price</th>
                <th style={{ width: "160px" }}>Live Stock Count</th>
                <th style={{ width: "150px" }}>Inventory Status</th>
                <th style={{ width: "150px" }}>Quick Step (+/-)</th>
                <th style={{ textAlign: "right", width: "140px" }}>Stock Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const stock = item.stock_quantity ?? 50;
                const isAvail = Boolean(item.is_available) && stock > 0;
                const isOut = stock <= 0 || !item.is_available;
                const isLow = stock > 0 && stock <= 10;

                return (
                  <tr key={item._id} style={{ backgroundColor: isOut ? "rgba(160, 61, 61, 0.02)" : "transparent" }}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--cafe-text-main)", fontSize: "14.5px" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--cafe-text-muted)", marginTop: 2 }}>
                        {item.category || "General"}
                        {item.customization_groups?.length > 0 && (
                          <span style={{ marginLeft: 8, color: "var(--cafe-terracotta)", fontWeight: 600 }}>
                            &bull; {item.customization_groups.length} Customization Group(s)
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--cafe-terracotta)", fontSize: "14px" }}>
                      {fmtPaise(item.price_paise)}
                    </td>

                    {/* Live Stock Number */}
                    <td>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "18px",
                            fontWeight: 800,
                            color: isOut ? "#A03D3D" : isLow ? "#C26D24" : "var(--cafe-status-ready)",
                          }}
                        >
                          {stock}
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--cafe-text-muted)" }}>units</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      {isOut ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: "rgba(160, 61, 61, 0.1)",
                            color: "#A03D3D",
                            padding: "3px 10px",
                            borderRadius: "var(--radius-full)",
                            fontSize: "11.5px",
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#A03D3D" }} />
                          <span>Out of Stock</span>
                        </span>
                      ) : isLow ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: "rgba(194, 109, 36, 0.1)",
                            color: "#C26D24",
                            padding: "3px 10px",
                            borderRadius: "var(--radius-full)",
                            fontSize: "11.5px",
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#C26D24" }} />
                          <span>Low Stock ({stock})</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: "rgba(63, 112, 77, 0.1)",
                            color: "var(--cafe-status-ready)",
                            padding: "3px 10px",
                            borderRadius: "var(--radius-full)",
                            fontSize: "11.5px",
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--cafe-status-ready)" }} />
                          <span>Healthy Stock</span>
                        </span>
                      )}
                    </td>

                    {/* Inline Quick Step Adjuster */}
                    <td>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          backgroundColor: "#F8F4EE",
                          border: "1px solid var(--cafe-border)",
                          borderRadius: "6px",
                          padding: "2px 4px",
                        }}
                      >
                        <button
                          type="button"
                          className="ap-btn ap-btn-ghost"
                          style={{ padding: "2px 5px", height: "22px" }}
                          onClick={() => adjustStock(item, -1)}
                          disabled={stock <= 0}
                          title="Reduce stock by 1"
                        >
                          <Minus size={11} />
                        </button>
                        <button
                          type="button"
                          className="ap-btn ap-btn-ghost"
                          style={{ padding: "2px 5px", height: "22px" }}
                          onClick={() => adjustStock(item, +1)}
                          title="Add 1 unit"
                        >
                          <Plus size={11} />
                        </button>
                        <button
                          type="button"
                          className="ap-btn ap-btn-ghost"
                          style={{ padding: "2px 5px", height: "22px", fontSize: "11px", fontWeight: 700 }}
                          onClick={() => adjustStock(item, +10)}
                          title="Add 10 units"
                        >
                          +10
                        </button>
                      </div>
                    </td>

                    {/* Restock Button */}
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="ap-btn ap-btn-primary"
                        style={{ padding: "5px 12px", fontSize: "12px" }}
                        onClick={() => openRefillModal(item)}
                      >
                        <PackagePlus size={13} />
                        <span>Refill Stock</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DEDICATED STOCK REFILLING MODAL / PAGE ── */}
      {refillModalItem && (
        <div className="ap-modal-overlay" onClick={() => setRefillModalItem(null)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="ap-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <PackagePlus size={20} color="var(--cafe-terracotta)" />
                <h3 className="ap-modal-title">Refill Inventory Stock</h3>
              </div>
              <button
                className="ap-btn ap-btn-ghost"
                style={{ padding: "4px" }}
                onClick={() => setRefillModalItem(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Item Info Banner */}
              <div
                style={{
                  backgroundColor: "#F8F4EE",
                  border: "1px solid var(--cafe-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--cafe-roast-primary)" }}>
                    {refillModalItem.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--cafe-text-muted)", marginTop: 2 }}>
                    {refillModalItem.category} &bull; Base Price: {fmtPaise(refillModalItem.price_paise)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--cafe-text-muted)", fontWeight: 600 }}>
                    Current Stock
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      fontSize: "18px",
                      color: (refillModalItem.stock_quantity ?? 50) <= 0 ? "#A03D3D" : "var(--cafe-roast-primary)",
                    }}
                  >
                    {refillModalItem.stock_quantity ?? 50} units
                  </div>
                </div>
              </div>

              {/* Quantity to Add */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>
                  Quantity to Restock (Add Units)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="ap-input"
                  style={{ fontSize: "16px", fontWeight: 700, padding: "8px 12px" }}
                  placeholder="e.g. 25"
                  value={refillAmount}
                  onChange={(e) => setRefillAmount(e.target.value)}
                />
              </div>

              {/* Quick Increment Buttons */}
              <div>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--cafe-text-muted)", marginBottom: 6 }}>
                  Quick Batch Additions:
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[10, 25, 50, 100, 200].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      className="ap-btn ap-btn-ghost"
                      style={{
                        padding: "5px 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "1px solid var(--cafe-border)",
                        backgroundColor: Number(refillAmount) === qty ? "var(--cafe-roast-primary)" : "#FFFFFF",
                        color: Number(refillAmount) === qty ? "#FFFFFF" : "var(--cafe-text-main)",
                      }}
                      onClick={() => setRefillAmount(qty)}
                    >
                      +{qty} Units
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Calculation */}
              <div
                style={{
                  backgroundColor: "rgba(63, 112, 77, 0.08)",
                  border: "1px solid rgba(63, 112, 77, 0.2)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", color: "var(--cafe-text-muted)" }}>Projected Inventory:</div>
                  <div style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--cafe-text-main)", marginTop: 2 }}>
                    {(refillModalItem.stock_quantity ?? 50)} + {parseInt(refillAmount, 10) || 0} units
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "var(--cafe-status-ready)", fontWeight: 700, textTransform: "uppercase" }}>
                    New Live Stock
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "20px", fontWeight: 800, color: "var(--cafe-status-ready)" }}>
                    {(refillModalItem.stock_quantity ?? 50) + (parseInt(refillAmount, 10) || 0)} units
                  </div>
                </div>
              </div>
            </div>

            <div className="ap-modal-actions">
              <button
                type="button"
                className="ap-btn ap-btn-ghost"
                onClick={() => setRefillModalItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ap-btn ap-btn-primary"
                onClick={handleConfirmRefill}
                disabled={isSavingRefill}
              >
                <Check size={15} />
                <span>{isSavingRefill ? "Restocking…" : "Confirm Restock"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
