import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { staffListMenu, staffToggleAvailability } from "../../services/staffApi";
import { adminListMenu, adminUpdateMenuItem } from "../../services/adminApi";
import { Coffee, Search, Minus, Plus } from "lucide-react";
import "../admin/AdminLayout.css";

function fmt(p) {
  return `₹${((p || 0) / 100).toFixed(2)}`;
}

export default function StaffMenuPage() {
  const { token, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    (isAdmin ? adminListMenu(token) : staffListMenu(token))
      .then((d) => setItems(Array.isArray(d) ? d : d.items || []))
      .catch(() =>
        setMsg({ type: "error", text: "Failed to load station menu." })
      )
      .finally(() => setLoading(false));
  }, [token, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  async function adjustStock(item, delta) {
    const current =
      item.stock_quantity !== undefined && item.stock_quantity !== null
        ? item.stock_quantity
        : 50;
    const newStock = Math.max(0, current + delta);
    const newAvail = newStock > 0;

    setItems((prev) =>
      prev.map((i) =>
        i._id === item._id
          ? { ...i, stock_quantity: newStock, is_available: newAvail }
          : i
      )
    );

    try {
      if (isAdmin) {
        await adminUpdateMenuItem(token, item._id, {
          stock_quantity: newStock,
          is_available: newAvail,
        });
      } else {
        await adminUpdateMenuItem(token, item._id, {
          stock_quantity: newStock,
          is_available: newAvail,
        });
      }
    } catch {
      load();
    }
  }

  async function toggle(item) {
    const newAvail = !item.is_available;
    const stock =
      item.stock_quantity !== undefined && item.stock_quantity !== null
        ? item.stock_quantity
        : 50;

    const payload = {
      is_available: newAvail,
    };
    if (newAvail && stock <= 0) {
      payload.stock_quantity = 20;
    }

    try {
      if (isAdmin) {
        await adminUpdateMenuItem(token, item._id, payload);
      } else {
        await staffToggleAvailability(token, item._id, newAvail);
      }
      load();
    } catch (e) {
      setMsg({ type: "error", text: "Stock update failed." });
    }
  }

  const filtered = items.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, item) => {
    const c = item.category || "General";
    (acc[c] = acc[c] || []).push(item);
    return acc;
  }, {});

  return (
    <div>
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
          <h1 className="ap-title">Stock &amp; Item Availability</h1>
          <p className="ap-sub">
            Real-time numeric inventory tracking &amp; instant station toggles
          </p>
        </div>
      </div>

      {/* Search */}
      <div
        className="ap-card"
        style={{
          padding: "12px 16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Search size={16} style={{ color: "var(--cafe-text-muted)" }} />
        <input
          type="text"
          className="ap-input"
          style={{
            flex: 1,
            border: "none",
            padding: "4px 8px",
            backgroundColor: "transparent",
          }}
          placeholder="Quick search by item name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="ap-btn ap-btn-ghost"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => setSearch("")}
          >
            Clear
          </button>
        )}
      </div>

      {msg.text && (
        <div
          className={`ap-${msg.type}`}
          onClick={() => setMsg({ type: "", text: "" })}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="ap-empty">
          <div className="ap-spinner" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="ap-empty">
          <Coffee
            size={32}
            strokeWidth={1.5}
            style={{ opacity: 0.3, marginBottom: 8 }}
          />
          <p>No matching items found in the station menu.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "19px",
                color: "var(--cafe-text-main)",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              {cat}
            </h3>

            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {catItems.map((item) => {
                const stock =
                  item.stock_quantity !== undefined &&
                  item.stock_quantity !== null
                    ? item.stock_quantity
                    : 50;
                const isAvailable =
                  Boolean(item.is_available) && stock > 0;

                return (
                  <div
                    key={item._id}
                    className="ap-card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "14px 18px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--cafe-text-main)",
                          fontSize: "15px",
                        }}
                      >
                        {item.name}
                      </div>
                      {item.description && (
                        <div
                          style={{
                            fontSize: 12.5,
                            color: "var(--cafe-text-muted)",
                            marginTop: 2,
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontWeight: 700,
                        color: "var(--cafe-terracotta)",
                        fontSize: "16px",
                      }}
                    >
                      {fmt(item.price_paise)}
                    </div>

                    {/* Stock stepper for staff */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        backgroundColor: "#F8F4EE",
                        border: "1px solid var(--cafe-border)",
                        borderRadius: "8px",
                        padding: "3px 6px",
                      }}
                    >
                      <button
                        type="button"
                        className="ap-btn ap-btn-ghost"
                        style={{ padding: "2px 6px", height: "24px" }}
                        onClick={() => adjustStock(item, -1)}
                        disabled={stock <= 0}
                        title="Decrease stock"
                      >
                        <Minus size={12} />
                      </button>

                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          fontSize: "13px",
                          minWidth: "30px",
                          textAlign: "center",
                          color:
                            stock <= 0
                              ? "#A03D3D"
                              : stock <= 5
                              ? "#C26D24"
                              : "var(--cafe-text-main)",
                        }}
                      >
                        {stock}
                      </span>

                      <button
                        type="button"
                        className="ap-btn ap-btn-ghost"
                        style={{ padding: "2px 6px", height: "24px" }}
                        onClick={() => adjustStock(item, +5)}
                        title="Add 5 units"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Quick status button */}
                    <button
                      onClick={() => toggle(item)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: isAvailable
                          ? "rgba(63, 112, 77, 0.1)"
                          : "rgba(160, 61, 61, 0.1)",
                        border: `1px solid ${
                          isAvailable
                            ? "rgba(63, 112, 77, 0.3)"
                            : "rgba(160, 61, 61, 0.3)"
                        }`,
                        color: isAvailable
                          ? "var(--cafe-status-ready)"
                          : "var(--cafe-status-cancelled)",
                        borderRadius: "var(--radius-full)",
                        padding: "6px 14px",
                        fontWeight: 600,
                        fontSize: "12.5px",
                        cursor: "pointer",
                        minWidth: "120px",
                        justifyContent: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          backgroundColor: isAvailable
                            ? "var(--cafe-status-ready)"
                            : "var(--cafe-status-cancelled)",
                        }}
                      />
                      <span>{isAvailable ? "In Stock" : "Sold Out"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
