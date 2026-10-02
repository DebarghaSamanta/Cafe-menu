import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { staffListTables } from "../../services/staffApi";
import { adminListTables } from "../../services/adminApi";
import { Grid, Armchair, CheckCircle2, XCircle } from "lucide-react";
import "../admin/AdminLayout.css";

export default function StaffTablesPage() {
  const { token, isAdmin } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (isAdmin ? adminListTables(token) : staffListTables(token))
      .then(d => setTables(d.tables || []))
      .finally(() => setLoading(false));
  }, [token, isAdmin]);

  return (
    <div>
      <div className="ap-header">
        <h1 className="ap-title">Dining Tables Status</h1>
        <p className="ap-sub">{tables.length} table{tables.length !== 1 ? "s" : ""} in dining hall &bull; station view</p>
      </div>

      {loading ? (
        <div className="ap-empty"><div className="ap-spinner" /></div>
      ) : tables.length === 0 ? (
        <div className="ap-empty">
          <Grid size={32} strokeWidth={1.5} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>No tables configured.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 16 }}>
          {tables.map(t => (
            <div
              key={t.id}
              className="ap-card"
              style={{
                textAlign: "center",
                padding: "24px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                transition: "transform 0.15s ease",
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-full)",
                backgroundColor: t.is_active ? "var(--cafe-peach-light)" : "rgba(160, 61, 61, 0.08)",
                color: t.is_active ? "var(--cafe-roast-primary)" : "var(--cafe-status-cancelled)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4
              }}>
                <Armchair size={22} strokeWidth={1.8} />
              </div>

              <div style={{ fontFamily: "var(--font-serif)", fontSize: "19px", fontWeight: 700, color: "var(--cafe-text-main)" }}>
                Table {t.table_number}
              </div>

              <span className={`ap-badge ${t.is_active ? "ap-badge-ready" : "ap-badge-cancelled"}`} style={{ marginTop: 4 }}>
                {t.is_active ? "Active" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
