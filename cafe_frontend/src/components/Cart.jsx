import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, Utensils } from "lucide-react";
import { MAX_QUANTITY } from "../cart/cartReducer";

function formatPrice(paise) {
  return `₹${((paise || 0) / 100).toFixed(2)}`;
}

function Cart({
  items,
  subtotalPaise,
  totalPaise,
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
  onProceed,
  message,
  isPlacingOrder = false,
}) {
  const isEmpty = items.length === 0;

  // 5% GST breakdown
  const cgstPaise = Math.round(subtotalPaise * 0.025);
  const sgstPaise = Math.round(subtotalPaise * 0.025);
  const taxPaise = cgstPaise + sgstPaise;
  const grandTotalPaise = subtotalPaise + taxPaise;

  return (
    <aside className="mp-cart-aside">
      <div className="mp-cart-head">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShoppingBag size={20} style={{ color: "var(--cafe-roast-primary)" }} />
          <h2 className="mp-cart-title">Your Order</h2>
        </div>

        {!isEmpty && (
          <button
            type="button"
            className="mp-btn-clear"
            style={{
              background: "none",
              border: "none",
              color: "var(--cafe-text-muted)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
            onClick={onClear}
          >
            Clear All
          </button>
        )}
      </div>

      {message && (
        <div
          style={{
            backgroundColor: "#FAF1E8",
            color: "var(--cafe-terracotta)",
            border: "1px solid #E8D3C1",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "12.5px",
            marginBottom: "12px",
          }}
        >
          {message}
        </div>
      )}

      {isEmpty ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "36px 12px",
            textAlign: "center",
            color: "var(--cafe-text-muted)",
          }}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              backgroundColor: "#F3EBE1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              color: "var(--cafe-text-muted)",
            }}
          >
            <Utensils size={24} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontSize: "16px", color: "var(--cafe-text-main)", marginBottom: 4 }}>
            Your cart is empty
          </h3>
          <p style={{ fontSize: "12.5px", maxWidth: "220px", lineHeight: 1.4 }}>
            Explore our curated menu &amp; add your favorite brews or dishes.
          </p>
        </div>
      ) : (
        <>
          <div className="mp-cart-items-list">
            {items.map((item) => {
              const lineKey = item.lineId || item.id;
              const isAtMax = item.quantity >= MAX_QUANTITY;
              return (
                <div key={lineKey} className="mp-cart-item-row">
                  <div className="mp-cart-item-info">
                    <div className="mp-cart-item-name">{item.name}</div>
                    {item.customizations?.length > 0 && (
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "var(--cafe-terracotta)",
                          fontStyle: "italic",
                          marginTop: "2px",
                        }}
                      >
                        {item.customizations
                          .flatMap((group) =>
                            group.choices.map((choice) => choice.label)
                          )
                          .join(", ")}
                      </div>
                    )}
                    <div className="mp-cart-item-rate">
                      {formatPrice(item.price_paise)} each &bull;{" "}
                      <strong>{formatPrice(item.price_paise * item.quantity)}</strong>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div className="mp-stepper" style={{ padding: "2px 6px" }}>
                      <button
                        type="button"
                        className="mp-step-btn"
                        style={{ width: 22, height: 22 }}
                        onClick={() => onDecrease(lineKey)}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="mp-step-qty" style={{ fontSize: "13px" }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="mp-step-btn"
                        style={{ width: 22, height: 22 }}
                        disabled={isAtMax}
                        onClick={() => onIncrease(lineKey)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--cafe-text-light)",
                        cursor: "pointer",
                        padding: 4,
                      }}
                      onClick={() => onRemove(lineKey)}
                      title="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mp-cart-totals">
            <div className="mp-totals-row">
              <span>Subtotal:</span>
              <span>{formatPrice(subtotalPaise)}</span>
            </div>
            <div className="mp-totals-row" style={{ fontSize: "11px", color: "var(--cafe-text-muted)" }}>
              <span>CGST (2.5%):</span>
              <span>{formatPrice(cgstPaise)}</span>
            </div>
            <div className="mp-totals-row" style={{ fontSize: "11px", color: "var(--cafe-text-muted)" }}>
              <span>SGST (2.5%):</span>
              <span>{formatPrice(sgstPaise)}</span>
            </div>
            <div className="mp-grand-total-row">
              <span>Grand Total:</span>
              <span style={{ color: "var(--cafe-terracotta)" }}>{formatPrice(grandTotalPaise)}</span>
            </div>
          </div>

          <button
            type="button"
            className="mp-checkout-btn"
            disabled={isPlacingOrder}
            onClick={onProceed}
          >
            <span>{isPlacingOrder ? "Sending Order..." : "Send Order to Kitchen"}</span>
            <ArrowRight size={16} />
          </button>
        </>
      )}
    </aside>
  );
}

export default Cart;