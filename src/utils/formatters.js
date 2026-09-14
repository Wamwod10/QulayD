import { DEFAULT_COMPANY_ID, getActiveCompanyId } from "../services/authService";
import { currencyMeta, FALLBACK_RATES } from "../services/currencyService";
import { getDisplayValue, getPrimitiveId } from "./displayValue";

function readLocalPreferences() {
  if (typeof window === "undefined") return null;
  const companyId = getActiveCompanyId() || DEFAULT_COMPANY_ID;
  const raw = window.localStorage.getItem(`qulay.ui.preferences.v1.${companyId}`);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function readLocalSettings() {
  return readLocalPreferences()?.settings || null;
}

export function formatMoney(value, currency) {
  const number = Number(value) || 0;
  const preferences = readLocalPreferences();
  const configuredCurrency = currency || preferences?.settings?.company?.currency || "UZS";
  const rates = preferences?.currencyRates?.rates || FALLBACK_RATES;
  const rate = configuredCurrency === "UZS" ? 1 : Number(rates?.[configuredCurrency] || 0);
  const converted = configuredCurrency === "UZS" || !rate ? number : number / rate;
  const meta = currencyMeta(configuredCurrency);
  const decimals = configuredCurrency === "UZS" ? 0 : 2;
  const formatted = new Intl.NumberFormat("uz-UZ", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(converted);

  if (configuredCurrency === "UZS") return `${formatted} so‘m`;
  if (["USD", "EUR", "GBP", "RUB", "CNY"].includes(configuredCurrency)) return `${meta.symbol}${formatted}`;
  return `${formatted} ${meta.symbol}`;
}

export function formatMoneyRaw(value, currency = "UZS") {
  const meta = currencyMeta(currency);
  const decimals = currency === "UZS" ? 0 : 2;
  const formatted = new Intl.NumberFormat("uz-UZ", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(value) || 0);
  return currency === "UZS" ? `${formatted} so‘m` : `${meta.symbol}${formatted}`;
}

export function formatExchangeRateValue(rate) {
  return new Intl.NumberFormat("uz-UZ", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(rate) || 0);
}

export function formatExchangeRate(rate, currency = "UZS") {
  if (currency === "UZS") return "1 so‘m";
  return `1 ${currency} = ${formatExchangeRateValue(rate)} so‘m`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat("uz-UZ").format(Number(value) || 0);
}

export function getName(collection, id, fallback = "—") {
  if (id && typeof id === "object") return getDisplayValue(id, fallback);
  const safeCollection = Array.isArray(collection) ? collection : [];
  const primitiveId = getPrimitiveId(id);
  return getDisplayValue(safeCollection.find((item) => getPrimitiveId(item) === primitiveId), fallback);
}

export function shortDate(value) {
  if (!value) return "—";
  if (typeof value === "object" && !(value instanceof Date)) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const settings = readLocalSettings();
  const format = settings?.locale?.dateFormat || "DD.MM.YYYY";
  const timeZone = settings?.company?.timezone || "Asia/Tashkent";
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).formatToParts(date);
  const valueOf = (type) => parts.find((part) => part.type === type)?.value || "";
  const year = valueOf("year");
  const month = valueOf("month");
  const day = valueOf("day");
  return format === "YYYY-MM-DD" ? `${year}-${month}-${day}` : `${day}.${month}.${year}`;
}

export function formatTime(value = new Date()) {
  if (typeof value === "object" && !(value instanceof Date)) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const settings = readLocalSettings();
  const hour12 = settings?.locale?.timeFormat === "12h";
  return new Intl.DateTimeFormat("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
    timeZone: settings?.company?.timezone || "Asia/Tashkent",
  }).format(date);
}

export function formatDateTime(value, { seconds = false } = {}) {
  if (!value) return "—";
  if (typeof value === "object" && !(value instanceof Date)) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const datePart = shortDate(date);
  const settings = readLocalSettings();
  const hour12 = settings?.locale?.timeFormat === "12h";
  const time = new Intl.DateTimeFormat("uz-UZ", {
    hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), hour12,
    timeZone: settings?.company?.timezone || "Asia/Tashkent",
  }).format(date);
  return `${datePart} ${time}`;
}

export function formatRelativeDateTime(value, nowValue = new Date()) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  const nowDate = nowValue instanceof Date ? nowValue : new Date(nowValue);
  if (Number.isNaN(date.getTime()) || Number.isNaN(nowDate.getTime())) return formatDateTime(value);
  const diffMinutes = Math.round((nowDate.getTime() - date.getTime()) / 60000);
  if (diffMinutes >= 0 && diffMinutes < 1) return "Hozirgina";
  if (diffMinutes >= 1 && diffMinutes < 60) return `${diffMinutes} daqiqa oldin`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffMinutes >= 0 && diffHours < 24) return `${diffHours} soat oldin`;
  return formatDateTime(date);
}
