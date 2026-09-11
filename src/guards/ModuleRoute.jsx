import { Navigate } from "react-router-dom";

import { useModuleAccess } from "../hooks/useModuleAccess";

function ModuleRoute({ children, moduleKey }) {
  const { isEnabled } = useModuleAccess();
  return isEnabled(moduleKey) ? children : <Navigate to="/dashboard" replace state={{ moduleDisabled: moduleKey }} />;
}

export default ModuleRoute;
