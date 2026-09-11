const DEFAULT_SCALE = 100;

export function toMinorUnits(value, scale = DEFAULT_SCALE) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * scale);
}

export function fromMinorUnits(value, scale = DEFAULT_SCALE) {
  return Number(value || 0) / scale;
}

export function moneyAdd(...values) {
  return fromMinorUnits(values.reduce((sum, value) => sum + toMinorUnits(value), 0));
}

export function moneySubtract(value, ...subtractors) {
  return fromMinorUnits(toMinorUnits(value) - subtractors.reduce((sum, item) => sum + toMinorUnits(item), 0));
}

export function moneyMultiply(value, multiplier) {
  return fromMinorUnits(Math.round(toMinorUnits(value) * Number(multiplier || 0)));
}

export function moneyPercent(value, percent) {
  return fromMinorUnits(Math.round(toMinorUnits(value) * Number(percent || 0) / 100));
}

export function clampMoney(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value || 0);
  return Math.min(max, Math.max(min, Number.isFinite(number) ? number : min));
}
