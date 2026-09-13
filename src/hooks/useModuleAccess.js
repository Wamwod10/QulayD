import { useCallback, useMemo } from "react";

import { useAuth } from "./useAuth";

export const MODULE_ALIASES = Object.freeze({
  dashboard: "dashboard", sales: "sales", pos: "pos", inventory: "inventory",
  partners: "partners", agents: "agents", routes: "routes", fulfillment: "fulfillment",
  delivery: "delivery", finance: "finance", reports: "reports", settings: "settings",
});

export function useModuleAccess() {
  const { user } = useAuth();
  const localModules = useMemo(() => Object.fromEntries(
    Object.keys(MODULE_ALIASES).map((key) => [key, Boolean(user?.modules?.includes(key))]),
  ), [user?.modules]);
  const platformModules = localModules;
  const isEnabled = useCallback((moduleKey) => {
    if (!moduleKey) return true;
    if (moduleKey === "help") return true;
    return Boolean(user?.modules?.includes(moduleKey));
  }, [user?.modules]);

  return { modules: localModules, platformModules, isEnabled };
}

export default useModuleAccess;
