import { Plus, Minus, AlertCircle } from "lucide-react";
import { MAX_QUANTITY } from "../cart/cartReducer";

function MenuItemCard({
  item,
  onAddToCart,
  onCustomize,
  onIncrease,
  onDecrease,
  cartQuantity = 0,
  isExploreMode = false,
}) {
  const stock = item.stock_quantity !== undefined && item.stock_quantity !== null ? item.stock_quantity : 50;
  const isAvailable = Boolean(item.is_available) && stock > 0;
  const maxAllowed = Math.min(MAX_QUANTITY, stock);
  const isAtMaximum = cartQuantity >= maxAllowed;
  const isCustomizable = (item.customization_groups?.length ?? 0) > 0;

  return (
    <article className={`mp-card ${!isAvailable ? "unavailable" : ""}`}>
      <div>
        <div className="mp-card-top">
          <div>
            <h3 className="mp-item-name">{item.name}</h3>
            <span className="mp-item-cat">{item.category}</span>
          </div>
          <div className="mp-item-price">
            ₹{Number(item.price).toFixed(2)}
          </div>
        </div>

        <p className="mp-item-desc">
          {item.description || "Crafted fresh to order by our artisan baristas and culinary team."}
        </p>
      </div>

      <div className="mp-card-bottom">
        <div>
          {!isAvailable ? (
            <span className="mp-status-indicator unavail" style={{ fontWeight: 600, color: "#993B3B" }}>
              ○ Out of Stock
            </span>
          ) : isExploreMode ? (
            <span className="mp-status-indicator avail" style={{ fontWeight: 600, color: "#3D6A49" }}>
              ● Available for Dine-in
            </span>
          ) : stock <= 5 ? (
            <span
              className="mp-status-indicator"
              style={{
                color: "#B66F24",
                backgroundColor: "rgba(182, 111, 36, 0.08)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: 600,
                fontSize: "11.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              ● Only {stock} left!
            </span>
          ) : (
            <span className="mp-status-indicator avail" style={{ fontWeight: 600, color: "#3D6A49" }}>
              ● In Stock
            </span>
          )}
        </div>

        {isExploreMode ? (
          <div className="mp-explore-tag">
            <span>Dine-in Order via QR</span>
          </div>
        ) : isAvailable ? (
          <div>
            {cartQuantity > 0 ? (
              <div className="mp-stepper">
                <button
                  type="button"
                  className="mp-step-btn"
                  onClick={() => (onDecrease ? onDecrease(item.id) : null)}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="mp-step-qty">{cartQuantity}</span>
                <button
                  type="button"
                  className="mp-step-btn"
                  disabled={isAtMaximum}
                  onClick={() =>
                    onIncrease ? onIncrease(item.id) : onAddToCart(item)
                  }
                  aria-label="Increase quantity"
                  title={isAtMaximum ? `Maximum available stock: ${stock}` : "Add more"}
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="mp-add-btn"
                onClick={() =>
                  isCustomizable && onCustomize
                    ? onCustomize(item)
                    : onAddToCart(item)
                }
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>{isCustomizable ? "Customize" : "Add"}</span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="mp-add-btn"
            disabled
            style={{ opacity: 0.5, cursor: "not-allowed", backgroundColor: "#D6C8B8" }}
          >
            <span>Sold Out</span>
          </button>
        )}
      </div>
    </article>
  );
}

export default MenuItemCard;