export const MAX_QUANTITY = 10;

export const initialCartState = {
  items: [],
};


function buildCustomizationKey(customizations = []) {
  return customizations
    .map((c) => `${c.group_id}:${c.choices.map((ch) => ch.id).sort().join(",")}`)
    .sort()
    .join("|");
}

function normalizeCartItem(item) {
  const price = Number(
    item.unit_price_paise !== undefined
      ? item.unit_price_paise / 100
      : item.price
  );

  if (
    !item.id ||
    !item.name ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return null;
  }

  const customizations = item.customizations || [];

  return {
    id: item.id,
    lineId: `${item.id}::${buildCustomizationKey(customizations)}`,
    name: item.name,
    category: item.category,
    price_paise: Math.round(price * 100),
    is_available: Boolean(item.is_available),
    customizations,
  };
}


export function cartReducer(state, action) {
  switch (action.type) {

    // ---------------------------------------------
    // ADD ITEM
    // ---------------------------------------------

    case "ADD_ITEM": {
      const item = normalizeCartItem(action.payload);

      if (!item || !item.is_available) {
        return state;
      }

      const existingItem = state.items.find(
        (cartItem) => cartItem.lineId === item.lineId
      );

      // Item does not exist in cart yet.
      if (!existingItem) {
        return {
          ...state,
          items: [
            ...state.items,
            {
              ...item,
              quantity: 1,
            },
          ],
        };
      }

      // Already at maximum.
      if (
        existingItem.quantity >= MAX_QUANTITY
      ) {
        return state;
      }

      // Merge duplicate item.
      return {
        ...state,
        items: state.items.map((cartItem) =>
          cartItem.lineId === item.lineId
            ? {
                ...cartItem,
                quantity:
                  cartItem.quantity + 1,
              }
            : cartItem
        ),
      };
    }


    // ---------------------------------------------
    // INCREASE QUANTITY
    // ---------------------------------------------

    case "INCREASE_ITEM": {
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.lineId !== action.itemId) {
            return item;
          }

          if (
            item.quantity >= MAX_QUANTITY
          ) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity + 1,
          };
        }),
      };
    }


    // ---------------------------------------------
    // DECREASE QUANTITY
    // ---------------------------------------------

    case "DECREASE_ITEM": {
      return {
        ...state,
        items: state.items.map((item) => {
          if (item.lineId !== action.itemId) {
            return item;
          }

          if (item.quantity <= 1) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity - 1,
          };
        }),
      };
    }


    // ---------------------------------------------
    // REMOVE ITEM
    // ---------------------------------------------

    case "REMOVE_ITEM": {
      return {
        ...state,
        items: state.items.filter(
          (item) =>
            item.lineId !== action.itemId
        ),
      };
    }


    // ---------------------------------------------
    // CLEAR CART
    // ---------------------------------------------

    case "CLEAR_CART": {
      return initialCartState;
    }


    default:
      return state;
  }
}