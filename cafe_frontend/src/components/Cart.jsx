import { MAX_QUANTITY } from "../cart/cartReducer";


function formatPrice(paise) {
  return (paise / 100).toFixed(2);
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
}) {
  const isEmpty = items.length === 0;

  return (
    <aside className="cart-panel">

      <div className="cart-header">
        <div>
          <p className="eyebrow">
            Your order
          </p>

          <h2>Cart</h2>
        </div>

        {!isEmpty && (
          <button
            type="button"
            className="clear-cart-button"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>


      {isEmpty ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">
            🛒
          </div>

          <h3>Your cart is empty</h3>

          <p>
            Add some items from the menu
            to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="cart-items">

            {items.map((item) => (
              <div
                className="cart-item"
                key={item.id}
              >

                <div className="cart-item-info">
                  <h3>{item.name}</h3>

                  <p>
                    ₹
                    {formatPrice(
                      item.price_paise
                    )}{" "}
                    each
                  </p>

                  {!item.is_available && (
                    <span className="cart-warning">
                      Currently unavailable
                    </span>
                  )}

                  <button
                    type="button"
                    className="remove-item-button"
                    onClick={() =>
                      onRemove(item.id)
                    }
                  >
                    Remove
                  </button>
                </div>


                <div className="cart-item-actions">

                  <div className="quantity-controls">

                    <button
                      type="button"
                      onClick={() =>
                        onDecrease(item.id)
                      }
                      disabled={
                        item.quantity <= 1
                      }
                      aria-label={`Decrease ${item.name}`}
                    >
                      −
                    </button>

                    <span>
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onIncrease(item.id)
                      }
                      disabled={
                        item.quantity >=
                        MAX_QUANTITY
                      }
                      aria-label={`Increase ${item.name}`}
                    >
                      +
                    </button>

                  </div>

                  <strong>
                    ₹
                    {formatPrice(
                      item.price_paise *
                        item.quantity
                    )}
                  </strong>

                </div>

              </div>
            ))}

          </div>


          <div className="cart-summary">

            <div className="summary-row">
              <span>Subtotal</span>

              <strong>
                ₹
                {formatPrice(
                  subtotalPaise
                )}
              </strong>
            </div>

            <div className="summary-row total-row">
              <span>Total</span>

              <strong>
                ₹
                {formatPrice(totalPaise)}
              </strong>
            </div>

            <p className="cart-note">
              Taxes, discounts and order
              charges will be handled later.
            </p>


            <button
              type="button"
              className="proceed-button"
              disabled={isEmpty}
              onClick={onProceed}
            >
              Continue
            </button>

            {message && (
              <p
                className="cart-message"
                aria-live="polite"
              >
                {message}
              </p>
            )}

          </div>
        </>
      )}

    </aside>
  );
}

export default Cart;