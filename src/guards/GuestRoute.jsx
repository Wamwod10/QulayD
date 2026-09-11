import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { getHomePathForUser } from "../services/authService";

function GuestRoute({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to={user.mustChangePassword ? "/change-password" : getHomePathForUser(user)} replace /> : children;
}
export default GuestRoute;
