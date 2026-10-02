import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

function MenuFilters({
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  availability,
  setAvailability,
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasAdvancedFilters = minPrice || maxPrice || availability !== "all";

  return (
    <section className="mp-filter-section">
      {/* ── Search Bar & Filter Toggle ── */}
      <div className="mp-search-row">
        <div className="mp-search-box">
          <Search size={18} className="mp-search-icon" />
          <input
            type="text"
            className="mp-search-input"
            placeholder="Search coffee, breakfast, bakery, mains..."
            value={searchQuery || ""}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: 12,
                background: "none",
                border: "none",
                color: "var(--cafe-text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          type="button"
          className={`mp-filter-toggle-btn ${showAdvanced || hasAdvancedFilters ? "active" : ""}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
        </button>
      </div>

      {/* ── Category Chips ── */}
      <div className="mp-category-scroll">
        <button
          type="button"
          className={`mp-cat-pill ${selectedCategory === "" || selectedCategory === "all" ? "active" : ""}`}
          onClick={() => setSelectedCategory("")}
        >
          All Items
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`mp-cat-pill ${selectedCategory === category ? "active" : ""}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* ── Advanced Filter Drawer ── */}
      {showAdvanced && (
        <div className="mp-advanced-filters">
          <div className="mp-filter-field">
            <label>Min Price (₹)</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              className="mp-filter-input"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
          </div>

          <div className="mp-filter-field">
            <label>Max Price (₹)</label>
            <input
              type="number"
              min="0"
              placeholder="Any"
              className="mp-filter-input"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>

          <div className="mp-filter-field">
            <label>Availability</label>
            <select
              className="mp-filter-input"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="all">All Items</option>
              <option value="available">In Stock Only</option>
              <option value="unavailable">Unavailable Only</option>
            </select>
          </div>

          {hasAdvancedFilters && (
            <button
              type="button"
              className="mp-filter-toggle-btn"
              style={{ fontSize: "12px", height: "38px" }}
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
                setAvailability("all");
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default MenuFilters;