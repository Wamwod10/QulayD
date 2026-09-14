const DISPLAY_FIELDS = ["displayName", "fullName", "name", "label", "title", "number", "code"];
const ID_FIELDS = ["id", "value", "code"];

function isPrimitive(value) {
  return ["string", "number", "bigint"].includes(typeof value);
}

export function getDisplayValue(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  if (isPrimitive(value)) return value;
  if (typeof value === "boolean") return value ? "Ha" : "Yo‘q";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? fallback : value.toISOString();
  if (Array.isArray(value)) {
    const values = value.map((item) => getDisplayValue(item, "")).filter((item) => item !== "");
    return values.length ? values.join(", ") : fallback;
  }
  if (typeof value === "object") {
    for (const field of DISPLAY_FIELDS) {
      if (isPrimitive(value[field]) && value[field] !== "") return value[field];
    }
  }
  return fallback;
}

export function getPrimitiveId(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  if (isPrimitive(value)) return String(value);
  if (typeof value === "object" && !Array.isArray(value)) {
    for (const field of ID_FIELDS) {
      if (isPrimitive(value[field]) && value[field] !== "") return String(value[field]);
    }
  }
  return fallback;
}

export function relationDisplayFields(record, relationKeys = []) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return record;
  const normalized = { ...record };
  relationKeys.forEach((key) => {
    const relation = record[key];
    if (!relation || typeof relation !== "object" || Array.isArray(relation)) return;
    const idKey = `${key}Id`;
    const nameKey = `${key}Name`;
    if (!normalized[idKey]) normalized[idKey] = getPrimitiveId(relation);
    if (!normalized[nameKey]) normalized[nameKey] = getDisplayValue(relation);
  });
  return normalized;
}
