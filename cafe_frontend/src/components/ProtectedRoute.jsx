import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (role === "ADMIN" && user?.role !== "ADMIN") return <Navigate to="/login" replace />;
  if (role === "STAFF" && !["STAFF", "ADMIN"].includes(user?.role)) return <Navigate to="/login" replace />;

  return children;
}
