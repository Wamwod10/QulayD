import { useMemo, useSyncExternalStore } from "react";

import { getPlatformSettings, subscribeAuth } from "../services/authService";

let cachedRaw = "";
let cachedValue = getPlatformSettings();

function getSnapshot() {
  const raw = JSON.stringify(getPlatformSettings());
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = JSON.parse(raw);
  }
  return cachedValue;
}

export function usePlatformSettings() {
  return useSyncExternalStore(subscribeAuth, getSnapshot, getSnapshot);
}

export function usePlatformFeatureFlag(key, fallback = true) {
  const settings = usePlatformSettings();
  return useMemo(() => {
    const value = settings?.featureFlags?.[key];
    return value === undefined ? fallback : Boolean(value);
  }, [fallback, key, settings]);
}

export default usePlatformSettings;
