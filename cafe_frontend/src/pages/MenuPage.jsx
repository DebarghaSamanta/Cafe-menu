import {
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";

import {
  getMenu,
  getTableContext,
  createOrder,
} from "../services/api";

import {
  cartReducer,
  initialCartState,
} from "../cart/cartReducer";

import TableHeader from "../components/TableHeader";
import MenuFilters from "../components/MenuFilters";
import MenuItemCard from "../components/MenuItemCard";
import Cart from "../components/Cart";
import CustomizationModal from "../components/CustomizationModal";

function getTableTokenFromUrl() {
  const hash = window.location.hash;

  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(
    hash.substring(1)
  );

  return params.get("table_token");
}


function MenuPage() {
  // =====================================================
  // TABLE
  // =====================================================

  const [table, setTable] = useState(null);
  const [tableToken, setTableToken] = useState(null);

  // =====================================================
  // MENU
  // =====================================================

  const [menu, setMenu] = useState([]);

  const [isLoadingTable, setIsLoadingTable] = useState(true);

  const [isLoadingMenu, setIsLoadingMenu] =useState(false);

  const [error, setError] = useState("");

  // =====================================================
  // FILTERS
  // =====================================================

  const [selectedCategory,setSelectedCategory] = useState("");

  const [minPrice, setMinPrice] = useState("");

  const [maxPrice, setMaxPrice] = useState("");

  const [availability, setAvailability] = useState("all");

  // =====================================================
  // CART
  // =====================================================

  const [cart, dispatch] = useReducer(cartReducer,initialCartState);

  const [cartMessage, setCartMessage] = useState("");
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [placedOrders, setPlacedOrders] = useState([]);
  const [customizingItem, setCustomizingItem] = useState(null);
  // =====================================================
  // RESOLVE TABLE
  // =====================================================

  useEffect(() => {
    async function resolveTable() {
      setIsLoadingTable(true);
      setError("");

      const token =getTableTokenFromUrl();
      setTableToken(token); 
      if (!token) {
        setError(
          "Invalid QR code. No table token was found in the URL."
        );

        setIsLoadingTable(false);
        return;
      }

      try {
        const tableData =
          await getTableContext(token);

        setTable(tableData);
      } catch (err) {
        if (err.status === 401) {
          setError(
            "This QR code is invalid or has been disabled. Please scan the QR code attached to your table."
          );
        } else {
          setError(
            err.message ||
              "Unable to resolve the table."
          );
        }
      } finally {
        setIsLoadingTable(false);
      }
    }

    resolveTable();
  }, []);

  // =====================================================
  // FETCH MENU
  // =====================================================

  useEffect(() => {
    if (!table) {
      return;
    }

    const controller =
      new AbortController();

    async function loadMenu() {
      setIsLoadingMenu(true);
      setError("");

      try {
        const data = await getMenu({
          signal: controller.signal,
        });

        setMenu(data.items || []);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        setError(
          err.message ||
            "Unable to load the menu."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingMenu(false);
        }
      }
    }

    loadMenu();

    return () => {
      controller.abort();
    };
  }, [table]);

  // =====================================================
  // CATEGORY OPTIONS
  // =====================================================

  const categories = useMemo(() => {
    const uniqueCategories = new Set();

    menu.forEach((item) => {
      if (item.category) {
        uniqueCategories.add(
          item.category
        );
      }
    });

    return Array.from(
      uniqueCategories
    ).sort();
  }, [menu]);

  // =====================================================
  // FRONTEND FILTERING
  //
  // This remains your current Stage 4 approach.
  // Do not mix this with cart state.
  // =====================================================

  const filteredMenu = useMemo(() => {
    const min =
      minPrice === ""
        ? null
        : Number(minPrice);

    const max =
      maxPrice === ""
        ? null
        : Number(maxPrice);

    return menu.filter((item) => {

      const matchesCategory =
        selectedCategory === "" ||
        item.category ===
          selectedCategory;

      const itemPrice =
        Number(item.price);

      const matchesMinPrice =
        min === null ||
        (
          !Number.isNaN(min) &&
          itemPrice >= min
        );

      const matchesMaxPrice =
        max === null ||
        (
          !Number.isNaN(max) &&
          itemPrice <= max
        );

      const matchesAvailability =
        availability === "all" ||
        (
          availability === "available" &&
          item.is_available
        ) ||
        (
          availability === "unavailable" &&
          !item.is_available
        );

      return (
        matchesCategory &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesAvailability
      );
    });
  }, [
    menu,
    selectedCategory,
    minPrice,
    maxPrice,
    availability,
  ]);

  // =====================================================
  // CART LOOKUP
  // =====================================================

  const cartQuantityById = useMemo(() => {
    const map = new Map();

    cart.items.forEach((item) => {
      map.set(
        item.id,
        item.quantity
      );
    });

    return map;
  }, [cart.items]);

  // =====================================================
  // CART TOTALS
  // =====================================================

  const subtotalPaise = useMemo(() => {
    return cart.items.reduce(
      (total, item) => {
        return (
          total +
          item.price_paise *
            item.quantity
        );
      },
      0
    );
  }, [cart.items]);

  /*
   * Stage 5 has no tax, discount, delivery fee,
   * service charge, etc.
   *
   * Therefore:
   *
   * total = subtotal
   *
   * Stage 6 can introduce the real
   * order calculation.
   */
  const totalPaise = subtotalPaise;

  // =====================================================
  // CART ACTIONS
  // =====================================================

  function handleAddToCart(item) {
    if (!item.is_available) {
      return;
    }

    dispatch({
      type: "ADD_ITEM",
      payload: item,
    });

    setCartMessage(
      `${item.name} added to cart.`
    );
  }


  function handleIncrease(itemId) {
    dispatch({
      type: "INCREASE_ITEM",
      itemId,
    });

    setCartMessage("");
  }


  function handleDecrease(itemId) {
    dispatch({
      type: "DECREASE_ITEM",
      itemId,
    });

    setCartMessage("");
  }


  function handleRemove(itemId) {
    dispatch({
      type: "REMOVE_ITEM",
      itemId,
    });

    setCartMessage("");
  }


  function handleClearCart() {
    dispatch({
      type: "CLEAR_CART",
    });

    setCartMessage("");
  }
  function handleConfirmCustomization(item, customizations, unitPricePaise) {
    dispatch({
      type: "ADD_ITEM",
      payload: {
        ...item,
        unit_price_paise: unitPricePaise,
        customizations,
      },
    });

    setCustomizingItem(null);
    setCartMessage(`${item.name} added to cart.`);
  }
 function handleNewOrder() {
    setOrderConfirmation(null);
  }

async function handleProceed() {
    if (cart.items.length === 0) {
        setCartMessage("Your cart is empty. Add at least one item before continuing.");
        return;
    }

    const items = cart.items.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        customizations: (item.customizations || []).map((c) => ({
            group_id: c.group_id,
            choice_ids: c.choices.map((choice) => choice.id),
        })),
    }));

    try {
        const order = await createOrder(tableToken, items);
        dispatch({ type: "CLEAR_CART" });
        setOrderConfirmation(order);  
        setPlacedOrders((prev) => [...prev, order]); 
    } catch (err) {
        setCartMessage(err.message || "Unable to place order. Please try again.");
    }
    }

  // =====================================================
  // LOADING TABLE
  // =====================================================

  if (isLoadingTable) {
    return (
      <main className="page">
        <div className="state-card">
          <div className="spinner" />

          <p>
            Verifying your table...
          </p>
        </div>
      </main>
    );
  }
  // =====================================================
  // ORDER CONFIRMATION
  // =====================================================

  if (orderConfirmation) {
    return (
      <main className="page">
        <div className="state-card success-card">
          <div className="success-icon">✓</div>
          <h2>Order placed!</h2>
          <p>Your order has been sent to the kitchen.</p>

          <p className="order-id">
            Order ID: <strong>{orderConfirmation.id}</strong>
          </p>

          <p className="order-total">
            Total: ₹{(orderConfirmation.total_paise / 100).toFixed(2)}
          </p>

          <button
            type="button"
            className="retry-button"
            onClick={handleNewOrder}
          >
            Place another order
          </button>
        </div>
      </main>
    );
  }
  // =====================================================
  // TABLE / QR ERROR
  // =====================================================

  if (error && !table) {
    return (
      <main className="page">
        <div className="state-card error-card">

          <div className="error-icon">
            !
          </div>

          <h2>
            Unable to open menu
          </h2>

          <p>{error}</p>

          <button
            type="button"
            className="retry-button"
            onClick={() =>
              window.location.reload()
            }
          >
            Try again
          </button>

        </div>
      </main>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <main className="page">

      <div className="container">

        <TableHeader
          tableNumber={
            table.table_number
          }
        />
        <MenuFilters
          categories={categories}
          selectedCategory={
            selectedCategory
          }
          setSelectedCategory={
            setSelectedCategory
          }
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          availability={availability}
          setAvailability={setAvailability}
        />


        {error && (
          <div className="inline-error">
            {error}
          </div>
        )}


        <div className="menu-cart-layout">

          {/* ================================
              MENU
          ================================= */}

          <section className="menu-section">

            {isLoadingMenu ? (
              <div className="state-card">
                <div className="spinner" />

                <p>
                  Loading menu...
                </p>
              </div>

            ) : filteredMenu.length === 0 ? (
              <div className="state-card">

                <h2>
                  No matching items
                </h2>

                <p>
                  Try changing your filters.
                </p>

              </div>

            ) : (
              <section className="menu-grid">

                {filteredMenu.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAddToCart={
                      handleAddToCart
                    }
                    onCustomize={
                      setCustomizingItem
                    }
                    cartQuantity={
                      cartQuantityById.get(
                        item.id
                      ) || 0
                    }
                  />
                ))}

              </section>
            )}

          </section>


          {/* ================================
              CART
          ================================= */}
          <div className="cart-column">

            {placedOrders.length > 0 && (
              <div className="placed-orders-box">
                <h3>Your orders</h3>

                {placedOrders.map((order) => (
                  <div key={order.id} className="placed-order">
                    <div className="placed-order-header">
                      <span>Order #{order.id.slice(-6)}</span>
                      <span className="placed-order-status">{order.status}</span>
                    </div>

                    <ul>
                      {order.items.map((item) => (
                        <li key={item.menu_item_id}>
                          {item.name} × {item.quantity}
                        </li>
                      ))}
                    </ul>

                    <strong>₹{(order.total_paise / 100).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            )}

          <Cart
            items={cart.items}
            subtotalPaise={
              subtotalPaise
            }
            totalPaise={totalPaise}
            onIncrease={
              handleIncrease
            }
            onDecrease={
              handleDecrease
            }
            onRemove={
              handleRemove
            }
            onClear={
              handleClearCart
            }
            onProceed={
              handleProceed
            }
            message={cartMessage}
          />

        </div>
      </div>
      </div>
      <CustomizationModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
        onConfirm={handleConfirmCustomization}
      />
    </main>
  );
}

export default MenuPage;