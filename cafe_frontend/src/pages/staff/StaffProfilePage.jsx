import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { staffUpdateProfile } from "../../services/staffApi";
import { User, Lock, Key, Check } from "lucide-react";
import "../admin/AdminLayout.css";

export default function StaffProfilePage() {
  const { user, token } = useAuth();
  const [form, setForm] = useState({ display_name: "", current_password: "", new_password: "" });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    if (!form.current_password || !form.new_password) {
      setMsg({ type: "error", text: "Both current and new password are required." });
      return;
    }
    setSaving(true);
    try {
      await staffUpdateProfile(token, {
        display_name: form.display_name ? form.display_name.trim() : undefined,
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setMsg({ type: "success", text: "Profile credentials updated successfully!" });
      setForm({ display_name: "", current_password: "", new_password: "" });
    } catch(e) {
      setMsg({ type: "error", text: e.response?.data?.detail || "Profile update failed." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="ap-header">
        <h1 className="ap-title">Staff Profile</h1>
        <p className="ap-sub">Update your personal display name and security credentials</p>
      </div>

      <div className="ap-card" style={{ maxWidth: 460 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid var(--cafe-border)" }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--cafe-roast-primary)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            fontFamily: "var(--font-serif)",
            fontWeight: 700,
            flexShrink: 0
          }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontWeight: 700, color: "var(--cafe-text-main)", fontSize: "17px" }}>
              @{user?.username}
            </div>
            <div style={{ fontSize: 12, color: "var(--cafe-text-muted)", marginTop: 2 }}>
              {user?.role === "ADMIN" ? "Administrator" : "Kitchen / Station Staff"}
            </div>
          </div>
        </div>

        {msg.text && (
          <div className={`ap-${msg.type}`} onClick={() => setMsg({ type: "", text: "" })}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>
              Display Name (optional)
            </label>
            <input
              className="ap-input"
              type="text"
              placeholder="e.g. Raju Kumar"
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>
              Current Password *
            </label>
            <input
              className="ap-input"
              type="password"
              placeholder="Verify current password"
              value={form.current_password}
              onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "var(--cafe-text-muted)" }}>
              New Password * (min 6 chars)
            </label>
            <input
              className="ap-input"
              type="password"
              placeholder="Enter new password"
              value={form.new_password}
              onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))}
              required
            />
          </div>

          <button type="submit" className="ap-btn ap-btn-primary" disabled={saving} style={{ marginTop: 8 }}>
            <Check size={15} />
            <span>{saving ? "Saving Changes…" : "Update Credentials"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
