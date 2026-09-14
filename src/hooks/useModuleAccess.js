import { useCallback, useMemo } from "react";

import { EMPLOYEE_WORKSPACES, EMPLOYEE_WORKSPACE_KEYS } from "../config/employeeWorkspaces";
import { useLocalDb } from "../services/localDb";
import { useAuth } from "./useAuth";

export const MODULE_ALIASES = Object.freeze({
  dashboard: "dashboard", sales: "sales", pos: "pos", inventory: "inventory",
  partners: "partners", agents: "agents", routes: "routes", fulfillment: "fulfillment",
  delivery: "delivery", finance: "finance", reports: "reports", settings: "settings",
  ...Object.fromEntries(EMPLOYEE_WORKSPACE_KEYS.map((key) => [key, key])),
});

export function useModuleAccess() {
  const { user } = useAuth();
  const settings = useLocalDb((db) => db.settings);
  const isManager = Boolean(user?.roles?.some((role) => ["OWNER", "ADMIN"].includes(role)));
  const assigned = useMemo(() => new Set(user?.modules || []), [user?.modules]);

  const isEnabled = useCallback((moduleKey) => {
    if (!moduleKey || moduleKey === "help") return true;
    if (EMPLOYEE_WORKSPACE_KEYS.includes(moduleKey)) {
      return isManager ? Boolean(settings.employeeWorkspaces?.[moduleKey]) : assigned.has(moduleKey);
    }
    if (!assigned.has(moduleKey)) return false;
    return isManager ? settings.modules?.[moduleKey] !== false : true;
  }, [assigned, isManager, settings.employeeWorkspaces, settings.modules]);

  const canAccessModule = useCallback((moduleKey) => {
    if (isEnabled(moduleKey)) return true;
    if (!moduleKey || moduleKey === "help" || isManager) return false;
    return [...assigned].some((workspaceKey) => EMPLOYEE_WORKSPACES[workspaceKey]?.modules?.includes(moduleKey));
  }, [assigned, isEnabled, isManager]);

  const localModules = useMemo(() => Object.fromEntries(
    Object.keys(MODULE_ALIASES).map((key) => [key, isEnabled(key)]),
  ), [isEnabled]);

  return { modules: localModules, platformModules: localModules, isEnabled, canAccessModule };
}

export default useModuleAccess;
