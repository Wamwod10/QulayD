import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { getHomePathForUser } from "../services/authService";

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="qp-app-boot" role="status" aria-label="Qulay yuklanmoqda"><span>Q</span><strong>Qulay</strong><i /></div>;
  return <Navigate to={getHomePathForUser(user)} replace />;
}

export default HomeRedirect;
