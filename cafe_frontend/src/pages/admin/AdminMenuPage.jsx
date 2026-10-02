import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
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
  Sparkles,
  Sliders,
  PackagePlus,
} from "lucide-react";
import "./AdminLayout.css";

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  price_rupees: "",
  stock_quantity: "50",
  is_available: true,
  customization_groups: [],
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
    const rawGroups = item.customization_groups || [];
    const formattedGroups = rawGroups.map((g) => ({
      id: g.id || `grp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: g.label || "",
      type: g.type || "single",
      required: Boolean(g.required),
      choices: (g.choices || []).map((ch) => ({
        id: ch.id || `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        label: ch.label || "",
        price_delta_rupees: ch.price_delta_paise !== undefined
          ? (ch.price_delta_paise / 100).toString()
          : "0",
      })),
    }));

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
      customization_groups: formattedGroups,
    });
    setModal({ mode: "edit", item });
  }

  // ── Customization Group Helpers ──
  function addGroup() {
    const newGroupId = `grp_${Date.now()}`;
    setForm((f) => ({
      ...f,
      customization_groups: [
        ...f.customization_groups,
        {
          id: newGroupId,
          label: "",
          type: "single",
          required: false,
          choices: [
            { id: `opt_1_${Date.now()}`, label: "Regular", price_delta_rupees: "0" },
            { id: `opt_2_${Date.now()}`, label: "Large", price_delta_rupees: "20" },
          ],
        },
      ],
    }));
  }

  function updateGroup(groupIndex, field, value) {
    setForm((f) => {
      const groups = [...f.customization_groups];
      groups[groupIndex] = { ...groups[groupIndex], [field]: value };
      return { ...f, customization_groups: groups };
    });
  }

  function removeGroup(groupIndex) {
    setForm((f) => ({
      ...f,
      customization_groups: f.customization_groups.filter((_, i) => i !== groupIndex),
    }));
  }

  function addChoice(groupIndex) {
    setForm((f) => {
      const groups = [...f.customization_groups];
      const choices = [
        ...groups[groupIndex].choices,
        { id: `opt_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`, label: "", price_delta_rupees: "0" },
      ];
      groups[groupIndex] = { ...groups[groupIndex], choices };
      return { ...f, customization_groups: groups };
    });
  }

  function updateChoice(groupIndex, choiceIndex, field, value) {
    setForm((f) => {
      const groups = [...f.customization_groups];
      const choices = [...groups[groupIndex].choices];
      choices[choiceIndex] = { ...choices[choiceIndex], [field]: value };
      groups[groupIndex] = { ...groups[groupIndex], choices };
      return { ...f, customization_groups: groups };
    });
  }

  function removeChoice(groupIndex, choiceIndex) {
    setForm((f) => {
      const groups = [...f.customization_groups];
      const choices = groups[groupIndex].choices.filter((_, i) => i !== choiceIndex);
      groups[groupIndex] = { ...groups[groupIndex], choices };
      return { ...f, customization_groups: groups };
    });
  }

  async function handleSave() {
    if (!form.name || !form.category || !form.price_rupees) {
      setMsg({
        type: "error",
        text: "Please fill in item name, category, and price.",
      });
      return;
    }
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      const stockNum = parseInt(form.stock_quantity, 10);
      const finalStock = isNaN(stockNum) ? 0 : Math.max(0, stockNum);
      const isAvail = form.is_available && finalStock > 0;

      // Package sanitized customization groups
      const sanitizedGroups = form.customization_groups
        .filter((g) => g.label.trim().length > 0)
        .map((g) => {
          const validChoices = g.choices
            .filter((ch) => ch.label.trim().length > 0)
            .map((ch) => {
              const deltaFloat = parseFloat(ch.price_delta_rupees);
              const deltaPaise = isNaN(deltaFloat) || deltaFloat < 0 ? 0 : Math.round(deltaFloat * 100);
              return {
                id: ch.id || ch.label.toLowerCase().replace(/\s+/g, "_"),
                label: ch.label.trim(),
                price_delta_paise: deltaPaise,
              };
            });

          return {
            id: g.id || g.label.toLowerCase().replace(/\s+/g, "_"),
            label: g.label.trim(),
            type: g.type || "single",
            required: Boolean(g.required),
            choices: validChoices,
          };
        })
        .filter((g) => g.choices.length > 0);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price_paise: Math.round(parseFloat(form.price_rupees) * 100),
        stock_quantity: finalStock,
        is_available: isAvail,
        customization_groups: sanitizedGroups,
      };

      if (modal.mode === "create") {
        await adminCreateMenuItem(token, payload);
        setMsg({ type: "success", text: `"${form.name}" added to menu with customization options!` });
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
          <h1 className="ap-title">Menu, Customizations &amp; Inventory</h1>
          <p className="ap-sub">
            {items.length} artisan items &bull; Live inventory numbers &amp; customizable option pricing
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            to="/admin/inventory"
            className="ap-btn ap-btn-ghost"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid var(--cafe-border)",
              color: "var(--cafe-roast-primary)",
              fontWeight: 600,
            }}
          >
            <PackagePlus size={16} color="var(--cafe-terracotta)" />
            <span>Live Stock &amp; Refill</span>
          </Link>
          <button className="ap-btn ap-btn-primary" onClick={openCreate}>
            <Plus size={16} />
            <span>Add Menu Item</span>
          </button>
        </div>
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
          placeholder="Search items by name or category…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="ap-btn ap-btn-ghost"
            style={{ padding: "4px 8px" }}
            onClick={() => setSearchQuery("")}
          >
            <X size={14} />
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
            size={36}
            strokeWidth={1.5}
            style={{ opacity: 0.3, marginBottom: 8 }}
          />
          <p>No menu items found.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([catName, catItems]) => (
          <div key={catName} style={{ marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--cafe-roast-primary)",
                  margin: 0,
                }}
              >
                {catName}
              </h2>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--cafe-text-muted)",
                  fontWeight: 600,
                }}
              >
                ({catItems.length})
              </span>
            </div>

            <div className="ap-card" style={{ padding: 0 }}>
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Item Details &amp; Customizations</th>
                    <th style={{ width: "110px" }}>Base Price</th>
                    <th style={{ width: "140px" }}>Live Stock</th>
                    <th style={{ width: "120px" }}>Status</th>
                    <th style={{ textAlign: "right", width: "120px" }}>
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
                    const customGroups = item.customization_groups || [];

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

                          {/* Customization Groups summary badge */}
                          {customGroups.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                marginTop: 6,
                              }}
                            >
                              {customGroups.map((g) => (
                                <span
                                  key={g.id}
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    backgroundColor: "var(--cafe-peach-light)",
                                    border: "1px solid var(--cafe-peach-border)",
                                    color: "var(--cafe-roast-primary)",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <Sliders size={11} color="var(--cafe-terracotta)" />
                                  <span>{g.label}: {g.choices?.map(c => c.price_delta_paise > 0 ? `${c.label} (+₹${(c.price_delta_paise/100).toFixed(0)})` : c.label).join(", ")}</span>
                                </span>
                              ))}
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
                            title="Toggle active status"
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
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

                        {/* Action Buttons */}
                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <button
                              className="ap-btn ap-btn-ghost"
                              style={{ padding: "6px 8px" }}
                              onClick={() => openEdit(item)}
                              title="Edit item details and customization pricing"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              className="ap-btn ap-btn-ghost"
                              style={{
                                padding: "6px 8px",
                                color: "var(--cafe-status-cancelled)",
                              }}
                              onClick={() => handleDelete(item)}
                              title="Delete Item"
                            >
                              <Trash2 size={15} />
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

      {/* ── Create / Edit Modal with Customization Editor ── */}
      {modal && (
        <div className="ap-modal-overlay" onClick={() => setModal(null)}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">
                {modal.mode === "create"
                  ? "Add Menu Item & Customizations"
                  : "Edit Menu Item, Options & Pricing"}
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
                  placeholder="e.g. Masala Chai, Hazelnut Cappuccino"
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
                  placeholder="e.g. Beverages, Desserts, Main Course, Starters"
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
                    Base Price (₹ Rupees)
                  </label>
                  <input
                    className="ap-input"
                    type="number"
                    step="1"
                    placeholder="e.g. 60"
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
                  rows={2}
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

              {/* ── Customization Groups Section ── */}
              <div className="ap-cg-section">
                <div className="ap-cg-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Sliders size={16} color="var(--cafe-terracotta)" />
                    <h4 className="ap-cg-title">Customization Groups &amp; Option Pricing</h4>
                  </div>
                  <button
                    type="button"
                    className="ap-btn ap-btn-ghost"
                    style={{ padding: "4px 10px", fontSize: "12px", border: "1px solid var(--cafe-border)" }}
                    onClick={addGroup}
                  >
                    <Plus size={13} />
                    <span>Add Group</span>
                  </button>
                </div>

                {form.customization_groups.length === 0 ? (
                  <div
                    style={{
                      padding: "16px",
                      border: "1px dashed var(--cafe-border)",
                      borderRadius: "8px",
                      textAlign: "center",
                      color: "var(--cafe-text-muted)",
                      fontSize: "13px",
                    }}
                  >
                    No customization options configured. Click <strong>+ Add Group</strong> above to offer Size, Sugar, Milk Choice, or Add-ons with custom extra pricing.
                  </div>
                ) : (
                  form.customization_groups.map((group, gIdx) => (
                    <div key={group.id || gIdx} className="ap-cg-card">
                      <div className="ap-cg-top-row">
                        {/* Group Label */}
                        <input
                          type="text"
                          className="ap-input"
                          style={{ padding: "6px 10px", fontSize: "13px", fontWeight: 600 }}
                          placeholder="Group name (e.g. Size, Sugar, Milk)"
                          value={group.label}
                          onChange={(e) => updateGroup(gIdx, "label", e.target.value)}
                        />

                        {/* Single vs Multi Select */}
                        <select
                          className="ap-input"
                          style={{ padding: "6px 8px", fontSize: "12px", width: "130px" }}
                          value={group.type}
                          onChange={(e) => updateGroup(gIdx, "type", e.target.value)}
                        >
                          <option value="single">Single Select (Radio)</option>
                          <option value="multi">Multi Select (Checkbox)</option>
                        </select>

                        {/* Required Toggle */}
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "12px",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={group.required}
                            onChange={(e) => updateGroup(gIdx, "required", e.target.checked)}
                            style={{ accentColor: "var(--cafe-roast-primary)" }}
                          />
                          <span>Required</span>
                        </label>

                        {/* Delete Group */}
                        <button
                          type="button"
                          className="ap-btn ap-btn-ghost"
                          style={{ padding: "5px", color: "#A03D3D" }}
                          onClick={() => removeGroup(gIdx)}
                          title="Delete Group"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Choices in this group */}
                      <div className="ap-cg-choices-list">
                        <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--cafe-text-muted)", marginBottom: 2 }}>
                          Choices &amp; Extra Price (+₹)
                        </div>

                        {group.choices.map((choice, cIdx) => (
                          <div key={choice.id || cIdx} className="ap-cg-choice-row">
                            <input
                              type="text"
                              className="ap-input"
                              style={{ padding: "5px 8px", fontSize: "12.5px" }}
                              placeholder="Choice name (e.g. Regular, Large, Oat Milk)"
                              value={choice.label}
                              onChange={(e) => updateChoice(gIdx, cIdx, "label", e.target.value)}
                            />

                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--cafe-text-muted)" }}>+₹</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                className="ap-input"
                                style={{ padding: "5px 6px", fontSize: "12.5px", width: "100%" }}
                                placeholder="0"
                                value={choice.price_delta_rupees}
                                onChange={(e) => updateChoice(gIdx, cIdx, "price_delta_rupees", e.target.value)}
                              />
                            </div>

                            <button
                              type="button"
                              className="ap-btn ap-btn-ghost"
                              style={{ padding: "4px", color: "var(--cafe-text-light)" }}
                              onClick={() => removeChoice(gIdx, cIdx)}
                              title="Remove Choice"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          className="ap-btn ap-btn-ghost"
                          style={{ alignSelf: "flex-start", padding: "3px 8px", fontSize: "11.5px", marginTop: 4 }}
                          onClick={() => addChoice(gIdx)}
                        >
                          <Plus size={12} />
                          <span>Add Choice</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 6,
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
