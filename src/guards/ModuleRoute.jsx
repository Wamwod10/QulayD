import { Navigate } from "react-router-dom";

import { useModuleAccess } from "../hooks/useModuleAccess";
import { useAuth } from "../hooks/useAuth";
import { getHomePathForUser } from "../services/authService";

function ModuleRoute({ children, moduleKey }) {
  const { canAccessModule } = useModuleAccess();
  const { user } = useAuth();
  return canAccessModule(moduleKey) ? children : <Navigate to={getHomePathForUser(user)} replace state={{ moduleDisabled: moduleKey }} />;
}

export default ModuleRoute;
