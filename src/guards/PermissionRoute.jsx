import { Navigate } from "react-router-dom";

import { usePermissions } from "../hooks/usePermissions";

function PermissionRoute({ children, permission, anyOf = [], allOf = [] }) {
  const { can, canAny, canAll } = usePermissions();
  const allowed = permission ? can(permission) : anyOf.length ? canAny(anyOf) : allOf.length ? canAll(allOf) : true;
  return allowed ? children : <Navigate to="/forbidden" replace />;
}

export default PermissionRoute;
