const number = (value) => Number(value || 0);

export function getAggregateStock(balances = [], productId, warehouseId) {
  const row = balances.find((item) => item.productId === productId && item.warehouseId === warehouseId
    && !item.variantId && (!item.stockKey || item.stockKey === "BASE"));
  const onHand = number(row?.onHand); const reserved = number(row?.reserved);
  return { onHand, reserved, available: Math.max(0, onHand - reserved) };
}

export function getVariantStockAvailability(product, balances, warehouseId, variantId) {
  const aggregate = getAggregateStock(balances, product?.id, warehouseId);
  if (!variantId) return aggregate.available;

  const rows = (product?.stocks || []).filter((item) => item.warehouseId === warehouseId && item.variantId);
  const selected = rows.find((item) => item.variantId === variantId);
  const selectedOnHand = number(selected?.onHand); const selectedReserved = number(selected?.reserved);
  const selectedAvailable = Math.max(0, selectedOnHand - selectedReserved);

  // Old QULAY databases only had product-level stock. BASE minus assigned variant rows is
  // legacy/unallocated stock and can be attributed to a selected variant by the backend.
  const assignedOnHand = rows.reduce((sum, item) => sum + number(item.onHand), 0);
  const assignedReserved = rows.reduce((sum, item) => sum + number(item.reserved), 0);
  const unallocatedOnHand = Math.max(0, aggregate.onHand - assignedOnHand);
  const unallocatedReserved = Math.max(0, aggregate.reserved - assignedReserved);
  const unallocatedAvailable = Math.max(0, unallocatedOnHand - unallocatedReserved);
  return Math.max(0, Math.min(aggregate.available, selectedAvailable + unallocatedAvailable));
}
