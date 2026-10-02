import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

import MenuPage        from "./pages/MenuPage";
import LoginPage       from "./pages/LoginPage";
import ProtectedRoute  from "./components/ProtectedRoute";

import AdminLayout     from "./pages/admin/AdminLayout";
import DashboardPage   from "./pages/admin/DashboardPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminMenuPage   from "./pages/admin/AdminMenuPage";
import AdminInventoryPage from "./pages/admin/AdminInventoryPage";
import AdminTablesPage from "./pages/admin/AdminTablesPage";

export default function App() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <Routes>
      {/* ── Customer Table Menu (Public via QR) ── */}
      <Route path="/"     element={<MenuPage />} />
      <Route path="/menu" element={<MenuPage />} />

      {/* ── Admin Login ── */}
      <Route
        path="/login"
        element={
          isAuthenticated && isAdmin ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* ── Admin Management Portal (Protected) ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="menu"      element={<AdminMenuPage />} />
        <Route path="inventory" element={<AdminInventoryPage />} />
        <Route path="stock"     element={<Navigate to="inventory" replace />} />
        <Route path="orders"    element={<AdminOrdersPage />} />
        <Route path="tables"    element={<AdminTablesPage />} />
      </Route>

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}