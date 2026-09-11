import { useMemo } from "react";

import { permissionsForRoles } from "../constants/permissions";
import { useAuth } from "./useAuth";

export function usePermissions() {
  const { user } = useAuth();
  const permissions = useMemo(() => {
    const inherited = permissionsForRoles(user?.roles || []);
    const explicit = Array.isArray(user?.permissions) ? user.permissions : [];
    const denied = new Set(Array.isArray(user?.deniedPermissions) ? user.deniedPermissions : []);
    return [...new Set([...inherited, ...explicit])].filter((item) => !denied.has(item));
  }, [user?.roles, user?.permissions, user?.deniedPermissions]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);
  const isOwner = Boolean(user?.roles?.includes("OWNER"));
  const can = (permission) => !permission || isOwner || permissionSet.has(permission);
  const canAny = (items = []) => isOwner || items.some(can);
  const canAll = (items = []) => isOwner || items.every(can);

  return { permissions, can, canAny, canAll, isOwner };
}

export default usePermissions;
