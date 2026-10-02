import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function staffGetProfile(token) {
  const res = await axios.get(`${BASE}/api/staff/me`, { headers: auth(token) });
  return res.data;
}

export async function staffUpdateProfile(token, data) {
  const res = await axios.patch(`${BASE}/api/staff/me`, data, { headers: auth(token) });
  return res.data;
}

export async function staffListOrders(token, params = {}) {
  const res = await axios.get(`${BASE}/api/staff/orders`, { headers: auth(token), params });
  return res.data;
}

export async function staffGetOrder(token, orderId) {
  const res = await axios.get(`${BASE}/api/staff/orders/${orderId}`, { headers: auth(token) });
  return res.data;
}

export async function staffUpdateOrderStatus(token, orderId, newStatus) {
  const res = await axios.patch(
    `${BASE}/api/staff/orders/${orderId}/status`,
    { status: newStatus },
    { headers: auth(token) }
  );
  return res.data;
}

export async function staffListMenu(token) {
  const res = await axios.get(`${BASE}/api/staff/menu`, { headers: auth(token) });
  return res.data;
}

export async function staffToggleAvailability(token, itemId, isAvailable) {
  const res = await axios.patch(
    `${BASE}/api/staff/menu/${itemId}/availability`,
    { is_available: isAvailable },
    { headers: auth(token) }
  );
  return res.data;
}

export async function staffListTables(token) {
  const res = await axios.get(`${BASE}/api/staff/tables`, { headers: auth(token) });
  return res.data;
}
