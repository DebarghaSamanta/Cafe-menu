import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  adminListMenu,
  adminCreateMenuItem,
  adminUpdateMenuItem,
  adminDeleteMenuItem,
} from "../../services/adminApi";
import {
  Plus,
  Edit3,
  Trash2,
  Coffee,
  Check,
  X,
  Search,
  Minus,
  Layers,
} from "lucide-react";
import "./AdminLayout.css";

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  price_rupees: "",
  stock_quantity: "50",
  is_available: true,
};

function fmt(p) {
  return `₹${((p || 0) / 100).toFixed(2)}`;
}

export default function AdminMenuPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [modal, setModal] = useState(null); // null | { mode:"create"|"edit", item? }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    adminListMenu(token)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() =>
        setMsg({ type: "error", text: "Failed to load menu items." })
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setModal({ mode: "create" });
  }

  function openEdit(item) {
    setForm({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      price_rupees: item.price_paise
        ? (item.price_paise / 100).toString()
        : "",
      stock_quantity:
        item.stock_quantity !== undefined && item.stock_quantity !== null
          ? item.stock_quantity.toString()
          : "50",
      is_available: item.is_available ?? true,
    });
    setModal({ mode: "edit", item });
  }

  async function handleSave() {
    if (!form.name || !form.category || !form.price_rupees) {
      setMsg({
        type: "error",
        text: "Please fill in name, category, and price.",
      });
      return;
    }
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      const stockNum = parseInt(form.stock_quantity, 10);
      const finalStock = isNaN(stockNum) ? 0 : Math.max(0, stockNum);
      const isAvail = form.is_available && finalStock > 0;

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price_paise: Math.round(parseFloat(form.price_rupees) * 100),
        stock_quantity: finalStock,
        is_available: isAvail,
        customization: {},
      };

      if (modal.mode === "create") {
        await adminCreateMenuItem(token, payload);
        setMsg({ type: "success", text: `"${form.name}" added to menu!` });
      } else {
        await adminUpdateMenuItem(token, modal.item._id, payload);
        setMsg({
          type: "success",
          text: `"${form.name}" updated successfully!`,
        });
      }
      setModal(null);
      load();
    } catch (e) {
      setMsg({
        type: "error",
        text: e.response?.data?.detail || "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}" from the menu?`)) return;
    try {
      await adminDeleteMenuItem(token, item._id);
      setMsg({ type: "success", text: `"${item.name}" deleted.` });
      load();
    } catch (e) {
      setMsg({
        type: "error",
        text: e.response?.data?.detail || "Delete failed.",
      });
    }
  }

  // Quick Stock Adjuster
  async function adjustStock(item, delta) {
    const current =
      item.stock_quantity !== undefined && item.stock_quantity !== null
        ? item.stock_quantity
        : 50;
    const newStock = Math.max(0, current + delta);
    const newAvail = newStock > 0;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) =>
        i._id === item._id
          ? { ...i, stock_quantity: newStock, is_available: newAvail }
          : i
      )
    );

    try {
      await adminUpdateMenuItem(token, item._id, {
        stock_quantity: newStock,
        is_available: newAvail,
      });
    } catch {
      load();
    }
  }

  async function toggleAvail(item) {
    const newAvail = !item.is_available;
    const stock =
      item.stock_quantity !== undefined && item.stock_quantity !== null
        ? item.stock_quantity
        : 50;

    const payload = {
      is_available: newAvail,
    };

    // If enabling when stock was 0, restore default stock to 20
    if (newAvail && stock <= 0) {
      payload.stock_quantity = 20;
    }

    try {
      await adminUpdateMenuItem(token, item._id, payload);
      load();
    } catch (e) {
      setMsg({ type: "error", text: "Availability update failed." });
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = filteredItems.reduce((acc, item) => {
    const cat = item.category || "General";
    (acc[cat] = acc[cat] || []).push(item);
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
          <h1 className="ap-title">Menu &amp; Stock Inventory</h1>
          <p className="ap-sub">
            {items.length} artisan items &bull; Live inventory numbers &amp; automatic out-of-stock management
          </p>
        </div>
        <button className="ap-btn ap-btn-primary" onClick={openCreate}>
          <Plus size={16} />
          <span>Add Menu Item</span>
        </button>
      </div>

      {/* ── Search Bar ── */}
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
          placeholder="Search menu items by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="ap-btn ap-btn-ghost"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            onClick={() => setSearchQuery("")}
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
          <p>No menu items found. Click "+ Add Menu Item" to get started.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "20px",
                  color: "var(--cafe-text-main)",
                  fontWeight: 700,
                }}
              >
                {cat}
              </h3>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--cafe-text-muted)",
                  fontStyle: "italic",
                }}
              >
                ({catItems.length} item{catItems.length !== 1 ? "s" : ""})
              </span>
            </div>

            <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Item &amp; Description</th>
                    <th style={{ width: "110px" }}>Price</th>
                    <th style={{ width: "190px" }}>Stock Inventory</th>
                    <th style={{ width: "130px" }}>Status</th>
                    <th style={{ textAlign: "right", width: "150px" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((item) => {
                    const stock =
                      item.stock_quantity !== undefined &&
                      item.stock_quantity !== null
                        ? item.stock_quantity
                        : 50;
                    const isAvailable = Boolean(item.is_available) && stock > 0;

                    return (
                      <tr key={item._id}>
                        <td>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "var(--cafe-text-main)",
                              fontSize: "14.5px",
                            }}
                          >
                            {item.name}
                          </div>
                          {item.description && (
                            <div
                              style={{
                                fontSize: 12.5,
                                color: "var(--cafe-text-muted)",
                                marginTop: 3,
                              }}
                            >
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontWeight: 700,
                            color: "var(--cafe-terracotta)",
                            fontSize: "15px",
                          }}
                        >
                          {fmt(item.price_paise)}
                        </td>

                        {/* Numeric Stock Adjuster */}
                        <td>
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
                              title="Decrease stock by 1"
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
                              title="Add 5 units to stock"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>

                        {/* Availability Pill */}
                        <td>
                          <button
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
                              padding: "4px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            onClick={() => toggleAvail(item)}
                            title="Click to toggle availability"
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
                            <span>
                              {isAvailable ? "In Stock" : "Out of Stock"}
                            </span>
                          </button>
                        </td>

                        {/* Action buttons */}
                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              justifyContent: "flex-end",
                            }}
                          >
                            <button
                              className="ap-btn ap-btn-ghost"
                              style={{ padding: "5px 10px", fontSize: "12px" }}
                              onClick={() => openEdit(item)}
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              className="ap-btn ap-btn-danger"
                              style={{ padding: "5px 10px", fontSize: "12px" }}
                              onClick={() => handleDelete(item)}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className="ap-modal-overlay" onClick={() => setModal(null)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">
                {modal.mode === "create"
                  ? "Add Menu Item"
                  : "Edit Menu Item & Inventory"}
              </h3>
              <button
                className="ap-btn ap-btn-ghost"
                style={{ padding: "4px 8px" }}
                onClick={() => setModal(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "var(--cafe-text-muted)",
                  }}
                >
                  Item Name
                </label>
                <input
                  className="ap-input"
                  type="text"
                  placeholder="e.g. Hazelnut Cappuccino"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "var(--cafe-text-muted)",
                  }}
                >
                  Category
                </label>
                <input
                  className="ap-input"
                  type="text"
                  placeholder="e.g. Coffee, Pastries, Breakfast"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "var(--cafe-text-muted)",
                    }}
                  >
                    Price (₹ Rupees)
                  </label>
                  <input
                    className="ap-input"
                    type="number"
                    step="0.50"
                    placeholder="e.g. 180"
                    value={form.price_rupees}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        price_rupees: e.target.value,
                      }))
                    }
                  />
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "var(--cafe-text-muted)",
                    }}
                  >
                    Initial Stock (Units)
                  </label>
                  <input
                    className="ap-input"
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    value={form.stock_quantity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        stock_quantity: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: "var(--cafe-text-muted)",
                  }}
                >
                  Description (optional)
                </label>
                <textarea
                  className="ap-input"
                  rows={3}
                  placeholder="Tasting notes, roast details, ingredients..."
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  style={{ resize: "vertical" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 4,
                }}
              >
                <input
                  type="checkbox"
                  id="menu-avail"
                  checked={form.is_available}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      is_available: e.target.checked,
                    }))
                  }
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: "var(--cafe-roast-primary)",
                    cursor: "pointer",
                  }}
                />
                <label
                  htmlFor="menu-avail"
                  style={{
                    fontSize: "13.5px",
                    color: "var(--cafe-text-main)",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Item is active and available for customer ordering
                </label>
              </div>
            </div>

            <div className="ap-modal-actions">
              <button
                className="ap-btn ap-btn-ghost"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="ap-btn ap-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                <Check size={15} />
                <span>{saving ? "Saving…" : "Save Item"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
