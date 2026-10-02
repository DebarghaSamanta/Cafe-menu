import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Global Axios response interceptor for 401 session expiry
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("cafe_auth_token");
      localStorage.removeItem("cafe_auth_user");
      if (window.location.pathname.startsWith("/admin")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────
export async function loginApi(username, password) {
  const res = await axios.post(`${BASE}/api/auth/login`, { username, password });
  return res.data; // { access_token, token_type }
}

// ─── Dashboard ─────────────────────────────────────────
export async function getDashboard(token, params = {}) {
  const res = await axios.get(`${BASE}/api/admin/dashboard`, { headers: auth(token), params });
  return res.data;
}

// ─── Orders ────────────────────────────────────────────
export async function adminListOrders(token, params = {}) {
  const res = await axios.get(`${BASE}/api/admin/orders`, { headers: auth(token), params });
  return res.data;
}

export async function adminGetOrder(token, orderId) {
  const res = await axios.get(`${BASE}/api/admin/orders/${orderId}`, { headers: auth(token) });
  return res.data;
}

export async function adminPatchOrderStatus(token, orderId, newStatus) {
  const res = await axios.patch(
    `${BASE}/api/admin/orders/${orderId}/status`,
    { status: newStatus },
    { headers: auth(token) }
  );
  return res.data;
}

export async function adminCompleteOrder(token, orderId, paymentMethod) {
  const res = await axios.post(
    `${BASE}/api/admin/dashboard/orders/${orderId}/complete`,
    { payment_method: paymentMethod || null },
    { headers: auth(token) }
  );
  return res.data;
}

export async function adminSettleOrderPayment(token, orderId, paymentMethod = "cash") {
  const res = await axios.post(
    `${BASE}/api/admin/orders/${orderId}/settle-payment`,
    { payment_method: paymentMethod },
    { headers: auth(token) }
  );
  return res.data;
}

export async function adminGetOrderInvoice(token, orderId) {
  const res = await axios.get(`${BASE}/api/admin/orders/${orderId}/invoice`, { headers: auth(token) });
  return res.data;
}

export async function adminCancelOrder(token, orderId, reason) {
  const res = await axios.post(
    `${BASE}/api/admin/dashboard/orders/${orderId}/cancel`,
    null,
    { headers: auth(token), params: reason ? { reason } : {} }
  );
  return res.data;
}

// ─── Menu ──────────────────────────────────────────────
export async function adminListMenu(token) {
  const res = await axios.get(`${BASE}/api/admin/menu`, { headers: auth(token) });
  return res.data;
}

export async function adminCreateMenuItem(token, data) {
  const res = await axios.post(`${BASE}/api/admin/menu`, data, { headers: auth(token) });
  return res.data;
}

export async function adminUpdateMenuItem(token, itemId, data) {
  const res = await axios.put(`${BASE}/api/admin/menu/${itemId}`, data, { headers: auth(token) });
  return res.data;
}

export async function adminDeleteMenuItem(token, itemId) {
  const res = await axios.delete(`${BASE}/api/admin/menu/${itemId}`, { headers: auth(token) });
  return res.data;
}

// ─── Staff ─────────────────────────────────────────────
export async function adminListStaff(token) {
  const res = await axios.get(`${BASE}/api/admin/staff`, { headers: auth(token) });
  return res.data;
}

export async function adminCreateStaff(token, data) {
  const res = await axios.post(`${BASE}/api/admin/staff`, data, { headers: auth(token) });
  return res.data;
}

export async function adminUpdateStaff(token, staffId, data) {
  const res = await axios.patch(`${BASE}/api/admin/staff/${staffId}`, data, { headers: auth(token) });
  return res.data;
}

export async function adminDeleteStaff(token, staffId) {
  const res = await axios.delete(`${BASE}/api/admin/staff/${staffId}`, { headers: auth(token) });
  return res.data;
}

// ─── Tables ────────────────────────────────────────────
export async function adminListTables(token) {
  const res = await axios.get(`${BASE}/api/admin/tables`, { headers: auth(token) });
  return res.data;
}

export async function adminCreateTable(token, tableNumber) {
  const res = await axios.post(`${BASE}/api/admin/tables`, { table_number: tableNumber }, { headers: auth(token) });
  return res.data;
}

export async function adminUpdateTable(token, tableId, data) {
  const res = await axios.patch(`${BASE}/api/admin/tables/${tableId}`, data, { headers: auth(token) });
  return res.data;
}

export async function adminRegenerateQR(token, tableId) {
  const res = await axios.post(`${BASE}/api/admin/tables/${tableId}/regenerate-qr`, null, { headers: auth(token) });
  return res.data;
}

export async function adminDeleteTable(token, tableId) {
  const res = await axios.delete(`${BASE}/api/admin/tables/${tableId}`, { headers: auth(token) });
  return res.data;
}

// ─── Helpers ───────────────────────────────────────────
function auth(token) {
  return { Authorization: `Bearer ${token}` };
}
