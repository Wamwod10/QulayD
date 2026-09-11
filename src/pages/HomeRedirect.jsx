import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { getHomePathForUser } from "../services/authService";

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={getHomePathForUser(user)} replace />;
}

export default HomeRedirect;
