import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

import MenuPage        from "./pages/MenuPage";
import LoginPage       from "./pages/LoginPage";
import ProtectedRoute  from "./components/ProtectedRoute";

import AdminLayout     from "./pages/admin/AdminLayout";
import DashboardPage   from "./pages/admin/DashboardPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminMenuPage   from "./pages/admin/AdminMenuPage";
import AdminStaffPage  from "./pages/admin/AdminStaffPage";
import AdminTablesPage from "./pages/admin/AdminTablesPage";

import StaffLayout      from "./pages/staff/StaffLayout";
import KitchenPage      from "./pages/staff/KitchenPage";
import StaffMenuPage    from "./pages/staff/StaffMenuPage";
import StaffTablesPage  from "./pages/staff/StaffTablesPage";
import StaffProfilePage from "./pages/staff/StaffProfilePage";

export default function App() {
  const { isAuthenticated, isAdmin, isStaff } = useAuth();

  return (
    <Routes>
      {/* ── Customer menu (public via QR) ── */}
      <Route path="/"    element={<MenuPage />} />
      <Route path="/menu" element={<MenuPage />} />

      {/* ── Login ── */}
      <Route path="/login" element={
        isAuthenticated
          ? <Navigate to={isAdmin ? "/admin/dashboard" : "/staff/orders"} replace />
          : <LoginPage />
      } />

      {/* ── Admin (ADMIN only) ── */}
      <Route path="/admin" element={
        <ProtectedRoute role="ADMIN"><AdminLayout /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="orders"    element={<AdminOrdersPage />} />
        <Route path="menu"      element={<AdminMenuPage />} />
        <Route path="staff"     element={<AdminStaffPage />} />
        <Route path="tables"    element={<AdminTablesPage />} />
      </Route>

      {/* ── Staff panel (STAFF or ADMIN) ── */}
      <Route path="/staff" element={
        <ProtectedRoute role="STAFF"><StaffLayout /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="orders" replace />} />
        <Route path="orders"  element={<KitchenPage />} />
        <Route path="menu"    element={<StaffMenuPage />} />
        <Route path="tables"  element={<StaffTablesPage />} />
        <Route path="profile" element={<StaffProfilePage />} />
      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}