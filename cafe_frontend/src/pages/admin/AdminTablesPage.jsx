import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  adminListTables,
  adminCreateTable,
  adminUpdateTable,
  adminRegenerateQR,
  adminDeleteTable,
} from "../../services/adminApi";
import TableStandeeModal from "../../components/TableStandeeModal";
import {
  Grid,
  Plus,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Printer,
  X,
  QrCode,
  Download,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import "./AdminLayout.css";

export default function AdminTablesPage() {
  const { token } = useAuth();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [newNum, setNewNum] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Active Dropdown state (table.id that has menu open)
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Standee Modal State
  const [standeeData, setStandeeData] = useState(null); // { table_number, qr_url, qr_token }

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside() {
      setActiveMenuId(null);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    adminListTables(token)
      .then((d) => setTables(d.tables || []))
      .catch(() =>
        setMsg({ type: "error", text: "Failed to load table directory." })
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!newNum || isNaN(Number(newNum)) || Number(newNum) < 1) {
      setMsg({
        type: "error",
        text: "Enter a valid table number (1 or higher).",
      });
      return;
    }
    setCreating(true);
    try {
      const data = await adminCreateTable(token, Number(newNum));
      const result = {
        table_number: data.table_number,
        qr_token: data.qr_token,
        qr_url: data.qr_url,
      };
      setStandeeData(result); // Automatically open the printable standee modal
      setNewNum("");
      setMsg({
        type: "success",
        text: `Table ${data.table_number} created! Printable standee ready.`,
      });
      load();
    } catch (e) {
      setMsg({
        type: "error",
        text: e.response?.data?.detail || "Table creation failed.",
      });
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(table) {
    try {
      await adminUpdateTable(token, table.id, { is_active: !table.is_active });
      load();
    } catch (e) {
      setMsg({ type: "error", text: "Status update failed." });
    }
  }

  // 1. Open Existing Standee without regenerating token
  function handleDownloadExistingQR(table) {
    const url =
      table.qr_url ||
      (table.qr_token ? `${window.location.origin}/#table_token=${table.qr_token}` : "");
    setStandeeData({
      table_number: table.table_number,
      qr_url: url,
      qr_token: table.qr_token,
    });
  }

  // 2. Explicitly Regenerate New QR & Token
  async function handleRegenerateQR(table) {
    if (
      !window.confirm(
        `Are you sure you want to GENERATE A NEW QR & TOKEN for Table ${table.table_number}?\n\n⚠️ The existing printed QR standee will STOP working immediately and customers will need the new QR.`
      )
    ) {
      return;
    }

    try {
      const data = await adminRegenerateQR(token, table.id);
      const result = {
        table_number: data.table_number,
        qr_token: data.qr_token,
        qr_url: data.qr_url,
      };
      setStandeeData(result);
      setMsg({
        type: "success",
        text: `New QR token generated for Table ${table.table_number}. Please reprint the new standee.`,
      });
      load();
    } catch (e) {
      setMsg({ type: "error", text: "QR regeneration failed." });
    }
  }

  async function handleDelete(table) {
    if (
      !window.confirm(
        `Permanently remove Table ${table.table_number} (${table.id})?`
      )
    )
      return;
    try {
      await adminDeleteTable(token, table.id);
      setMsg({
        type: "success",
        text: `Table ${table.table_number} deleted.`,
      });
      load();
    } catch (e) {
      setMsg({
        type: "error",
        text: e.response?.data?.detail || "Delete failed.",
      });
    }
  }

  function copyUrl(text, tableId) {
    navigator.clipboard.writeText(text);
    setCopiedId(tableId);
    setTimeout(() => setCopiedId(null), 2000);
  }

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
          <h1 className="ap-title">Tables &amp; QR Standee Management</h1>
          <p className="ap-sub">
            {tables.length} table{tables.length !== 1 ? "s" : ""} configured &bull; Direct customer URLs &amp; printable standees
          </p>
        </div>
      </div>

      {msg.text && (
        <div
          className={`ap-${msg.type}`}
          onClick={() => setMsg({ type: "", text: "" })}
        >
          {msg.text}
        </div>
      )}

      {/* ── Create Table Box ── */}
      <div className="ap-card" style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "17px",
            color: "var(--cafe-text-main)",
            margin: "0 0 8px",
          }}
        >
          Register New Table
        </h3>
        <p
          style={{
            fontSize: "13px",
            color: "var(--cafe-text-muted)",
            marginBottom: 14,
          }}
        >
          Creates a table with sequential system ID (e.g. Table 1 &rarr;{" "}
          <code>table-001</code>) and generates its permanent QR ordering URL.
        </p>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            className="ap-input"
            type="number"
            min="1"
            placeholder="Table number (e.g. 1)"
            value={newNum}
            onChange={(e) => setNewNum(e.target.value)}
            style={{ width: "190px" }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button
            className="ap-btn ap-btn-primary"
            onClick={handleCreate}
            disabled={creating}
          >
            <Plus size={15} />
            <span>
              {creating ? "Generating Table…" : "Add Table & Generate Standee"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Tables Directory ── */}
      {loading ? (
        <div className="ap-empty">
          <div className="ap-spinner" />
        </div>
      ) : tables.length === 0 ? (
        <div className="ap-empty">
          <Grid
            size={32}
            strokeWidth={1.5}
            style={{ opacity: 0.3, marginBottom: 8 }}
          />
          <p>No tables configured. Create your first table above.</p>
        </div>
      ) : (
        <div className="ap-card" style={{ padding: 0, overflow: "visible" }}>
          <table className="ap-table" style={{ overflow: "visible" }}>
            <thead>
              <tr>
                <th style={{ width: "110px" }}>Table</th>
                <th style={{ width: "110px" }}>System ID</th>
                <th style={{ width: "100px" }}>Status</th>
                <th>Customer Ordering URL</th>
                <th style={{ textAlign: "right", minWidth: "250px" }}>
                  QR Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table) => {
                const customerUrl =
                  table.qr_url ||
                  (table.qr_token
                    ? `${window.location.origin}/#table_token=${table.qr_token}`
                    : "");
                const isMenuOpen = activeMenuId === table.id;

                return (
                  <tr key={table.id}>
                    {/* Table Name */}
                    <td>
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontWeight: 700,
                          color: "var(--cafe-text-main)",
                          fontSize: "15.5px",
                        }}
                      >
                        Table {table.table_number}
                      </span>
                    </td>

                    {/* System ID */}
                    <td>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          color: "var(--cafe-roast-primary)",
                          backgroundColor: "var(--cafe-peach-light)",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          border: "1px solid var(--cafe-peach-border)",
                        }}
                      >
                        {table.id}
                      </span>
                    </td>

                    {/* Active/Inactive Toggle */}
                    <td>
                      <button
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          background: table.is_active
                            ? "rgba(63, 112, 77, 0.1)"
                            : "rgba(160, 61, 61, 0.1)",
                          border: `1px solid ${table.is_active
                              ? "rgba(63, 112, 77, 0.3)"
                              : "rgba(160, 61, 61, 0.3)"
                            }`,
                          color: table.is_active
                            ? "var(--cafe-status-ready)"
                            : "var(--cafe-status-cancelled)",
                          borderRadius: "var(--radius-full)",
                          padding: "3px 10px",
                          fontSize: "11.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onClick={() => toggleActive(table)}
                        title="Click to toggle active state"
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: table.is_active
                              ? "var(--cafe-status-ready)"
                              : "var(--cafe-status-cancelled)",
                          }}
                        />
                        <span>{table.is_active ? "Active" : "Disabled"}</span>
                      </button>
                    </td>

                    {/* Live Customer Menu URL in Admin Page */}
                    <td>
                      {customerUrl ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            maxWidth: "420px",
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              backgroundColor: "#FFFFFF",
                              border: "1px solid var(--cafe-border)",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontFamily: "var(--font-mono)",
                              fontSize: "11px",
                              color: "var(--cafe-roast-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={customerUrl}
                          >
                            {customerUrl}
                          </div>

                          <button
                            type="button"
                            className="ap-btn ap-btn-ghost"
                            style={{ padding: "4px 7px", height: "26px" }}
                            onClick={() => copyUrl(customerUrl, table.id)}
                            title="Copy customer menu link"
                          >
                            {copiedId === table.id ? (
                              <Check size={13} color="#3F704D" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>

                          <a
                            href={customerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="ap-btn ap-btn-ghost"
                            style={{
                              padding: "4px 7px",
                              height: "26px",
                              display: "inline-flex",
                              alignItems: "center",
                              textDecoration: "none",
                            }}
                            title="Open Customer Menu in new tab"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--cafe-text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          No active token
                        </span>
                      )}
                    </td>

                    {/* Separate Action: Download Existing QR vs Generate New QR */}
                    <td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          position: "relative",
                        }}
                      >
                        {/* 1. Primary Action: Download Existing QR without resetting */}
                        <button
                          type="button"
                          className="ap-btn ap-btn-primary"
                          style={{ padding: "5px 11px", fontSize: "12px" }}
                          onClick={() => handleDownloadExistingQR(table)}
                          title="Download or Print existing QR Standee without changing the token"
                        >
                          <Download size={13} />
                          <span>Download QR Standee</span>
                        </button>

                        {/* 2. Options Dropdown Menu Button */}
                        <div style={{ position: "relative" }}>
                          <button
                            type="button"
                            className="ap-btn ap-btn-ghost"
                            style={{
                              padding: "5px 7px",
                              border: "1px solid var(--cafe-border)",
                              backgroundColor: "#FFFFFF",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : table.id);
                            }}
                            title="More Table & QR Options"
                          >
                            <ChevronDown size={14} />
                          </button>

                          {/* Dropdown Menu Popup */}
                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "100%",
                                marginTop: "4px",
                                width: "230px",
                                backgroundColor: "#FAF6F0",
                                border: "1.5px solid var(--cafe-border-dark)",
                                borderRadius: "10px",
                                boxShadow: "0 8px 24px rgba(42, 23, 16, 0.2)",
                                zIndex: 100,
                                padding: "6px",
                                textAlign: "left",
                              }}
                            >
                              <div
                                style={{
                                  padding: "6px 10px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.06em",
                                  color: "var(--cafe-text-muted)",
                                  borderBottom: "1px solid var(--cafe-border)",
                                  marginBottom: "4px",
                                }}
                              >
                                Table {table.table_number} Options
                              </div>

                              {/* Option A: Download Old / Existing QR */}
                              <button
                                type="button"
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "8px 10px",
                                  background: "none",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "12.5px",
                                  fontWeight: 600,
                                  color: "var(--cafe-text-main)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "#EFE6D8")
                                }
                                onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                                }
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleDownloadExistingQR(table);
                                }}
                              >
                                <Printer size={14} color="var(--cafe-roast-primary)" />
                                <span>Download Old / Existing QR</span>
                              </button>

                              {/* Option B: Explicitly Generate New QR & Token */}
                              <button
                                type="button"
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "8px 10px",
                                  background: "none",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "12.5px",
                                  fontWeight: 600,
                                  color: "var(--cafe-terracotta)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "rgba(140, 72, 53, 0.08)")
                                }
                                onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                                }
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleRegenerateQR(table);
                                }}
                              >
                                <RefreshCw size={14} />
                                <span>Generate New QR &amp; Token</span>
                              </button>

                              <div
                                style={{
                                  height: "1px",
                                  backgroundColor: "var(--cafe-border)",
                                  margin: "4px 0",
                                }}
                              />

                              {/* Option C: Delete Table */}
                              <button
                                type="button"
                                style={{
                                  width: "100%",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "8px 10px",
                                  background: "none",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "12.5px",
                                  fontWeight: 600,
                                  color: "#A03D3D",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                                onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "rgba(160, 61, 61, 0.08)")
                                }
                                onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "transparent")
                                }
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleDelete(table);
                                }}
                              >
                                <Trash2 size={14} />
                                <span>Delete Table</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Printable Standee & PDF Modal ── */}
      {standeeData && (
        <TableStandeeModal
          tableNumber={standeeData.table_number}
          qrUrl={standeeData.qr_url}
          qrToken={standeeData.qr_token}
          onClose={() => setStandeeData(null)}
        />
      )}
    </div>
  );
}
