import { Link } from "react-router-dom";
import ArtisanLogo from "./ArtisanLogo";

function TableHeader({ tableNumber }) {
  const isExploreMode = !tableNumber;
  const formattedNum = tableNumber ? String(tableNumber).padStart(2, "0") : null;

  return (
    <header className="mp-navbar">
      <div className="mp-container mp-nav-inner">
        <Link to="/" className="mp-brand-group" style={{ textDecoration: "none" }}>
          <div className="mp-brand-icon">
            <ArtisanLogo size={22} color="#FFFFFF" />
          </div>
          <div>
            <h1 className="mp-brand-title">The Artisan Café</h1>
            <span className="mp-brand-sub">18 Park Street, Kolkata</span>
          </div>
        </Link>

        <div className="mp-nav-actions">
          {isExploreMode ? (
            <div className="mp-table-pill mp-catalogue-pill">
              <span>MENU CATALOGUE</span>
            </div>
          ) : (
            <div className="mp-table-pill">
              <span>TABLE {formattedNum}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TableHeader;