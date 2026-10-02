import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  useCallback,
} from "react";
import {
  getMenu,
  getTableContext,
  createOrder,
  getOrder,
  getCustomerInvoice,
  payCustomerOrder,
  getTableOrders,
} from "../services/api";
import {
  cartReducer,
  initialCartState,
} from "../cart/cartReducer";
import TableHeader from "../components/TableHeader";
import MenuFilters from "../components/MenuFilters";
import MenuItemCard from "../components/MenuItemCard";
import Cart from "../components/Cart";
import InvoiceModal from "../components/InvoiceModal";
import {
  Coffee,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  X,
  Sparkles,
  RefreshCw,
  CreditCard,
  QrCode,
  Banknote,
  ChefHat,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import "./MenuPage.css";

function getTableTokenFromUrl() {
  if (window.location.hash) {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = params.get("table_token") || params.get("token");
    if (token) {
      sessionStorage.setItem("cafe_table_token", token);
      return token;
    }
  }
  if (window.location.search) {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("table_token") || searchParams.get("token");
    if (token) {
      sessionStorage.setItem("cafe_table_token", token);
      return token;
    }
  }
  return sessionStorage.getItem("cafe_table_token") || localStorage.getItem("cafe_table_token") || null;
}

function fmt(paise) {
  return `₹${((paise || 0) / 100).toFixed(2)}`;
}

function formatTime(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

function MenuPage() {
  // ─── Table State ─────────────────────────────────────
  const [table, setTable] = useState(null);
  const [tableToken, setTableToken] = useState(null);
  const [isLoadingTable, setIsLoadingTable] = useState(true);
  const [tableError, setTableError] = useState("");

  // ─── Menu State ──────────────────────────────────────
  const [menu, setMenu] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState("");

  // ─── Filter States ───────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availability, setAvailability] = useState("all");

  // ─── Cart State ──────────────────────────────────────
  const [cart, dispatch] = useReducer(cartReducer, initialCartState);
  const [cartMessage, setCartMessage] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // ─── Orders & Invoices ───────────────────────────────
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [placedOrders, setPlacedOrders] = useState([]);
  const [activeInvoice, setActiveInvoice] = useState(null);

  // ─── Pre-Paid Payment Modal State ────────────────────
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState("upi");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // =====================================================
  // 1. RESOLVE TABLE CONTEXT FROM QR TOKEN
  // =====================================================
  useEffect(() => {
    async function resolveTable() {
      setIsLoadingTable(true);
      setTableError("");

      const token = getTableTokenFromUrl();
      setTableToken(token);

      if (!token) {
        setTableError("No table token found in the URL. Please scan the official QR code at your table.");
        setIsLoadingTable(false);
        return;
      }

      try {
        const tableData = await getTableContext(token);
        setTable(tableData);
      } catch (err) {
        if (err.status === 401) {
          setTableError("This QR code is invalid or has expired. Please ask our staff or re-scan your table card.");
        } else {
          setTableError(err.message || "Unable to resolve table details.");
        }
      } finally {
        setIsLoadingTable(false);
      }
    }

    resolveTable();
  }, []);

  // =====================================================
  // 2. FETCH MENU ITEMS
  // =====================================================
  const loadMenu = useCallback(async () => {
    if (!table) return;
    setIsLoadingMenu(true);
    setMenuError("");

    try {
      const data = await getMenu(tableToken);
      setMenu(data.items || []);
    } catch (err) {
      setMenuError(err.message || "Unable to load menu. Please refresh.");
    } finally {
      setIsLoadingMenu(false);
    }
  }, [table, tableToken]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  // =====================================================
  // 3. FETCH & POLL ACTIVE TABLE ORDERS (PERSISTENT TRACKING)
  // =====================================================
  const loadOrders = useCallback(async () => {
    if (!tableToken) return;
    try {
      const orders = await getTableOrders(tableToken);
      if (Array.isArray(orders)) {
        setPlacedOrders(orders);
      }
    } catch {
      // Silently continue
    }
  }, [tableToken]);

  // Load orders immediately when table token is resolved
  useEffect(() => {
    if (tableToken) {
      loadOrders();
    }
  }, [tableToken, loadOrders]);

  // Polling every 4 seconds to keep milestones and timestamps live
  useEffect(() => {
    if (!tableToken) return;

    const interval = setInterval(() => {
      loadOrders();
    }, 4000);

    return () => clearInterval(interval);
  }, [tableToken, loadOrders]);

  // =====================================================
  // 4. CATEGORIES & FILTERING
  // =====================================================
  const categories = useMemo(() => {
    const set = new Set();
    menu.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [menu]);

  const filteredMenu = useMemo(() => {
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    const query = (searchQuery || "").trim().toLowerCase();

    return menu.filter((item) => {
      // Category match
      const matchesCategory =
        selectedCategory === "" ||
        selectedCategory === "all" ||
        item.category === selectedCategory;

      // Search match
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.category && item.category.toLowerCase().includes(query));

      // Price match
      const price = Number(item.price);
      const matchesMin = min === null || (!Number.isNaN(min) && price >= min);
      const matchesMax = max === null || (!Number.isNaN(max) && price <= max);

      // Availability match
      const matchesAvail =
        availability === "all" ||
        (availability === "available" && item.is_available) ||
        (availability === "unavailable" && !item.is_available);

      return matchesCategory && matchesSearch && matchesMin && matchesMax && matchesAvail;
    });
  }, [menu, selectedCategory, searchQuery, minPrice, maxPrice, availability]);

  // Cart quantity map
  const cartQuantityById = useMemo(() => {
    const map = new Map();
    cart.items.forEach((item) => {
      map.set(item.id, item.quantity);
    });
    return map;
  }, [cart.items]);

  // Totals
  const subtotalPaise = useMemo(() => {
    return cart.items.reduce(
      (total, item) => total + item.price_paise * item.quantity,
      0
    );
  }, [cart.items]);

  const totalCartCount = useMemo(() => {
    return cart.items.reduce((count, item) => count + item.quantity, 0);
  }, [cart.items]);

  // =====================================================
  // 5. CART & ORDER ACTIONS
  // =====================================================
  function handleAddToCart(item) {
    if (!item.is_available) return;
    dispatch({ type: "ADD_ITEM", payload: item });
  }

  function handleIncrease(itemId) {
    dispatch({ type: "INCREASE_ITEM", itemId });
  }

  function handleDecrease(itemId) {
    dispatch({ type: "DECREASE_ITEM", itemId });
  }

  function handleRemove(itemId) {
    dispatch({ type: "REMOVE_ITEM", itemId });
  }

  function handleClearCart() {
    dispatch({ type: "CLEAR_CART" });
  }

  async function handleProceed() {
    if (cart.items.length === 0) {
      setCartMessage("Your cart is empty. Please add items before placing order.");
      return;
    }

    setIsPlacingOrder(true);
    setCartMessage("");

    const items = cart.items.map((item) => ({
      menu_item_id: item.id,
      quantity: item.quantity,
    }));

    try {
      const order = await createOrder(tableToken, items);
      dispatch({ type: "CLEAR_CART" });
      setPlacedOrders((prev) => [order, ...prev]);
      setMobileCartOpen(false);

      // Direct Customer Pre-Payment Flow
      setPendingPaymentOrder(order);
      setSelectedPayMethod("upi");
      setPaymentError("");
    } catch (err) {
      setCartMessage(err.message || "Failed to place order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  }

  // Handle Customer Settlement
  async function handlePayPrepaid(methodToUse = selectedPayMethod) {
    if (!pendingPaymentOrder) return;
    setIsProcessingPayment(true);
    setPaymentError("");

    try {
      const updatedOrder = await payCustomerOrder(tableToken, pendingPaymentOrder.id, methodToUse);
      
      // Update placed orders state
      setPlacedOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );

      const isCashReq = methodToUse === "cash_request";
      setPendingPaymentOrder(null);

      // Open confirmation screen with instant invoice availability
      setOrderConfirmation({
        ...updatedOrder,
        isCashRequest: isCashReq,
      });

      // If instant digital payment was made, fetch invoice immediately in the background
      if (!isCashReq) {
        try {
          const inv = await getCustomerInvoice(updatedOrder.id);
          setActiveInvoice(inv);
        } catch {
          // Will be viewed on demand
        }
      }
    } catch (err) {
      setPaymentError(err.message || "Payment settlement failed. Please try again.");
    } finally {
      setIsProcessingPayment(false);
    }
  }

  async function handleViewCustomerInvoice(order) {
    try {
      const inv = await getCustomerInvoice(order.id);
      setActiveInvoice(inv);
    } catch {
      setActiveInvoice(order);
    }
  }

  // =====================================================
  // RENDER: LOADING TABLE
  // =====================================================
  if (isLoadingTable) {
    return (
      <main className="mp-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              backgroundColor: "var(--cafe-roast-primary)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              animation: "spin 2s linear infinite",
            }}
          >
            <Coffee size={24} />
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "22px", marginBottom: 6 }}>
            The Artisan Café
          </h2>
          <p style={{ color: "var(--cafe-text-muted)", fontSize: "14px" }}>
            Connecting to Table Service...
          </p>
        </div>
      </main>
    );
  }

  // =====================================================
  // RENDER: TABLE / QR ERROR
  // =====================================================
  if (tableError && !table) {
    return (
      <main className="mp-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="mp-confirm-box" style={{ maxWidth: 460 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "rgba(160, 61, 61, 0.12)",
              color: "#A03D3D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "22px", marginBottom: 8, color: "var(--cafe-text-main)" }}>
            Table Authentication Required
          </h2>
          <p style={{ color: "var(--cafe-text-muted)", fontSize: "14px", lineHeight: 1.5, marginBottom: 20 }}>
            {tableError}
          </p>
          <button
            type="button"
            className="mp-checkout-btn"
            style={{ padding: "10px 20px", fontSize: "14px" }}
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>
        </div>
      </main>
    );
  }

  // =====================================================
  // RENDER: ORDER CONFIRMATION SCREEN
  // =====================================================
  if (orderConfirmation) {
    const isPaid = orderConfirmation.payment_status === "PAID";
    const isCashPending = orderConfirmation.isCashRequest || orderConfirmation.payment_status === "cash_pending";

    return (
      <main className="mp-page">
        <TableHeader tableNumber={table?.table_number} />
        <div className="mp-container">
          <div className="mp-confirm-box">
            <div className="mp-confirm-icon">
              <CheckCircle2 size={34} />
            </div>
            
            <h2 className="mp-confirm-title">
              {isPaid ? "Order Confirmed & Sent to Kitchen!" : "Order Placed • Cash Settle Requested"}
            </h2>
            
            <p style={{ color: "var(--cafe-text-muted)", fontSize: "14px", marginBottom: 18, lineHeight: 1.5 }}>
              {isPaid
                ? `Your payment has been received and verified. The kitchen is now preparing your handcrafted delicacies for Table ${table?.table_number}.`
                : `Your order is on hold for cash settlement. Please visit the billing counter or wait for staff at Table ${table?.table_number} to complete settlement.`}
            </p>

            <div
              style={{
                backgroundColor: "#F8F4EE",
                border: "1px solid var(--cafe-border)",
                borderRadius: "var(--radius-md)",
                padding: "16px 20px",
                marginBottom: 20,
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: 8 }}>
                <span style={{ color: "var(--cafe-text-muted)" }}>Order Reference:</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{orderConfirmation.id}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: 8 }}>
                <span style={{ color: "var(--cafe-text-muted)" }}>Payment Status:</span>
                <span className={`mp-pay-badge ${isPaid ? "mp-pay-badge-paid" : "mp-pay-badge-cash"}`}>
                  {isPaid ? "PAID & VERIFIED" : "CASH SETTLE DUE"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: 8 }}>
                <span style={{ color: "var(--cafe-text-muted)" }}>Order Stage:</span>
                <span className="mp-order-status-badge mp-status-confirmed" style={{ padding: "2px 8px" }}>
                  {orderConfirmation.status}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", paddingTop: 10, borderTop: "1px dashed var(--cafe-border)" }}>
                <span style={{ fontWeight: 600 }}>Total Amount (Incl. 5% GST):</span>
                <strong style={{ fontFamily: "var(--font-serif)", color: "var(--cafe-terracotta)" }}>
                  {fmt(orderConfirmation.total_paise + Math.round(orderConfirmation.total_paise * 0.05))}
                </strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {isPaid && (
                <button
                  type="button"
                  className="mp-add-btn"
                  style={{ padding: "12px 22px", fontSize: "14px" }}
                  onClick={() => handleViewCustomerInvoice(orderConfirmation)}
                >
                  <Receipt size={16} />
                  <span>View & Download Tax Invoice</span>
                </button>
              )}

              <button
                type="button"
                className="mp-checkout-btn"
                style={{ width: "auto", padding: "12px 22px", fontSize: "14px", backgroundColor: "var(--cafe-roast-primary)" }}
                onClick={() => setOrderConfirmation(null)}
              >
                <span>Back to Menu &bull; Track Live Progress</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // MAIN CUSTOMER MENU UI
  // =====================================================
  return (
    <main className="mp-page">
      {/* ── Navbar ── */}
      <TableHeader tableNumber={table?.table_number} />

      <div className="mp-container">
        {/* ── Hero Banner ── */}
        <div className="mp-hero">
          <div className="mp-hero-content">
            <h2>Artisan Table Service</h2>
            <p>
              Freshly roasted single-origin coffees, handcrafted beverages, and European gourmet bakery served directly to your table.
            </p>
          </div>

          <div style={{ display: "none", mdDisplay: "block" }}>
            <Coffee size={38} strokeWidth={1.5} style={{ color: "var(--cafe-roast-primary)", opacity: 0.6 }} />
          </div>
        </div>

        {/* ── Current Order Live Tracker with Multi-Stage Timeline ── */}
        {placedOrders.length > 0 && (
          <div className="mp-active-orders-wrap">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "19px", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={18} color="var(--cafe-terracotta)" />
                <span>Current Table Order</span>
              </h3>
              <span style={{ fontSize: "12px", color: "var(--cafe-text-muted)" }}>Live Updates Every 4s</span>
            </div>

            {placedOrders.slice(0, 1).map((order) => {
              const isPaid = order.payment_status === "PAID";
              const isCashPending = order.payment_status === "cash_pending";
              const isCompleted = order.status === "completed";
              const isCancelled = order.status === "cancelled";

              // 5 Key Stage Indicators
              const stages = [
                {
                  id: "placed",
                  label: "Placed",
                  time: formatTime(order.created_at),
                  completed: true,
                  active: order.status === "pending" && !isPaid,
                },
                {
                  id: "payment",
                  label: "Payment",
                  time: isPaid ? formatTime(order.paid_at || order.created_at) : (isCashPending ? "Cash Due" : "Unpaid"),
                  completed: isPaid,
                  active: !isPaid && !isCancelled,
                },
                {
                  id: "confirmed",
                  label: "Kitchen Confirmed",
                  time: formatTime(order.confirmed_at),
                  completed: !!order.confirmed_at || ["confirmed", "preparing", "ready", "completed"].includes(order.status),
                  active: order.status === "confirmed",
                },
                {
                  id: "preparing",
                  label: "Preparing",
                  time: formatTime(order.preparing_at),
                  completed: !!order.preparing_at || ["preparing", "ready", "completed"].includes(order.status),
                  active: order.status === "preparing",
                },
                {
                  id: "ready",
                  label: "Ready / Served",
                  time: formatTime(order.ready_at || order.completed_at),
                  completed: isCompleted || order.status === "ready",
                  active: order.status === "ready",
                },
              ];

              return (
                <div key={order.id} className="mp-active-order-card">
                  {/* Order Card Header */}
                  <div className="mp-order-card-header">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span className="mp-order-title">
                          Order #{order.id.slice(-6).toUpperCase()}
                        </span>

                        <span className={`mp-pay-badge ${isPaid ? "mp-pay-badge-paid" : isCashPending ? "mp-pay-badge-cash" : "mp-pay-badge-unpaid"}`}>
                          {isPaid ? "PAID" : isCashPending ? "CASH DUE" : "UNPAID"}
                        </span>

                        <span className={`mp-order-status-badge mp-status-${order.status}`}>
                          {order.status}
                        </span>
                      </div>

                      <div style={{ fontSize: "12.5px", color: "var(--cafe-text-muted)", marginTop: 4 }}>
                        {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""} &bull; Total: <strong>{fmt(order.total_paise + Math.round(order.total_paise * 0.05))}</strong> (Incl. 5% GST)
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {!isPaid && !isCancelled && (
                        <button
                          type="button"
                          className="mp-checkout-btn"
                          style={{ padding: "6px 14px", fontSize: "12px", width: "auto" }}
                          onClick={() => {
                            setPendingPaymentOrder(order);
                            setSelectedPayMethod("upi");
                            setPaymentError("");
                          }}
                        >
                          <CreditCard size={13} />
                          <span>Pay Now &bull; Settle</span>
                        </button>
                      )}

                      {(isPaid || isCompleted) && (
                        <button
                          type="button"
                          className="mp-add-btn"
                          style={{ padding: "6px 14px", fontSize: "12px" }}
                          onClick={() => handleViewCustomerInvoice(order)}
                        >
                          <Receipt size={13} />
                          <span>View Tax Invoice</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items Listing */}
                  <div style={{ fontSize: "13px", color: "var(--cafe-text-body)", margin: "8px 0" }}>
                    {order.items?.map((item) => (
                      <span key={item.menu_item_id} style={{ marginRight: 14, display: "inline-block" }}>
                        &bull; {item.name} &times; {item.quantity}
                      </span>
                    ))}
                  </div>

                  {/* Multi-Stage Live Timeline */}
                  <div className="mp-timeline-wrap">
                    <div className="mp-timeline-title">
                      <Sparkles size={12} color="var(--cafe-terracotta)" />
                      <span>Live Order Status Timeline</span>
                    </div>

                    <div className="mp-timeline">
                      {stages.map((st, idx) => {
                        const stepClass = st.completed
                          ? "completed"
                          : st.active
                          ? "active"
                          : "pending";

                        return (
                          <div key={st.id} className={`mp-timeline-step ${stepClass}`}>
                            <div className="mp-timeline-node">
                              {st.completed ? <Check size={14} strokeWidth={3} /> : idx + 1}
                            </div>
                            <div className="mp-timeline-label">{st.label}</div>
                            <div className="mp-timeline-time">{st.time || "—"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Filter Bar & Search ── */}
        <MenuFilters
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          availability={availability}
          setAvailability={setAvailability}
        />

        {menuError && (
          <div style={{ backgroundColor: "#FAF1E8", color: "#8C4835", padding: "10px 14px", borderRadius: "8px", marginBottom: 16 }}>
            {menuError}
          </div>
        )}

        {/* ── Main Layout: Menu Grid + Desktop Cart ── */}
        <div className="mp-layout-grid">
          {/* Menu Items */}
          <section>
            {isLoadingMenu ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--cafe-text-muted)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid var(--cafe-roast-primary)", borderTopColor: "transparent", margin: "0 auto 12px", animation: "spin 1s linear infinite" }} />
                <p>Loading handcrafted menu...</p>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", backgroundColor: "#FFFFFF", borderRadius: "var(--radius-lg)", border: "1px solid var(--cafe-border)" }}>
                <Coffee size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <h3 style={{ fontSize: "17px", color: "var(--cafe-text-main)", marginBottom: 4 }}>No matching items found</h3>
                <p style={{ fontSize: "13px", color: "var(--cafe-text-muted)" }}>Try searching for another brew or clearing your active filters.</p>
              </div>
            ) : (
              <div className="mp-menu-grid">
                {filteredMenu.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onAddToCart={handleAddToCart}
                    onIncrease={handleIncrease}
                    onDecrease={handleDecrease}
                    cartQuantity={cartQuantityById.get(item.id) || 0}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Desktop Cart Aside */}
          <Cart
            items={cart.items}
            subtotalPaise={subtotalPaise}
            totalPaise={subtotalPaise}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            onRemove={handleRemove}
            onClear={handleClearCart}
            onProceed={handleProceed}
            message={cartMessage}
            isPlacingOrder={isPlacingOrder}
          />
        </div>
      </div>

      {/* ── Mobile Floating Cart Bar ── */}
      {cart.items.length > 0 && (
        <div className="mp-mobile-cart-bar" onClick={() => setMobileCartOpen(true)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ backgroundColor: "var(--cafe-terracotta)", width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px" }}>
              {totalCartCount}
            </div>
            <div>
              <div style={{ fontSize: "13.5px", fontWeight: 700 }}>View Cart &bull; {fmt(subtotalPaise + Math.round(subtotalPaise * 0.05))}</div>
              <div style={{ fontSize: "11px", opacity: 0.8 }}>Incl. 5% GST</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: "13px" }}>
            <span>Review</span>
            <ShoppingBag size={16} />
          </div>
        </div>
      )}

      {/* ── Slide-over Cart Drawer for Mobile ── */}
      {mobileCartOpen && (
        <div className="mp-drawer-overlay" onClick={() => setMobileCartOpen(false)}>
          <div className="mp-drawer-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--cafe-border)" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "18px", margin: 0 }}>Table {table?.table_number} Order</h3>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "var(--cafe-text-muted)", cursor: "pointer" }}
                onClick={() => setMobileCartOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              <Cart
                items={cart.items}
                subtotalPaise={subtotalPaise}
                totalPaise={subtotalPaise}
                onIncrease={handleIncrease}
                onDecrease={handleDecrease}
                onRemove={handleRemove}
                onClear={handleClearCart}
                onProceed={handleProceed}
                message={cartMessage}
                isPlacingOrder={isPlacingOrder}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Pre-Paid Settlement Modal for Customer ── */}
      {pendingPaymentOrder && (
        <div className="mp-pay-modal-overlay" onClick={() => setPendingPaymentOrder(null)}>
          <div className="mp-pay-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--cafe-border)", paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", margin: 0, color: "var(--cafe-text-main)" }}>
                  Pre-Paid Checkout
                </h3>
                <span style={{ fontSize: "12px", color: "var(--cafe-text-muted)" }}>
                  Table {pendingPaymentOrder.table_number || table?.table_number} &bull; Order #{pendingPaymentOrder.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "var(--cafe-text-muted)", cursor: "pointer" }}
                onClick={() => setPendingPaymentOrder(null)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Total summary with GST */}
            <div style={{ backgroundColor: "#F8F4EE", padding: "14px 16px", borderRadius: "10px", border: "1px solid var(--cafe-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: 4 }}>
                <span style={{ color: "var(--cafe-text-muted)" }}>Subtotal ({pendingPaymentOrder.items?.length} items):</span>
                <span>{fmt(pendingPaymentOrder.total_paise)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: 6 }}>
                <span style={{ color: "var(--cafe-text-muted)" }}>5% GST (2.5% CGST + 2.5% SGST):</span>
                <span>{fmt(Math.round(pendingPaymentOrder.total_paise * 0.05))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 700, borderTop: "1px dashed var(--cafe-border)", paddingTop: 6 }}>
                <span>Total Payable:</span>
                <span style={{ color: "var(--cafe-terracotta)" }}>
                  {fmt(pendingPaymentOrder.total_paise + Math.round(pendingPaymentOrder.total_paise * 0.05))}
                </span>
              </div>
            </div>

            {/* Payment Options Selection */}
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--cafe-text-muted)" }}>
                Select Payment Method
              </span>

              <div className="mp-pay-options-grid">
                {/* 1. UPI Option */}
                <button
                  type="button"
                  className={`mp-pay-opt-btn ${selectedPayMethod === "upi" ? "active" : ""}`}
                  onClick={() => setSelectedPayMethod("upi")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "8px", backgroundColor: "#EDE5D8", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cafe-roast-primary)" }}>
                      <QrCode size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>Instant UPI / QR Code</div>
                      <div style={{ fontSize: "11.5px", color: "var(--cafe-text-muted)" }}>Google Pay, PhonePe, Paytm, BHIM</div>
                    </div>
                  </div>
                  {selectedPayMethod === "upi" && <Check size={18} color="var(--cafe-roast-primary)" strokeWidth={2.5} />}
                </button>

                {/* 2. Card Option */}
                <button
                  type="button"
                  className={`mp-pay-opt-btn ${selectedPayMethod === "card" ? "active" : ""}`}
                  onClick={() => setSelectedPayMethod("card")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "8px", backgroundColor: "#EDE5D8", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cafe-roast-primary)" }}>
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>Credit / Debit Card</div>
                      <div style={{ fontSize: "11.5px", color: "var(--cafe-text-muted)" }}>Visa, Mastercard, RuPay</div>
                    </div>
                  </div>
                  {selectedPayMethod === "card" && <Check size={18} color="var(--cafe-roast-primary)" strokeWidth={2.5} />}
                </button>

                {/* 3. Cash Request Option */}
                <button
                  type="button"
                  className={`mp-pay-opt-btn ${selectedPayMethod === "cash_request" ? "active" : ""}`}
                  onClick={() => setSelectedPayMethod("cash_request")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "8px", backgroundColor: "#EDE5D8", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cafe-roast-primary)" }}>
                      <Banknote size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>Pay Cash at Counter</div>
                      <div style={{ fontSize: "11.5px", color: "var(--cafe-text-muted)" }}>Staff / Admin will settle bill with cash</div>
                    </div>
                  </div>
                  {selectedPayMethod === "cash_request" && <Check size={18} color="var(--cafe-roast-primary)" strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            {/* UPI QR & App preview */}
            {selectedPayMethod === "upi" && (
              <div className="mp-upi-qr-preview">
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                  <div style={{ padding: "8px", backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid var(--cafe-border)" }}>
                    <QrCode size={80} color="var(--cafe-roast-primary)" />
                  </div>
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--cafe-text-main)" }}>
                  Scan to Pay: artisan.cafe@icici
                </div>
                <div className="mp-upi-apps-row">
                  <span className="mp-upi-chip">GPay</span>
                  <span className="mp-upi-chip">PhonePe</span>
                  <span className="mp-upi-chip">Paytm</span>
                  <span className="mp-upi-chip">BHIM</span>
                </div>
              </div>
            )}

            {paymentError && (
              <div style={{ backgroundColor: "#FAF1E8", color: "#8C4835", padding: "10px", borderRadius: "8px", fontSize: "13px" }}>
                {paymentError}
              </div>
            )}

            {/* Submit Action */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="mp-checkout-btn"
                disabled={isProcessingPayment}
                onClick={() => handlePayPrepaid(selectedPayMethod)}
              >
                {isProcessingPayment ? (
                  <span>Processing Settlement...</span>
                ) : selectedPayMethod === "cash_request" ? (
                  <>
                    <Banknote size={18} />
                    <span>Confirm Cash Settlement Request</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Pay {fmt(pendingPaymentOrder.total_paise + Math.round(pendingPaymentOrder.total_paise * 0.05))} &bull; Send to Kitchen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Invoice Modal ── */}
      {activeInvoice && (
        <InvoiceModal invoice={activeInvoice} onClose={() => setActiveInvoice(null)} />
      )}
    </main>
  );
}

export default MenuPage;