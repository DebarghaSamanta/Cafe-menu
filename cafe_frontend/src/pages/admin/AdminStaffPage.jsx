import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { adminListStaff, adminCreateStaff, adminUpdateStaff, adminDeleteStaff } from "../../services/adminApi";
import {
  UserPlus,
  Edit2,
  Trash2,
  Users,
  X,
  Check,
  Key,
  Shield,
  UserCheck
} from "lucide-react";
import "./AdminLayout.css";

export default function AdminStaffPage() {
  const { token } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ username: "", password: "", display_name: "" });
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ display_name: "", password: "", is_active: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminListStaff(token)
      .then(d => setStaff(d.staff || []))
      .catch(() => setMsg({ type: "error", text: "Failed to load staff roster." }))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.username || !form.password) {
      setMsg({ type: "error", text: "Username and password are required." });
      return;
    }
    setSaving(true);
    try {
      await adminCreateStaff(token, {
        username: form.username.trim(),
        password: form.password,
        display_name: form.display_name.trim() || undefined
      });
      setMsg({ type: "success", text: `Staff account "${form.username}" created successfully!` });
      setModal(null);
      load();
    } catch(e) {
      setMsg({ type: "error", text: e.response?.data?.detail || "Creation failed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    setSaving(true);
    const payload = {};
    if (editForm.display_name !== undefined) payload.display_name = editForm.display_name.trim();
    if (editForm.password) payload.password = editForm.password;
    payload.is_active = editForm.is_active;
    try {
      await adminUpdateStaff(token, editModal.id, payload);
      setMsg({ type: "success", text: `Staff account updated!` });
      setEditModal(null);
      load();
    } catch(e) {
      setMsg({ type: "error", text: e.response?.data?.detail || "Update failed." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(member) {
    if (!window.confirm(`Permanently remove staff account "${member.username}"?`)) return;
    try {
      await adminDeleteStaff(token, member.id);
      setMsg({ type: "success", text: `Staff account "${member.username}" removed.` });
      load();
    } catch(e) {
      setMsg({ type: "error", text: e.response?.data?.detail || "Delete failed." });
    }
  }

  return (
    <div>
      <div className="ap-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="ap-title">Staff Management</h1>
          <p className="ap-sub">{staff.length} team member{staff.length !== 1 ? "s" : ""} on roster</p>
        </div>
        <button className="ap-btn ap-btn-primary" onClick={() => { setForm({ username: "", password: "", display_name: "" }); setModal(true); }}>
          <UserPlus size={16} />
          <span>Add Staff Member</span>
        </button>
      </div>

      {msg.text && (
        <div className={`ap-${msg.type}`} onClick={() => setMsg({ type: "", text: "" })}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="ap-empty"><div className="ap-spinner" /></div>
      ) : staff.length === 0 ? (
        <div className="ap-empty">
          <Users size={32} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>No staff accounts registered. Click "+ Add Staff Member" to create one.</p>
        </div>
      ) : (
        <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="ap-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Username</th>
                <th>Access Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map(member => (
                <tr key={member.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: "var(--radius-full)",
                        backgroundColor: "var(--cafe-roast-primary)",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {(member.display_name || member.username)?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--cafe-text-main)", fontSize: "14.5px" }}>
                          {member.display_name || member.username}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--cafe-text-muted)" }}>Kitchen / Station Staff</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--cafe-text-muted)", fontSize: "13px" }}>
                    @{member.username}
                  </td>
                  <td>
                    <span className={`ap-badge ${member.is_active ? "ap-badge-ready" : "ap-badge-cancelled"}`}>
                      {member.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        className="ap-btn ap-btn-ghost"
                        style={{ padding: "5px 10px", fontSize: "12px" }}
                        onClick={() => {
                          setEditModal(member);
                          setEditForm({ display_name: member.display_name || "", password: "", is_active: member.is_active });
                        }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      <button className="ap-btn ap-btn-danger" style={{ padding: "5px 10px", fontSize: "12px" }} onClick={() => handleDelete(member)}>
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Modal ── */}
      {modal && (
        <div className="ap-modal-overlay" onClick={() => setModal(null)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">Create Staff Account</h3>
              <button className="ap-btn ap-btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>Username</label>
                <input
                  className="ap-input"
                  type="text"
                  placeholder="e.g. barista_sam"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>Display Name (optional)</label>
                <input
                  className="ap-input"
                  type="text"
                  placeholder="e.g. Sam R."
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>Password</label>
                <input
                  className="ap-input"
                  type="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>

            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="ap-btn ap-btn-primary" onClick={handleCreate} disabled={saving}>
                <Check size={15} />
                <span>{saving ? "Creating…" : "Create Account"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div className="ap-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">Edit @{editModal.username}</h3>
              <button className="ap-btn ap-btn-ghost" style={{ padding: "4px 8px" }} onClick={() => setEditModal(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>Display Name</label>
                <input
                  className="ap-input"
                  type="text"
                  value={editForm.display_name}
                  onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>
                  Reset Password (leave blank to keep current)
                </label>
                <input
                  className="ap-input"
                  type="password"
                  placeholder="Enter new password or leave blank"
                  value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="staff-active"
                  checked={editForm.is_active}
                  onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: "var(--cafe-roast-primary)", cursor: "pointer" }}
                />
                <label htmlFor="staff-active" style={{ fontSize: "13.5px", color: "var(--cafe-text-main)", cursor: "pointer", fontWeight: 500 }}>
                  Account is active and permitted to sign in
                </label>
              </div>
            </div>

            <div className="ap-modal-actions">
              <button className="ap-btn ap-btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="ap-btn ap-btn-primary" onClick={handleUpdate} disabled={saving}>
                <Check size={15} />
                <span>{saving ? "Saving…" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
