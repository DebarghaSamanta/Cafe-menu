import { Plus, Minus, AlertCircle } from "lucide-react";
import { MAX_QUANTITY } from "../cart/cartReducer";

function MenuItemCard({
  item,
  onAddToCart,
  onIncrease,
  onDecrease,
  cartQuantity = 0,
}) {
  const stock = item.stock_quantity !== undefined && item.stock_quantity !== null ? item.stock_quantity : 50;
  const isAvailable = Boolean(item.is_available) && stock > 0;
  const maxAllowed = Math.min(MAX_QUANTITY, stock);
  const isAtMaximum = cartQuantity >= maxAllowed;

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
            <span className="mp-status-indicator unavail" style={{ fontWeight: 600, color: "#A03D3D" }}>
              ○ Out of Stock
            </span>
          ) : stock <= 5 ? (
            <span
              className="mp-status-indicator"
              style={{
                color: "#C26D24",
                backgroundColor: "rgba(194, 109, 36, 0.1)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: 700,
                fontSize: "11.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              ● Only {stock} left!
            </span>
          ) : (
            <span className="mp-status-indicator avail" style={{ fontWeight: 600, color: "#2D5237" }}>
              ● In Stock ({stock})
            </span>
          )}
        </div>

        {isAvailable ? (
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
                onClick={() => onAddToCart(item)}
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add</span>
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