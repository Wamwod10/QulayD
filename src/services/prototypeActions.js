import { apiRequest } from "./authService";

async function perform(request, successMessage) {
  try { const data = await apiRequest(request); return { ok: true, message: successMessage, data, order: data, sale: data, adjustment: data }; }
  catch (error) { return { ok: false, message: error.message || "Amalni bajarib bo‘lmadi.", error }; }
}

export async function createProduct(payload) {
  const barcodes = (payload.barcodes?.length ? payload.barcodes : [payload.barcode]).filter(Boolean).map((barcode, index) => ({ barcode: String(barcode), isPrimary: index === 0 }));
  const prices = Array.isArray(payload.prices)
    ? payload.prices.filter((item) => item?.priceListId && Number(item.price) >= 0).map((item) => ({ priceListId: item.priceListId, price: Number(item.price) }))
    : payload.priceListId && payload.price != null ? [{ priceListId: payload.priceListId, price: Number(payload.price) }] : [];
  const openingStock = payload.warehouseId && Number(payload.initialStock) > 0 ? [{ warehouseId: payload.warehouseId, onHand: Number(payload.initialStock) }] : undefined;
  return perform({ url: "/catalog/products", body: { name: payload.name, sku: payload.sku || undefined, categoryId: payload.categoryId || null,
    unitId: payload.unitId, imageUrl: payload.image || undefined, costPrice: Number(payload.costPrice || 0), minStock: Number(payload.minStock || 0),
    barcodes, prices, openingStock } }, "Mahsulot yaratildi");
}

export async function adjustProductStock({ productId, warehouseId, newOnHand, currentOnHand = 0, reason = "Mahsulot qoldig‘i tuzatildi" }) {
  const quantity = Number(newOnHand) - Number(currentOnHand);
  if (!quantity) return { ok: true, message: "Qoldiq o‘zgarmadi", difference: 0 };
  const created = await perform({ url: "/inventory/adjustments", body: { warehouseId, reason, items: [{ productId, quantity }] } }, "Qoldiq tuzatishi yaratildi");
  if (!created.ok) return created;
  return perform({ url: `/inventory/adjustments/${created.data.id}/approve`, body: {} }, "Qoldiq yangilandi");
}

export async function createCustomer(payload) {
  return perform({ url: "/customers", body: { code: payload.code || `CUS-${Date.now().toString(36).toUpperCase()}`, name: payload.name,
    phone: payload.phone || undefined, address: payload.address || undefined, latitude: payload.latitude == null ? undefined : Number(payload.latitude),
    longitude: payload.longitude == null ? undefined : Number(payload.longitude), taxId: payload.taxId || undefined, creditLimit: Number(payload.creditLimit || 0),
    status: payload.status || "ACTIVE", metadata: { customerType: payload.customerType, category: payload.category, territory: payload.territory, agentId: payload.agentId || null, priceListId: payload.priceListId || null, image: payload.image || null } } }, "Mijoz yaratildi");
}

export async function createSupplier(payload) {
  return perform({ url: "/suppliers", body: { code: payload.code || `SUP-${Date.now().toString(36).toUpperCase()}`, name: payload.name,
    phone: payload.phone || undefined, status: payload.status || "ACTIVE", metadata: { contact: payload.contact || null, image: payload.image || null } } }, "Yetkazib beruvchi yaratildi");
}

export async function createOrder(payload) {
  const items = (payload.items || []).filter((item) => item.productId && Number(item.quantity) > 0)
    .map((item) => ({ productId: item.productId, variantId: item.variantId || null, packageId: item.packageId || null, quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice ?? item.price ?? 0), discount: Number(item.discount || 0) }));
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return perform({ url: "/orders", body: { branchId: payload.branchId || undefined, warehouseId: payload.warehouseId,
    customerId: payload.customerId || null, priceListId: payload.priceListId || null, agentId: payload.agentId || null,
    channel: payload.channel || "SALES", discount: subtotal * Number(payload.discountPercent || 0) / 100, items,
    note: payload.note || undefined, deliveryAddress: payload.deliveryAddress || undefined } }, "Buyurtma yaratildi");
}

export const sendOrderToPreparation = (id) => perform({ url: `/orders/${id}/confirm`, body: {} }, "Buyurtma tasdiqlandi");
export const approveOrderRequest = sendOrderToPreparation;
export const rejectOrderRequest = (id, reason = "Owner tomonidan rad etildi") => perform({ url: `/orders/${id}/cancel`, body: { note: reason } }, "Buyurtma bekor qilindi");
export const markOrderReadyForDelivery = (id) => perform({ url: `/orders/${id}/ready`, body: {} }, "Buyurtma yetkazishga tayyor");

export async function completePosSale({ cart, customerId, warehouseId, shiftId, priceListId, paymentMethod, total, generalDiscount, dueAt }) {
  const items = cart.map((item) => ({ productId: item.productId, variantId: item.variantId || null, packageId: item.packageId || null,
    quantity: Number(item.quantity), unitPrice: Number(item.unitPrice ?? item.price), discount: item.discountValue ? { type: item.discountType || "FIXED", value: Number(item.discountValue) } : undefined,
    serialIds: item.serialIds || [], batchId: item.batchId || null }));
  return perform({ url: "/pos/sales", body: { warehouseId, customerId: customerId || null, shiftId: shiftId || null, priceListId: priceListId || null,
    items, discount: generalDiscount?.value ? { type: generalDiscount.type || "FIXED", value: Number(generalDiscount.value) } : undefined,
    payments: [{ methodCode: paymentMethod || "CASH", amount: Number(total), ...(dueAt ? { dueAt } : {}) }] } }, "Sotuv yakunlandi");
}

