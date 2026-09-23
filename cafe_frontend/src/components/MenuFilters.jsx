function MenuFilters({
  categories,
  selectedCategory,
  setSelectedCategory,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  availability,
  setAvailability,
}) {
  return (
    <section className="filters">
      <div className="filter-group">
        <label htmlFor="category">Category</label>

        <select
          id="category"
          value={selectedCategory}
          onChange={(event) =>
            setSelectedCategory(event.target.value)
          }
        >
          <option value="all">All categories</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="minPrice">Min price (₹)</label>

        <input
          id="minPrice"
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          value={minPrice}
          onChange={(event) =>
            setMinPrice(event.target.value)
          }
        />
      </div>

      <div className="filter-group">
        <label htmlFor="maxPrice">Max price (₹)</label>

        <input
          id="maxPrice"
          type="number"
          min="0"
          step="0.01"
          placeholder="Any"
          value={maxPrice}
          onChange={(event) =>
            setMaxPrice(event.target.value)
          }
        />
      </div>

      <div className="filter-group">
        <label htmlFor="availability">
          Availability
        </label>

        <select
          id="availability"
          value={availability}
          onChange={(event) =>
            setAvailability(event.target.value)
          }
        >
          <option value="all">All</option>
          <option value="available">Available</option>
          <option value="unavailable">
            Unavailable
          </option>
        </select>
      </div>
    </section>
  );
}

export default MenuFilters;