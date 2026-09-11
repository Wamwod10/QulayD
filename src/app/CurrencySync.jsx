import { useEffect } from "react";

import { refreshCurrencyRates } from "../services/currencyService";
import { updateLocalDb, useLocalDb } from "../services/localDb";

const REFRESH_MS = 30 * 60 * 1000;

function CurrencySync() {
  const updatedAt = useLocalDb((db) => db.currencyRates?.updatedAt);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        await refreshCurrencyRates();
      } catch {
        if (cancelled) return;
        updateLocalDb((db) => {
          if (!db.currencyRates) return;
          db.currencyRates.status = db.currencyRates.updatedAt ? "CACHED" : "FALLBACK";
        });
      }
    };
    const age = updatedAt ? Date.now() - new Date(updatedAt).getTime() : Infinity;
    if (!Number.isFinite(age) || age > REFRESH_MS) sync();
    const timer = window.setInterval(sync, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [updatedAt]);

  return null;
}

export default CurrencySync;
