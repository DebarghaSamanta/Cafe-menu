import { MAX_QUANTITY } from "../cart/cartReducer";


function MenuItemCard({
  item,
  onAddToCart,
  cartQuantity = 0,
}) {
  const isAtMaximum =
    cartQuantity >= MAX_QUANTITY;

  const addDisabled =
    !item.is_available ||
    isAtMaximum;

  let buttonText = "Add";

  if (!item.is_available) {
    buttonText = "Unavailable";
  } else if (isAtMaximum) {
    buttonText = "Limit reached";
  }

  return (
    <article
      className={`menu-card ${
        !item.is_available
          ? "menu-card-unavailable"
          : ""
      }`}
    >
      <div className="menu-card-content">

        <div className="menu-card-top">
          <div>
            <h3>{item.name}</h3>

            <span className="category-label">
              {item.category}
            </span>
          </div>

          <div className="price">
            ₹{Number(item.price).toFixed(2)}
          </div>
        </div>

        <p className="description">
          {item.description}
        </p>

        <div className="menu-card-bottom">

          <div>
            <span
              className={
                item.is_available
                  ? "availability available"
                  : "availability unavailable"
              }
            >
              {item.is_available
                ? "Available"
                : "Unavailable"}
            </span>

            {cartQuantity > 0 && (
              <span className="in-cart-label">
                {cartQuantity} in cart
              </span>
            )}
          </div>

          <button
            type="button"
            className="add-button"
            disabled={addDisabled}
            onClick={() =>
              onAddToCart(item)
            }
          >
            {buttonText}
          </button>

        </div>
      </div>
    </article>
  );
}

export default MenuItemCard;