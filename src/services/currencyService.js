import { updateLocalDb } from "./localDb";

export const CURRENCIES = [
  { code: "UZS", name: "O‘zbekiston so‘mi", symbol: "so‘m" },
  { code: "USD", name: "AQSH dollari", symbol: "$" },
  { code: "EUR", name: "Yevro", symbol: "€" },
  { code: "RUB", name: "Rossiya rubli", symbol: "₽" },
  { code: "GBP", name: "Funt sterling", symbol: "£" },
  { code: "CNY", name: "Xitoy yuani", symbol: "¥" },
  { code: "AED", name: "BAA dirhami", symbol: "AED" },
];

export const FALLBACK_RATES = { UZS: 1, USD: 11914.62, EUR: 13754, RUB: 146.59, GBP: 16029.04, CNY: 1758.53, AED: 3244.28 };

export function currencyMeta(code) { return CURRENCIES.find((item) => item.code === code) || CURRENCIES[0]; }
export function convertFromUzs(amount, currency, rates = FALLBACK_RATES) { const value = Number(amount) || 0; if (!currency || currency === "UZS") return value; const rate = Number(rates?.[currency]); return rate > 0 ? value / rate : value; }
export function convertToUzs(amount, currency, rates = FALLBACK_RATES) { const value = Number(amount) || 0; if (!currency || currency === "UZS") return value; const rate = Number(rates?.[currency]); return rate > 0 ? value * rate : value; }

function cacheFallback(errorMessage = "") {
  let snapshot = { status: "FALLBACK", rates: FALLBACK_RATES };
  updateLocalDb((db) => {
    const previous = db.currencyRates?.rates || {};
    const usable = Object.values(previous).some((value) => Number(value) > 1);
    db.currencyRates = {
      ...(db.currencyRates || {}),
      source: usable ? (db.currencyRates?.source || "Saqlangan kurs") : "Zaxira kurs",
      rates: { ...FALLBACK_RATES, ...previous, UZS: 1 },
      status: usable ? "CACHED" : "FALLBACK",
      lastError: errorMessage,
      checkedAt: new Date().toISOString(),
    };
    snapshot = db.currencyRates;
  });
  return { ok: false, status: snapshot?.status || "FALLBACK", rates: snapshot?.rates || FALLBACK_RATES, message: errorMessage || "Oxirgi saqlangan kurs ishlatilmoqda" };
}

export async function refreshCurrencyRates() {
  try {
    const response = await fetch("/api/google-finance?currencies=USD,EUR,RUB,GBP,CNY,AED", { headers: { Accept: "application/json" } });
    if (!response.ok) return cacheFallback(`Kurs provideri javob bermadi (${response.status})`);
    const payload = await response.json();
    const incoming = payload?.rates || {};
    const validRates = Object.fromEntries(Object.entries(incoming).filter(([, value]) => Number(value) > 0));
    if (Object.keys(validRates).filter((key) => key !== "UZS").length < 2) return cacheFallback("Google Finance javobida yetarli kurs topilmadi");

    updateLocalDb((db) => {
      db.currencyRates = {
        ...(db.currencyRates || {}),
        source: payload.source || "Google Finance",
        updatedAt: payload.updatedAt || new Date().toISOString(),
        checkedAt: new Date().toISOString(),
        rates: { ...FALLBACK_RATES, ...(db.currencyRates?.rates || {}), ...validRates, UZS: 1 },
        errors: payload.errors || {},
        lastError: "",
        status: "LIVE",
      };
    });
    return { ok: true, status: "LIVE", ...payload };
  } catch (error) {
    return cacheFallback(error?.message || "Kurslarni internetdan olib bo‘lmadi");
  }
}
