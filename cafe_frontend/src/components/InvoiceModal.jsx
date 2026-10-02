import { useRef } from "react";
import { Printer, Download, X, Coffee, CheckCircle2 } from "lucide-react";
import "./InvoiceModal.css";

function fmt(paise) {
  return `₹${((paise || 0) / 100).toFixed(2)}`;
}

export default function InvoiceModal({ invoice, order, onClose }) {
  const invoiceRef = useRef(null);

  // Normalize data either from backend invoice schema or fallback order
  const data = invoice || order;
  if (!data) return null;

  const invoiceNumber = data.invoice_number || `INV-${(data.id || data.order_id || "").slice(-8).toUpperCase()}`;
  const cafeInfo = data.cafe_info || {
    name: "The Artisan Café",
    tagline: "Artisan European Bistro & Roastery",
    address: "18 Park Street, Heritage Block, Kolkata 700016",
    phone: "+91 98765 43210",
    email: "service@theartisancafe.com",
    gstin: "19AABCT1332L1Z9",
    fssai: "10019022009876",
  };

  const timestamp = data.completed_at || data.created_at || Date.now();
  const orderDate = new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const subtotalPaise = data.subtotal_paise ?? data.total_paise ?? 0;
  const cgstPaise = data.cgst_paise ?? Math.round(subtotalPaise * 0.025);
  const sgstPaise = data.sgst_paise ?? Math.round(subtotalPaise * 0.025);
  const taxPaise = data.tax_paise ?? (cgstPaise + sgstPaise);
  const totalPaise = data.total_paise ?? (subtotalPaise + taxPaise);
  const subtotalFormatted = fmt(subtotalPaise);
  const grandTotal = fmt(totalPaise);
  const paymentMethodName = (data.payment_method || "Cash Settlement").toUpperCase();
  const paymentStatus = data.payment_status || "PAID";
  const items = data.items || [];

  function handlePrint() {
    window.print();
  }

  function handleDownloadPNG() {
    const canvas = document.createElement("canvas");
    const width = 800;
    const height = Math.max(1150, 500 + (items.length * 38) + 360);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Background Parchment
    ctx.fillStyle = "#FAF6F0";
    ctx.fillRect(0, 0, width, height);

    // Outer & Inner Borders
    ctx.strokeStyle = "#4E2A1F";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    ctx.strokeStyle = "#C9BBA7";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Header
    ctx.fillStyle = "#2A1710";
    ctx.font = "bold 36px 'Playfair Display', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(cafeInfo.name, width / 2, 95);

    ctx.fillStyle = "#85746C";
    ctx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText("OFFICIAL TAX INVOICE & RECEIPT", width / 2, 120);

    ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
    ctx.letterSpacing = "0.5px";
    ctx.fillText(`${cafeInfo.address} • Ph: ${cafeInfo.phone}`, width / 2, 140);
    ctx.fillText(`GSTIN: ${cafeInfo.gstin} • FSSAI: ${cafeInfo.fssai}`, width / 2, 158);

    // Meta Box
    ctx.fillStyle = "#F3EBE1";
    ctx.fillRect(60, 180, width - 120, 85);
    ctx.strokeStyle = "#E2D7C8";
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 180, width - 120, 85);

    ctx.textAlign = "left";
    ctx.fillStyle = "#4A3A34";
    ctx.font = "13.5px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(`Invoice No: ${invoiceNumber}`, 80, 215);
    ctx.fillText(`Date & Time: ${orderDate}`, 80, 242);

    ctx.textAlign = "right";
    ctx.fillText(`Table: Table ${data.table_number}`, width - 80, 215);
    ctx.fillText(`Payment: ${paymentMethodName}`, width - 80, 242);

    // Items Header
    ctx.fillStyle = "#4E2A1F";
    ctx.fillRect(60, 285, width - 120, 35);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ITEM DESCRIPTION", 80, 308);
    ctx.textAlign = "center";
    ctx.fillText("QTY", 480, 308);
    ctx.textAlign = "right";
    ctx.fillText("RATE", 600, 308);
    ctx.fillText("AMOUNT", width - 80, 308);

    // Item Rows
    let y = 350;
    ctx.fillStyle = "#2A1710";
    ctx.font = "14px 'Plus Jakarta Sans', sans-serif";

    items.forEach((item) => {
      ctx.textAlign = "left";
      ctx.fillText(item.name, 80, y);
      ctx.textAlign = "center";
      ctx.fillText(`×${item.quantity}`, 480, y);
      ctx.textAlign = "right";
      ctx.fillText(fmt(item.unit_price_paise), 600, y);
      ctx.fillText(fmt(item.line_total_paise), width - 80, y);
      y += 35;
    });

    // Divider
    ctx.strokeStyle = "#E2D7C8";
    ctx.beginPath();
    ctx.moveTo(60, y + 10);
    ctx.lineTo(width - 60, y + 10);
    ctx.stroke();

    // Summary with 5% GST breakdown
    y += 40;
    ctx.textAlign = "right";
    ctx.font = "14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#6B564E";
    ctx.fillText("Subtotal (Tax Exclusive):", width - 200, y);
    ctx.fillText(subtotalFormatted, width - 80, y);

    y += 26;
    ctx.fillText("CGST @ 2.5%:", width - 200, y);
    ctx.fillText(fmt(cgstPaise), width - 80, y);

    y += 26;
    ctx.fillText("SGST @ 2.5%:", width - 200, y);
    ctx.fillText(fmt(sgstPaise), width - 80, y);

    y += 28;
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#4E2A1F";
    ctx.fillText("Total GST (5%):", width - 200, y);
    ctx.fillText(fmt(taxPaise), width - 80, y);

    y += 42;
    ctx.fillStyle = "#2A1710";
    ctx.font = "bold 26px 'Playfair Display', Georgia, serif";
    ctx.fillText("Grand Total:", width - 220, y);
    ctx.fillStyle = "#8C4835";
    ctx.fillText(grandTotal, width - 80, y);

    // Paid Stamp
    ctx.strokeStyle = "#3F704D";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(80, y - 55, 180, 50);
    ctx.fillStyle = "#3F704D";
    ctx.font = "bold 15px 'Playfair Display', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("PAID & SETTLED", 170, y - 23);

    // Footer note
    ctx.textAlign = "center";
    ctx.fillStyle = "#85746C";
    ctx.font = "italic 13px 'Playfair Display', Georgia, serif";
    ctx.fillText(`Thank you for dining with us at ${cafeInfo.name}.`, width / 2, height - 95);
    ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("AUTHENTIC EUROPEAN CRAFT • FRESHLY ROASTED", width / 2, height - 70);

    // Trigger download
    const link = document.createElement("a");
    link.download = `${invoiceNumber}-invoice.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="inv-modal-overlay" onClick={onClose}>
      <div className="inv-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Topbar Controls */}
        <div className="inv-modal-topbar">
          <div>
            <h3 className="inv-modal-heading">Tax Invoice &amp; Receipt</h3>
            <p className="inv-modal-sub">{invoiceNumber} &bull; Table {data.table_number}</p>
          </div>

          <div className="inv-topbar-actions">
            <button className="ap-btn ap-btn-ghost" onClick={handleDownloadPNG} title="Download PNG Receipt">
              <Download size={15} />
              <span>Download PNG</span>
            </button>
            <button className="ap-btn ap-btn-primary" onClick={handlePrint} title="Print or Save PDF">
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>
            <button className="ap-btn ap-btn-ghost" style={{ padding: "8px 10px" }} onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas */}
        <div className="inv-print-area">
          <div className="inv-receipt-card" ref={invoiceRef}>
            <div className="inv-inner-border">
              {/* Header */}
              <div className="inv-header">
                <div className="inv-brand-icon">
                  <Coffee size={20} strokeWidth={1.8} />
                </div>
                <h1 className="inv-cafe-name">{cafeInfo.name}</h1>
                <span className="inv-cafe-sub">{cafeInfo.tagline}</span>
                <div style={{ fontSize: "9px", color: "#85746C", marginTop: 4, lineHeight: 1.4 }}>
                  <div>{cafeInfo.address}</div>
                  <div>Ph: {cafeInfo.phone} &bull; {cafeInfo.email}</div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>GSTIN: {cafeInfo.gstin} | FSSAI: {cafeInfo.fssai}</div>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="inv-meta-box">
                <div className="inv-meta-row">
                  <span className="inv-meta-lbl">Invoice No:</span>
                  <span className="inv-meta-val">{invoiceNumber}</span>
                </div>
                <div className="inv-meta-row">
                  <span className="inv-meta-lbl">Table:</span>
                  <span className="inv-meta-val" style={{ fontWeight: 700 }}>Table {data.table_number}</span>
                </div>
                <div className="inv-meta-row">
                  <span className="inv-meta-lbl">Date &amp; Time:</span>
                  <span className="inv-meta-val">{orderDate}</span>
                </div>
                <div className="inv-meta-row">
                  <span className="inv-meta-lbl">Payment Mode:</span>
                  <span className="inv-meta-val" style={{ textTransform: "uppercase" }}>{paymentMethodName}</span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="inv-table-wrap">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: "center", width: "45px" }}>Qty</th>
                      <th style={{ textAlign: "right", width: "75px" }}>Rate</th>
                      <th style={{ textAlign: "right", width: "75px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td style={{ textAlign: "center" }}>&times;{item.quantity}</td>
                        <td style={{ textAlign: "right" }}>{fmt(item.unit_price_paise)}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(item.line_total_paise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals with 5% GST */}
              <div className="inv-totals-box">
                <div className="inv-total-row">
                  <span>Subtotal:</span>
                  <span>{subtotalFormatted}</span>
                </div>
                <div className="inv-total-row" style={{ fontSize: "11px", color: "var(--cafe-text-muted)" }}>
                  <span>CGST (2.5%):</span>
                  <span>{fmt(cgstPaise)}</span>
                </div>
                <div className="inv-total-row" style={{ fontSize: "11px", color: "var(--cafe-text-muted)" }}>
                  <span>SGST (2.5%):</span>
                  <span>{fmt(sgstPaise)}</span>
                </div>
                <div className="inv-total-row" style={{ fontWeight: 600, color: "var(--cafe-text-main)", borderTop: "1px dotted var(--cafe-border)", paddingTop: 4 }}>
                  <span>Total GST (5%):</span>
                  <span>{fmt(taxPaise)}</span>
                </div>
                <div className="inv-grand-row">
                  <span>Grand Total Paid:</span>
                  <span className="inv-grand-amount">{grandTotal}</span>
                </div>
              </div>

              {/* Verified Stamp & Footer */}
              <div className="inv-footer-area">
                <div className="inv-paid-stamp">
                  <CheckCircle2 size={16} />
                  <span>PAID &bull; SETTLED</span>
                </div>

                <p className="inv-thankyou">Thank you for dining with us at {cafeInfo.name}!</p>
                <p className="inv-motto">AUTHENTIC EUROPEAN CRAFT &bull; FRESHLY ROASTED</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
