export function normalizePriceList(list) {
  if (!list) return null;
  const inferredType = list.id === "pl-wholesale" ? "WHOLESALE" : list.id === "pl-vip" ? "VIP" : "RETAIL";
  return {
    type: inferredType,
    basePrice: inferredType === "RETAIL" ? "RETAIL" : "WHOLESALE",
    adjustmentPercent: inferredType === "VIP" ? -3 : 0,
    priority: inferredType === "VIP" ? 30 : inferredType === "WHOLESALE" ? 20 : 10,
    validFrom: "",
    validTo: "",
    ...list,
  };
}

export function isPriceListActive(list, date = new Date().toISOString().slice(0, 10)) {
  const normalized = normalizePriceList(list);
  if (!normalized || normalized.status === "INACTIVE" || normalized.status === "ARCHIVED") return false;
  if (normalized.validFrom && normalized.validFrom > date) return false;
  if (normalized.validTo && normalized.validTo < date) return false;
  return true;
}

export function resolveProductPrice(db, product, customer = null) {
  if (!product) return 0;
  const list = normalizePriceList((db?.priceLists || []).find((item) => item.id === customer?.priceListId));
  if (!list || !isPriceListActive(list)) return Number(product.price || 0);
  const base = list.basePrice === "RETAIL" ? Number(product.price || 0) : Number(product.wholesalePrice || product.price || 0);
  const adjusted = base * (1 + Number(list.adjustmentPercent || 0) / 100);
  return Math.max(0, Math.round(adjusted));
}

export function priceListCustomerCount(db, priceListId) {
  return (db?.customers || []).filter((customer) => customer.priceListId === priceListId).length;
}
