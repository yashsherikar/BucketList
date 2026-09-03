import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { hasValidToken } from "../lib/token";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();
  // Require both a known user AND a present, unexpired token — a stale/forged
  // wishroom_user entry alone must not get past this.
  if (!user || !hasValidToken()) return <Navigate to="/login" replace />;
  return children;
}
