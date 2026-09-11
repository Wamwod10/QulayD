export function normalizePhone(value = "") {
  return String(value).replace(/[^\d+]/g, "").replace(/^998/, "+998");
}

export function isUzPhone(value) {
  return /^\+998\d{9}$/.test(normalizePhone(value));
}

export function required(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function positiveNumber(value, { allowZero = false } = {}) {
  const number = Number(value);
  return Number.isFinite(number) && (allowZero ? number >= 0 : number > 0);
}

export function collectValidationErrors(rules = {}) {
  return Object.fromEntries(Object.entries(rules).filter(([, message]) => Boolean(message)));
}
