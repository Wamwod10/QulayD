import { useMemo } from "react";

import { EMPLOYEE_WORKSPACES } from "../config/employeeWorkspaces";
import { useAuth } from "./useAuth";

export function usePermissions() {
  const { user } = useAuth();
  const permissions = useMemo(() => {
    const explicit = Array.isArray(user?.permissions) ? user.permissions : [];
    const workspaceGranted = (user?.modules || []).flatMap((key) => EMPLOYEE_WORKSPACES[key]?.permissions || []);
    const denied = new Set(Array.isArray(user?.deniedPermissions) ? user.deniedPermissions : []);
    return [...new Set([...explicit, ...workspaceGranted])].filter((item) => !denied.has(item));
  }, [user?.permissions, user?.deniedPermissions, user?.modules]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const isOwner = Boolean(user?.roles?.includes("OWNER"));
  const isAdmin = Boolean(user?.roles?.includes("ADMIN"));
  const can = (permission) => !permission || isOwner || isAdmin || permissionSet.has(permission);
  const canAny = (items = []) => isOwner || isAdmin || items.some(can);
  const canAll = (items = []) => isOwner || isAdmin || items.every(can);

  return { permissions, can, canAny, canAll, isOwner, isAdmin };
}

export default usePermissions;
