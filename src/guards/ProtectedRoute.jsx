import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

function ProtectedRoute({ children, allowRoles = [], allowTemporaryPassword = false }) {
  const { isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="qp-page-loading" role="status">Sessiya tekshirilmoqda...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (user.mustChangePassword && !allowTemporaryPassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (allowRoles?.length && !allowRoles.some((role) => user.roles?.includes(role))) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}

export default ProtectedRoute;
