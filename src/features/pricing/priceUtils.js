export function normalizePriceList(list) {
  return list ? { ...list } : null;
}

export function isPriceListActive(list) {
  const normalized = normalizePriceList(list);
  return Boolean(normalized && normalized.status !== "INACTIVE" && normalized.status !== "ARCHIVED");
}

function storedPrice(product, priceListId) {
  const entry = (product?.prices || []).find((row) => (row.priceListId || row.priceList?.id) === priceListId);
  return entry == null ? null : Number(entry.price || 0);
}

export function resolveProductPrice(db, product, customer = null) {
  if (!product) return 0;
  const lists = (db?.priceLists || []).filter((item) => isPriceListActive(item));
  const selected = lists.find((item) => item.id === customer?.priceListId)
    || lists.find((item) => item.id === db?.settings?.pos?.priceListId)
    || lists.find((item) => item.isDefault)
    || lists[0];
  const direct = selected ? storedPrice(product, selected.id) : null;
  const defaultList = lists.find((item) => item.isDefault);
  const fallback = defaultList ? storedPrice(product, defaultList.id) : null;
  const base = direct ?? fallback ?? Number(product.price || 0);
  return Math.max(0, Math.round(base));
}

export function priceListCustomerCount(db, priceListId) {
  return (db?.customers || []).filter((customer) => customer.priceListId === priceListId).length;
}
