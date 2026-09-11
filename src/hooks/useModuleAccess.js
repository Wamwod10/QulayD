import { useCallback, useMemo } from "react";

import { useAuth } from "./useAuth";
import { useLocalDb } from "../services/localDb";
import { getEffectiveCompanyModules } from "../services/authService";

export const MODULE_ALIASES = Object.freeze({
  dashboard: "dashboard", sales: "sales", pos: "pos", catalog: "catalog", inventory: "inventory",
  partners: "partners", agents: "agents", routes: "routes", fulfillment: "fulfillment",
  delivery: "delivery", finance: "finance", reports: "reports", settings: "settings",
});

export function useModuleAccess() {
  const { company, user } = useAuth();
  const localModules = useLocalDb((db) => db.settings?.modules || {});
  const platformModules = useMemo(() => {
    try { return company?.id ? getEffectiveCompanyModules(company.id) : {}; } catch { return {}; }
  }, [company?.id]);
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN");

  const isEnabled = useCallback((moduleKey) => {
    if (!moduleKey || moduleKey === "dashboard" || moduleKey === "settings") return true;
    if (isSuperAdmin) return true;
    return platformModules[moduleKey] !== false && localModules[moduleKey] !== false;
  }, [isSuperAdmin, localModules, platformModules]);

  return { modules: localModules, platformModules, isEnabled };
}

export default useModuleAccess;
