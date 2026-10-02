export const MAX_QUANTITY = 10;

export const initialCartState = {
  items: [],
};


function normalizeCartItem(item) {
  const price = Number(item.price);
  const stock = item.stock_quantity !== undefined && item.stock_quantity !== null ? item.stock_quantity : 50;

  if (
    !item.id ||
    !item.name ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price_paise: Math.round(price * 100),
    stock_quantity: stock,
    is_available: Boolean(item.is_available) && stock > 0,
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
        (cartItem) => cartItem.id === item.id
      );

      const maxAllowed = Math.min(MAX_QUANTITY, item.stock_quantity);

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

      // Already at maximum available stock or hard limit.
      if (
        existingItem.quantity >= maxAllowed
      ) {
        return state;
      }

      // Merge duplicate item.
      return {
        ...state,
        items: state.items.map((cartItem) =>
          cartItem.id === item.id
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
          if (item.id !== action.itemId) {
            return item;
          }

          const maxAllowed = Math.min(MAX_QUANTITY, item.stock_quantity !== undefined ? item.stock_quantity : MAX_QUANTITY);

          if (
            item.quantity >= maxAllowed
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
          if (item.id !== action.itemId) {
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
            item.id !== action.itemId
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