export async function createGoodsReceipt(payload) {
  const result = await perform({ url: "/inventory/goods-receipts", body: { supplierId: payload.supplierId, warehouseId: payload.warehouseId,
    note: payload.note || undefined, items: (payload.items || []).map((item) => ({ productId: item.productId, variantId: item.variantId || null, packageId: item.packageId || null,
      quantity: Number(item.quantity), unitCost: Number(item.unitCost ?? item.cost ?? 0), lotNumber: item.lotNumber?.trim() || undefined,
      manufacturedAt: item.manufacturedAt || undefined, expiresAt: item.expiresAt || undefined,
      serialNumbers: Array.isArray(item.serialNumbers) ? item.serialNumbers : String(item.serialNumbers || "").split(/[\n,]+/).map((value) => value.trim()).filter(Boolean) })) } }, "Kirim yaratildi");
  if (!result.ok) return result;
  return perform({ url: `/inventory/goods-receipts/${result.data.id}/confirm`, body: {} }, "Kirim tasdiqlandi");
}

export const createStockAdjustment = (payload) => perform({ url: "/inventory/adjustments", body: { warehouseId: payload.warehouseId, reason: payload.reason,
  items: payload.items || [{ productId: payload.productId, variantId: payload.variantId || null, packageId: payload.packageId || null, batchId: payload.batchId || null,
    quantity: Number(payload.quantity), unitCost: payload.unitCost === "" || payload.unitCost == null ? undefined : Number(payload.unitCost), serialIds: payload.serialIds || [],
    serialNumbers: Array.isArray(payload.serialNumbers) ? payload.serialNumbers : String(payload.serialNumbers || "").split(/[\n,]+/).map((value) => value.trim()).filter(Boolean),
    lotNumber: payload.lotNumber?.trim() || undefined, manufacturedAt: payload.manufacturedAt || undefined, expiresAt: payload.expiresAt || undefined }] } }, "Qoldiq tuzatishi yaratildi");
export const approveStockAdjustment = (id) => perform({ url: `/inventory/adjustments/${id}/approve`, body: {} }, "Qoldiq tuzatishi tasdiqlandi");
export const createTransfer = (payload) => perform({ url: "/inventory/transfers", body: { sourceWarehouseId: payload.sourceWarehouseId || payload.fromWarehouseId,
  targetWarehouseId: payload.targetWarehouseId || payload.toWarehouseId, note: payload.note || undefined,
  items: payload.items || [{ productId: payload.productId, variantId: payload.variantId || null, packageId: payload.packageId || null, batchId: payload.batchId || null,
    quantity: Number(payload.quantity), serialIds: payload.serialIds || [] }] } }, "Ko‘chirish yaratildi");
export async function approveTransfer(id) {
  const approved = await perform({ url: `/inventory/transfers/${id}/approve`, body: {} }, "Ko‘chirish tasdiqlandi");
  return approved.ok ? perform({ url: `/inventory/transfers/${id}/complete`, body: {} }, "Ko‘chirish yakunlandi") : approved;
}

function proofPayload(proof = {}) { return { recipientName: proof.recipientName || undefined, latitude: proof.latitude == null ? undefined : Number(proof.latitude), longitude: proof.longitude == null ? undefined : Number(proof.longitude),
  photoUrl: proof.photoUrl || proof.photo || undefined, note: proof.note || undefined }; }
export const arriveDelivery = (id, location = {}) => perform({ url: `/delivery/deliveries/${id}/arrive`, body: proofPayload(location) }, "Manzilga yetib kelindi");
export const completeDelivery = (id, proof = {}) => perform({ url: `/delivery/deliveries/${id}/complete`, body: proofPayload(proof) }, "Yetkazib berish yakunlandi");
export const completePartialDelivery = (id, deliveredItems = [], proof = {}) => perform({ url: `/delivery/deliveries/${id}/partial`, body: {
  ...proofPayload(proof), deliveredItems: deliveredItems.map((item) => ({ orderItemId: item.orderItemId || item.id, quantity: Number(item.quantity) })) } }, "Qisman yetkazildi");
export const failDelivery = (id, reason = "Yetkazib berilmadi") => perform({ url: `/delivery/deliveries/${id}/fail`, body: { reason } }, "Yetkazish muvaffaqiyatsiz yakunlandi");

export const createManualInvoice = (payload) => perform({ url: "/invoices", body: { customerId: payload.customerId || null, orderId: payload.orderId || null,
  dueAt: payload.dueAt || undefined, items: (payload.items || []).map((item) => ({ description: item.description || "Mahsulot", productId: item.productId || null,
    quantity: Number(item.quantity), unitPrice: Number(item.unitPrice ?? item.price), tax: Number(item.tax || 0) })) } }, "Hisob-faktura yaratildi");
export const collectPayment = (payload) => perform({ url: "/payments", body: { customerId: payload.customerId || null, supplierId: payload.supplierId || null,
  orderId: payload.orderId || null, method: payload.method || "CASH", amount: Number(payload.amount), note: payload.note || undefined,
  allocations: payload.invoiceId ? [{ invoiceId: payload.invoiceId, amount: Number(payload.amount) }] : undefined } }, "To‘lov yaratildi");
export const approvePayment = (id) => perform({ url: `/payments/${id}/confirm`, body: {} }, "To‘lov tasdiqlandi");
