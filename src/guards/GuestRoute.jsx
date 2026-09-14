import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import SessionLoader from "../components/system/SessionLoader";
import { getHomePathForUser } from "../services/authService";

function GuestRoute({ children }) {
  const { isLoading, user } = useAuth();
  if (isLoading) return <SessionLoader />;
  return user ? <Navigate to={user.mustChangePassword ? "/change-password" : getHomePathForUser(user)} replace /> : children;
}
export default GuestRoute;
