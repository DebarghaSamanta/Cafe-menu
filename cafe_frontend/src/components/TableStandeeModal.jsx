import { useEffect, useState, useRef } from "react";
import { generateQRCodeSVG, drawQRCodeToCanvas } from "../utils/qrGenerator";
import { Printer, Download, X, Coffee, Sparkles } from "lucide-react";
import "./TableStandeeModal.css";

export default function TableStandeeModal({ tableNumber, qrUrl, qrToken, onClose }) {
  const [qrSvg, setQrSvg] = useState("");
  const cardRef = useRef(null);

  const formattedNum = String(tableNumber).padStart(2, "0");

  useEffect(() => {
    let isMounted = true;
    if (qrUrl) {
      generateQRCodeSVG(qrUrl, 220, "#2A1710", "#FFFFFF").then((svg) => {
        if (isMounted) setQrSvg(svg);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [qrUrl]);

  function handlePrint() {
    window.print();
  }

  async function handleDownloadPNG() {
    const canvas = document.createElement("canvas");
    const width = 800;
    const height = 1100;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Background Cream Parchment
    ctx.fillStyle = "#F7F3EC";
    ctx.fillRect(0, 0, width, height);

    // Outer and Inner European borders
    ctx.strokeStyle = "#4E2A1F";
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    ctx.strokeStyle = "#C9BBA7";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Brand Title
    ctx.fillStyle = "#2A1710";
    ctx.font = "bold 44px 'Playfair Display', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("The Artisan Café", width / 2, 120);

    // Subtitle
    ctx.fillStyle = "#85746C";
    ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
    ctx.letterSpacing = "4px";
    ctx.fillText("FINE COFFEE & BISTRO • TABLE SERVICE", width / 2, 155);

    // Table Badge
    ctx.fillStyle = "#4E2A1F";
    ctx.fillRect(width / 2 - 140, 200, 280, 70);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 32px 'Playfair Display', Georgia, serif";
    ctx.fillText(`TABLE  ${formattedNum}`, width / 2, 248);

    // Draw QR Code in Center
    const qrCanvas = document.createElement("canvas");
    await drawQRCodeToCanvas(qrCanvas, qrUrl, 380, "#2A1710", "#FFFFFF");

    // QR White Box Container with subtle shadow border
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(width / 2 - 210, 320, 420, 420);
    ctx.strokeStyle = "#E2D7C8";
    ctx.lineWidth = 2;
    ctx.strokeRect(width / 2 - 210, 320, 420, 420);

    // Draw the QR
    ctx.drawImage(qrCanvas, width / 2 - 190, 340);

    // Scan Instruction
    ctx.fillStyle = "#2A1710";
    ctx.font = "bold 20px 'Playfair Display', Georgia, serif";
    ctx.fillText("Scan with Camera to Order", width / 2, 800);

    ctx.fillStyle = "#6B564E";
    ctx.font = "14px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("Browse our freshly prepared menu & place your order directly", width / 2, 835);

    // Divider
    ctx.strokeStyle = "#E2D7C8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 180, 880);
    ctx.lineTo(width / 2 + 180, 880);
    ctx.stroke();

    // Footer
    ctx.fillStyle = "#85746C";
    ctx.font = "12px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("FREE WI-FI • CONTACTLESS ORDERING • CRAFTED WITH CARE", width / 2, 920);

    // Download trigger
    const link = document.createElement("a");
    link.download = `table-${formattedNum}-qr-standee.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="ts-modal-overlay" onClick={onClose}>
      <div className="ts-modal-box" onClick={e => e.stopPropagation()}>
        {/* Modal Controls Topbar (hidden during print) */}
        <div className="ts-modal-topbar">
          <div>
            <h3 className="ts-modal-heading">Table {tableNumber} — QR Standee Card</h3>
            <p className="ts-modal-sub">Ready to print as a table tent card or download as image</p>
          </div>

          <div className="ts-topbar-actions">
            <button className="ap-btn ap-btn-ghost" onClick={handleDownloadPNG} title="Download High-Res PNG Standee">
              <Download size={15} />
              <span>Download PNG</span>
            </button>
            <button className="ap-btn ap-btn-primary" onClick={handlePrint} title="Print or Save as PDF">
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>
            <button className="ap-btn ap-btn-ghost" style={{ padding: "8px 10px" }} onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Standee Card Surface */}
        <div className="ts-print-area">
          <div className="ts-standee-card" ref={cardRef}>
            {/* Outer European Bistro Double Border */}
            <div className="ts-inner-border">
              <div className="ts-card-header">
                <div className="ts-brand-icon">
                  <Coffee size={20} strokeWidth={1.8} />
                </div>
                <h1 className="ts-cafe-name">The Artisan Café</h1>
                <span className="ts-cafe-sub">FINE COFFEE &bull; BISTRO &bull; TABLE SERVICE</span>
              </div>

              {/* Table Number Ribbon */}
              <div className="ts-table-badge">
                <span>TABLE {formattedNum}</span>
              </div>

              {/* QR Code Container */}
              <div className="ts-qr-wrapper">
                {qrSvg ? (
                  <div
                    className="ts-qr-svg"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="ap-spinner" style={{ margin: "40px auto" }} />
                )}
              </div>

              {/* Instruction */}
              <div className="ts-instructions">
                <h2 className="ts-scan-title">Scan with Camera to Order</h2>
                <p className="ts-scan-desc">
                  Browse our freshly prepared menu &amp; place your order directly from your seat.
                </p>
              </div>

              <div className="ts-card-divider" />

              <div className="ts-card-footer">
                <span>FREE WI-FI &bull; CONTACTLESS ORDERING &bull; CRAFTED WITH CARE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
