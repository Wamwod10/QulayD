import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { getHomePathForUser } from "../services/authService";

function GuestRoute({ children }) {
  const { isLoading, user } = useAuth();
  if (isLoading) return <div className="qp-page-loading" role="status">Sessiya tekshirilmoqda...</div>;
  return user ? <Navigate to={user.mustChangePassword ? "/change-password" : getHomePathForUser(user)} replace /> : children;
}
export default GuestRoute;
