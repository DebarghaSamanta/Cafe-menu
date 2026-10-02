import { Coffee } from "lucide-react";

function TableHeader({ tableNumber }) {
  const formattedNum = String(tableNumber || 1).padStart(2, "0");

  return (
    <header className="mp-navbar">
      <div className="mp-container mp-nav-inner">
        <div className="mp-brand-group">
          <div className="mp-brand-icon">
            <Coffee size={22} strokeWidth={2} />
          </div>
          <div>
            <h1 className="mp-brand-title">The Artisan Café</h1>
            <span className="mp-brand-sub">18 Park Street, Kolkata &bull; Table Service</span>
          </div>
        </div>

        <div className="mp-nav-actions">
          <div className="mp-table-pill">
            <span>TABLE {formattedNum}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TableHeader;