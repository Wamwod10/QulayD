import { getCurrentAuthUser } from "./authService";
import { makeId, nextNumber, updateLocalDb } from "./localDb";
import { collectProductBarcodes, createProductIdentity } from "../utils/productCodes";
import { addActivity, addWorkflowNotification } from "./workflowHelpers";

import { getCustomerDebt, getCustomerOpenInvoices } from "./financeSelectors";
function findBalance(db, warehouseId, productId) {
  return db.balances.find(
    (balance) => balance.warehouseId === warehouseId && balance.productId === productId,
  );
}

function ensureBalance(db, warehouseId, productId) {
  let balance = findBalance(db, warehouseId, productId);
  if (!balance) {
    balance = { id: makeId("bal"), warehouseId, productId, onHand: 0, reserved: 0 };
    db.balances.push(balance);
  }
  return balance;
}

export function createProduct(payload) {
  let created = null;
  updateLocalDb((db) => {
    const generated = createProductIdentity(db.products);
    const sku = String(payload.sku || generated.sku).trim();
    const requestedBarcodes = Array.isArray(payload.barcodes) ? payload.barcodes : [payload.barcode || generated.barcode];
    const barcodes = Array.from(new Set(requestedBarcodes.map((value) => String(value || "").trim()).filter(Boolean)));
    const duplicateSku = db.products.some((product) => String(product.sku || "").trim().toLowerCase() === sku.toLowerCase());
    if (duplicateSku) throw new Error("Bu SKU boshqa mahsulotda mavjud.");
    const existingBarcodes = collectProductBarcodes(db.products);
    const duplicateBarcode = barcodes.find((barcode) => existingBarcodes.has(barcode));
    if (duplicateBarcode) throw new Error(`${duplicateBarcode} shtrix-kodi boshqa mahsulotda mavjud.`);
    const product = {
      id: makeId("prd"),
      name: payload.name.trim(),
      sku,
      barcode: barcodes[0] || "",
      barcodes,
      image: String(payload.image || ""),
      categoryId: payload.categoryId,
      unitId: payload.unitId,
      costPrice: Math.max(0, Number(payload.costPrice) || 0),
      price: Math.max(0, Number(payload.price) || 0),
      wholesalePrice: Math.max(0, Number(payload.wholesalePrice) || Number(payload.price) || 0),
      minStock: Math.max(0, Number(payload.minStock) || 0),
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };
    db.products.unshift(product);
    db.warehouses.forEach((warehouse) => {
      db.balances.push({ id: makeId("bal"), warehouseId: warehouse.id, productId: product.id, onHand: 0, reserved: 0 });
    });

    const initialStock = Math.max(0, Number(payload.initialStock) || 0);
    if (payload.warehouseId && initialStock > 0) {
      const balance = ensureBalance(db, payload.warehouseId, product.id);
      balance.onHand = initialStock;
      db.movements.unshift({
        id: makeId("mov"),
        date: new Date().toISOString().slice(0, 10),
        type: "OPENING_BALANCE",
        warehouseId: payload.warehouseId,
        productId: product.id,
        quantity: initialStock,
        reference: `OPEN-${product.sku}`,
      });
    }
    created = product;
  });
  return created;
}

export function adjustProductStock({ productId, warehouseId, newOnHand, reason = "Mahsulot tahriridan qoldiq tuzatildi" }) {
  let result = { ok: false, message: "Qoldiq ma’lumoti noto‘g‘ri" };
  updateLocalDb((db) => {
    const product = db.products.find((item) => item.id === productId);
    const warehouse = db.warehouses.find((item) => item.id === warehouseId);
    if (!product || !warehouse) {
      result = { ok: false, message: "Mahsulot yoki ombor topilmadi" };
      return;
    }
    const target = Number(newOnHand);
    if (!Number.isFinite(target) || target < 0) {
      result = { ok: false, message: "Yangi qoldiq 0 dan kichik bo‘lishi mumkin emas" };
      return;
    }
    const balance = ensureBalance(db, warehouseId, productId);
    const current = Number(balance.onHand || 0);
    const difference = target - current;
    if (difference === 0) {
      result = { ok: true, message: "Qoldiq o‘zgarmadi", difference: 0 };
      return;
    }
    balance.onHand = target;
    const adjustment = {
      id: makeId("adj"),
      number: nextNumber("ADJ", db.adjustments),
      date: new Date().toISOString().slice(0, 10),
      warehouseId,
      productId,
      quantity: difference,
      reason,
      status: "CONFIRMED",
      source: "PRODUCT_EDIT",
    };
    db.adjustments.unshift(adjustment);
    db.movements.unshift({
      id: makeId("mov"),
      date: adjustment.date,
      type: "ADJUSTMENT",
      warehouseId,
      productId,
      quantity: difference,
      reference: adjustment.number,
    });
    result = { ok: true, message: `${warehouse.name} qoldig‘i ${target} ga yangilandi`, difference, adjustment };
  });
  return result;
}

export function createCustomer(payload) {
  updateLocalDb((db) => {
    db.customers.unshift({
      id: makeId("cus"),
      name: payload.name.trim(),
      phone: payload.phone?.trim() || "",
      customerType: payload.customerType || "ORGANIZATION",
      taxId: payload.taxId?.trim() || "",
      category: payload.category?.trim() || "",
      image: String(payload.image || ""),
      address: payload.address?.trim() || "",
      latitude: Number(payload.latitude) || null,
      longitude: Number(payload.longitude) || null,
      territory: payload.territory?.trim() || "",
      priceListId: payload.priceListId || "pl-retail",
      agentId: payload.agentId || "",
      debt: 0,
      creditLimit: Number(payload.creditLimit) || 0,
      status: "ACTIVE",
    });
  });
}

export function createSupplier(payload) {
  updateLocalDb((db) => {
    db.suppliers.unshift({ id: makeId("sup"), name: payload.name.trim(), phone: payload.phone?.trim() || "", contact: payload.contact?.trim() || "", image: String(payload.image || ""), status: "ACTIVE" });
  });
}

function reserveOrderForPreparation(db, order) {
  const items = order.items || [];
  for (const line of items) {
    const existingReservation = (db.reservations || []).find((reservation) => reservation.orderId === order.id && reservation.productId === line.productId && reservation.status === "ACTIVE");
    if (existingReservation) continue;
    const balance = ensureBalance(db, order.warehouseId, line.productId);
    if (!db.settings.inventory.allowNegativeStock && balance.onHand - balance.reserved < Number(line.quantity || 0)) {
      const product = db.products.find((item) => item.id === line.productId);
      return { ok: false, message: `${product?.name || "Mahsulot"} uchun sotish mumkin qoldiq yetarli emas` };
    }
  }

  if (db.settings.inventory.reservations !== false) {
    items.forEach((line) => {
      const existingReservation = (db.reservations || []).find((reservation) => reservation.orderId === order.id && reservation.productId === line.productId && reservation.status === "ACTIVE");
      if (existingReservation) return;
      const quantity = Number(line.quantity || 0);
      const balance = ensureBalance(db, order.warehouseId, line.productId);
      balance.reserved += quantity;
      db.reservations.unshift({ id: makeId("res"), orderId: order.id, warehouseId: order.warehouseId, productId: line.productId, quantity, status: "ACTIVE" });
    });
    order.fulfillmentStatus = "RESERVED";
  } else {
    order.fulfillmentStatus = "NOT_STARTED";
  }

  if (!(db.pickLists || []).some((pick) => pick.orderId === order.id)) {
    db.pickLists.unshift({ id: makeId("pick"), number: `PICK-${String(db.pickLists.length + 1).padStart(4, "0")}`, orderId: order.id, status: db.settings.inventory.reservations !== false ? "RESERVED" : "NEW", progress: 0 });
  }
  return { ok: true, message: "" };
}

export function createOrder(payload) {
  let result = { ok: false, message: "Buyurtma ma’lumotlari to‘liq emas" };
  updateLocalDb((db) => {
    const validItems = (payload.items || [])
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({ productId: item.productId, quantity: Number(item.quantity), price: Number(item.price) || 0 }));
    if (!payload.customerId || !payload.warehouseId || !validItems.length) return;

    if (!db.settings.inventory.allowNegativeStock) {
      const insufficient = validItems.find((item) => {
        const balance = ensureBalance(db, payload.warehouseId, item.productId);
        return balance.onHand - balance.reserved < item.quantity;
      });
      if (insufficient) {
        const product = db.products.find((item) => item.id === insufficient.productId);
        result = { ok: false, message: `${product?.name || "Mahsulot"} uchun sotish mumkin qoldiq yetarli emas` };
        return;
      }
    }

    const subtotal = validItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const maxDiscount = Math.max(0, Number(db.settings.sales.maxAgentDiscount || 0));
    const discountPercent = Math.min(Math.max(0, Number(payload.discountPercent || 0)), maxDiscount);
    const total = Math.round(subtotal * (1 - discountPercent / 100));
    const customer = db.customers.find((item) => item.id === payload.customerId);
    const currentDebt = customer ? getCustomerDebt(db, customer.id) : 0;
    const creditLimit = Number(customer?.creditLimit || 0);
    if (db.settings.finance.enforceCreditLimit === true && creditLimit > 0 && currentDebt + total > creditLimit) {
      result = { ok: false, message: "Buyurtma mijozning kredit limitidan oshib ketadi" };
      return;
    }

    const actor = getCurrentAuthUser();
    const actorRole = actor?.primaryRole || actor?.roles?.[0] || "OWNER";
    const requiresOwnerApproval = actorRole === "ADMIN" && db.settings.sales.requireOwnerApprovalForAdminOrders === true;
    const autoPrepare = db.settings.sales.autoConfirmOrders !== false && !requiresOwnerApproval;
    const reservationsEnabled = db.settings.inventory.reservations !== false;
    const order = {
      id: makeId("ord"),
      number: nextNumber(db.settings.documents?.orderPrefix || "ORD", db.orders),
      date: new Date().toLocaleDateString("en-CA", { timeZone: db.settings.company?.timezone || "Asia/Tashkent" }),
      createdAt: new Date().toISOString(),
      customerId: payload.customerId,
      agentId: payload.agentId || "",
      warehouseId: payload.warehouseId,
      status: requiresOwnerApproval ? "PENDING_APPROVAL" : autoPrepare ? "CONFIRMED" : "SUBMITTED",
      assignmentStatus: "NOT_REQUIRED",
      approvalStatus: requiresOwnerApproval ? "PENDING" : autoPrepare ? "APPROVED" : "NOT_REQUIRED",
      fulfillmentStatus: autoPrepare && reservationsEnabled ? "RESERVED" : "NOT_STARTED",
      deliveryStatus: "NOT_PLANNED",
      subtotal,
      discountPercent,
      total,
      items: validItems,
      requestedBy: actor?.id || "",
      requestedByName: actor?.name || "Biznes egasi",
    };
    db.orders.unshift(order);

    if (requiresOwnerApproval) {
      db.approvals.unshift({
        id: makeId("apr"),
        type: "ORDER",
        referenceId: order.id,
        referenceNumber: order.number,
        requestedBy: actor?.id || "",
        requestedByName: actor?.name || "Admin",
        assignedRole: "OWNER",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        note: "Admin yaratgan buyurtma Owner tasdig‘ini kutmoqda",
      });
    } else if (autoPrepare) {
      const preparation = reserveOrderForPreparation(db, order);
      if (!preparation.ok) {
        db.orders = db.orders.filter((item) => item.id !== order.id);
        result = preparation;
        return;
      }
    }

    addActivity(db, {
      entityType: "ORDER", entityId: order.id, action: "CREATED", title: "Buyurtma yaratildi",
      description: requiresOwnerApproval ? "Admin buyurtmasi Owner tasdig‘iga yuborildi." : autoPrepare ? "Buyurtma avtomatik tayyorlash navbatiga yuborildi." : "Buyurtma saqlandi.",
      actorId: actor?.id || "system", actorName: actor?.name || "Biznes egasi",
    });
    result = { ok: true, message: requiresOwnerApproval ? `${order.number} Owner tasdig‘iga yuborildi` : autoPrepare ? `${order.number} yaratildi va tayyorlashga yuborildi` : `${order.number} yaratildi`, order };
  });
  return result;
}

export function sendOrderToPreparation(orderId) {
  let result = { ok: false, message: "Buyurtma topilmadi" };
  updateLocalDb((db) => {
    const order = db.orders.find((item) => item.id === orderId);
    if (!order) return;
    if (["RESERVED", "PICKING", "PICKED", "PACKING", "READY", "COMPLETED"].includes(order.fulfillmentStatus)) {
      result = { ok: true, message: "Buyurtma allaqachon tayyorlash jarayonida" };
      return;
    }
    if (order.approvalStatus === "PENDING") {
      result = { ok: false, message: "Avval Owner tasdig‘i kerak" };
      return;
    }
    const preparation = reserveOrderForPreparation(db, order);
    if (!preparation.ok) { result = preparation; return; }
    order.status = "CONFIRMED";
    if (order.approvalStatus !== "NOT_REQUIRED") order.approvalStatus = "APPROVED";
    order.updatedAt = new Date().toISOString();
    addActivity(db, { entityType: "ORDER", entityId: order.id, action: "PREPARATION_STARTED", title: "Tayyorlashga yuborildi", actorId: "owner", actorName: "Biznes egasi" });
    result = { ok: true, message: "Buyurtma tayyorlashga yuborildi" };
  });
  return result;
}

export function approveOrderRequest(orderId) {
  let result = { ok: false, message: "Tasdiq so‘rovi topilmadi" };
  updateLocalDb((db) => {
    const actor = getCurrentAuthUser();
    const actorRole = actor?.primaryRole || actor?.roles?.[0] || "";
    if (actorRole !== "OWNER") { result = { ok: false, message: "Bu amal faqat Owner uchun" }; return; }
    const order = db.orders.find((item) => item.id === orderId);
    const approval = (db.approvals || []).find((item) => item.type === "ORDER" && item.referenceId === orderId && item.status === "PENDING");
    if (!order || !approval || order.approvalStatus !== "PENDING") return;

    if (db.settings.sales.autoConfirmOrders !== false) {
      const preparation = reserveOrderForPreparation(db, order);
      if (!preparation.ok) { result = preparation; return; }
      order.status = "CONFIRMED";
    } else {
      order.status = "SUBMITTED";
    }
    order.approvalStatus = "APPROVED";
    order.updatedAt = new Date().toISOString();
    approval.status = "APPROVED";
    approval.resolvedAt = new Date().toISOString();
    approval.resolvedBy = actor?.id || "owner";
    approval.resolvedByName = actor?.name || "Biznes egasi";
    addActivity(db, { entityType: "ORDER", entityId: order.id, action: "APPROVED", title: "Owner tasdiqladi", description: db.settings.sales.autoConfirmOrders !== false ? "Buyurtma tayyorlash navbatiga yuborildi." : "Buyurtma davom ettirish uchun tasdiqlandi.", actorId: actor?.id || "owner", actorName: actor?.name || "Biznes egasi" });
    result = { ok: true, message: db.settings.sales.autoConfirmOrders !== false ? `${order.number} tasdiqlandi va tayyorlashga yuborildi` : `${order.number} tasdiqlandi` };
  });
  return result;
}

export function rejectOrderRequest(orderId, reason = "") {
  let result = { ok: false, message: "Tasdiq so‘rovi topilmadi" };
  updateLocalDb((db) => {
    const actor = getCurrentAuthUser();
    const actorRole = actor?.primaryRole || actor?.roles?.[0] || "";
    if (actorRole !== "OWNER") { result = { ok: false, message: "Bu amal faqat Owner uchun" }; return; }
    const order = db.orders.find((item) => item.id === orderId);
    const approval = (db.approvals || []).find((item) => item.type === "ORDER" && item.referenceId === orderId && item.status === "PENDING");
    if (!order || !approval || order.approvalStatus !== "PENDING") return;
    order.approvalStatus = "REJECTED";
    order.status = "CANCELLED";
    order.cancelReason = String(reason || "Owner tomonidan rad etildi").trim();
    order.updatedAt = new Date().toISOString();
    approval.status = "REJECTED";
    approval.reason = order.cancelReason;
    approval.resolvedAt = new Date().toISOString();
    approval.resolvedBy = actor?.id || "owner";
    approval.resolvedByName = actor?.name || "Biznes egasi";
    addActivity(db, { entityType: "ORDER", entityId: order.id, action: "REJECTED", title: "Owner rad etdi", description: order.cancelReason, actorId: actor?.id || "owner", actorName: actor?.name || "Biznes egasi" });
    result = { ok: true, message: `${order.number} rad etildi` };
  });
  return result;
}

export function markOrderReadyForDelivery(orderId) {
  let result = { ok: false, message: "Buyurtma topilmadi" };
  updateLocalDb((db) => {
    const order = db.orders.find((item) => item.id === orderId);
    if (!order) return;
    order.fulfillmentStatus = "READY";
    order.updatedAt = new Date().toISOString();
    const pick = (db.pickLists || []).find((item) => item.orderId === order.id);
    if (pick) { pick.status = "READY"; pick.progress = 100; pick.completedAt = new Date().toISOString(); }
    addActivity(db, { entityType: "ORDER", entityId: order.id, action: "READY_FOR_DELIVERY", title: "Buyurtma yetkazishga tayyor", actorId: "owner", actorName: "Biznes egasi" });
    result = { ok: true, message: "Buyurtma yetkazishga tayyor" };
  });
  return result;
}

export function completePosSale({ cart, customerId, warehouseId, paymentMethod }) {
  let result = { ok: false, message: "Savat bo‘sh" };
  updateLocalDb((db) => {
    if (!cart.length) return;
    for (const line of cart) {
      const balance = ensureBalance(db, warehouseId, line.productId);
      const available = balance.onHand - balance.reserved;
      if (available < line.quantity && !db.settings.inventory.allowNegativeStock) {
        const product = db.products.find((item) => item.id === line.productId);
        result = { ok: false, message: `${product?.name || "Mahsulot"} uchun qoldiq yetarli emas` };
        return;
      }
    }
    const total = cart.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const sale = {
      id: makeId("sale"), number: nextNumber("SAL", db.sales), date: new Date().toISOString().slice(0, 10), channel: "POS", customerId: customerId || "", warehouseId, total, paymentStatus: "PAID", items: cart.map((line) => ({ productId: line.productId, quantity: line.quantity, price: line.price })),
    };
    db.sales.unshift(sale);
    cart.forEach((line) => {
      const balance = ensureBalance(db, warehouseId, line.productId);
      balance.onHand -= line.quantity;
      db.movements.unshift({ id: makeId("mov"), date: sale.date, type: "POS_SALE", warehouseId, productId: line.productId, quantity: -line.quantity, reference: sale.number });
    });
    const invoice = { id: makeId("inv"), number: nextNumber(db.settings.documents?.invoicePrefix || "INV", db.invoices), date: sale.date, customerId: customerId || "", saleId: sale.id, total, paid: total, status: "PAID" };
    db.invoices.unshift(invoice);
    const payment = { id: makeId("pay"), number: nextNumber(db.settings.documents?.paymentPrefix || "PAY", db.payments), date: sale.date, customerId: customerId || "", amount: total, method: paymentMethod, status: "CONFIRMED", invoiceId: invoice.id };
    db.payments.unshift(payment);
    if (customerId) {
      db.ledger.unshift({ id: makeId("led"), date: sale.date, customerId, type: "INVOICE", debit: total, credit: 0, reference: invoice.number });
      db.ledger.unshift({ id: makeId("led"), date: sale.date, customerId, type: "PAYMENT", debit: 0, credit: total, reference: payment.number });
    }
    result = { ok: true, message: `${sale.number} muvaffaqiyatli yakunlandi`, sale };
  });
  return result;
}

export function createGoodsReceipt(payload) {
  let result = { ok: false, message: "Kirim ma’lumoti noto‘g‘ri" };
  updateLocalDb((db) => {
    const items = payload.items
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({ productId: item.productId, quantity: Number(item.quantity), cost: Math.max(0, Number(item.cost) || 0) }));
    if (!payload.warehouseId || !items.length) return;
    const receipt = {
      id: makeId("rec"),
      number: nextNumber("GR", db.goodsReceipts),
      date: new Date().toISOString().slice(0, 10),
      supplierId: payload.supplierId,
      warehouseId: payload.warehouseId,
      status: "CONFIRMED",
      total: items.reduce((sum, item) => sum + item.quantity * item.cost, 0),
      items,
    };
    db.goodsReceipts.unshift(receipt);
    items.forEach((item) => {
      const product = db.products.find((current) => current.id === item.productId);
      const currentTotalStock = db.balances
        .filter((balance) => balance.productId === item.productId)
        .reduce((sum, balance) => sum + Math.max(0, Number(balance.onHand || 0)), 0);
      const oldCost = Math.max(0, Number(product?.costPrice || 0));
      const incomingCost = Math.max(0, Number(item.cost || 0));
      if (product && incomingCost > 0) {
        const weighted = currentTotalStock > 0 && oldCost > 0
          ? ((currentTotalStock * oldCost) + (item.quantity * incomingCost)) / (currentTotalStock + item.quantity)
          : incomingCost;
        product.costPrice = Math.round(weighted * 100) / 100;
      }
      const balance = ensureBalance(db, payload.warehouseId, item.productId);
      balance.onHand += item.quantity;
      db.movements.unshift({ id: makeId("mov"), date: receipt.date, type: "GOODS_RECEIPT", warehouseId: payload.warehouseId, productId: item.productId, quantity: item.quantity, reference: receipt.number });
    });
    result = { ok: true, message: `${receipt.number} qabul qilindi`, receipt };
  });
  return result;
}

export function createStockAdjustment(payload) {
  let result = { ok: false, message: "Tuzatish ma’lumoti noto‘g‘ri" };
  updateLocalDb((db) => {
    const quantity = Number(payload.quantity) || 0;
    if (!quantity) return;
    const requiresApproval = db.settings.inventory.requireAdjustmentApproval === true;
    const adjustment = { id: makeId("adj"), number: nextNumber("ADJ", db.adjustments), date: new Date().toISOString().slice(0, 10), warehouseId: payload.warehouseId, productId: payload.productId, quantity, reason: payload.reason, status: requiresApproval ? "PENDING" : "CONFIRMED" };
    db.adjustments.unshift(adjustment);
    if (!requiresApproval) {
      const balance = ensureBalance(db, payload.warehouseId, payload.productId);
      balance.onHand += quantity;
      db.movements.unshift({ id: makeId("mov"), date: adjustment.date, type: "ADJUSTMENT", warehouseId: payload.warehouseId, productId: payload.productId, quantity, reference: adjustment.number });
    }
    result = { ok: true, message: requiresApproval ? `${adjustment.number} tasdiqqa yuborildi` : `${adjustment.number} tasdiqlandi`, adjustment };
  });
  return result;
}

export function approveStockAdjustment(adjustmentId) {
  let result = { ok: false, message: "Qoldiq tuzatish topilmadi" };
  updateLocalDb((db) => {
    const adjustment = db.adjustments.find((item) => item.id === adjustmentId);
    if (!adjustment || adjustment.status !== "PENDING") return;
    const balance = ensureBalance(db, adjustment.warehouseId, adjustment.productId);
    balance.onHand += Number(adjustment.quantity || 0);
    adjustment.status = "CONFIRMED";
    db.movements.unshift({ id: makeId("mov"), date: adjustment.date, type: "ADJUSTMENT", warehouseId: adjustment.warehouseId, productId: adjustment.productId, quantity: Number(adjustment.quantity || 0), reference: adjustment.number });
    result = { ok: true, message: `${adjustment.number} tasdiqlandi` };
  });
  return result;
}

export function createTransfer(payload) {
  let result = { ok: false, message: "Ko‘chirish ma’lumoti noto‘g‘ri" };
  updateLocalDb((db) => {
    const quantity = Number(payload.quantity) || 0;
    if (!quantity || payload.fromWarehouseId === payload.toWarehouseId) return;
    const source = ensureBalance(db, payload.fromWarehouseId, payload.productId);
    if (source.onHand - source.reserved < quantity && !db.settings.inventory.allowNegativeStock) {
      result = { ok: false, message: "Manba omborda yetarli qoldiq yo‘q" };
      return;
    }
    const requiresApproval = db.settings.inventory.requireTransferApproval === true;
    const transfer = { id: makeId("trf"), number: nextNumber("TRF", db.transfers), date: new Date().toISOString().slice(0, 10), fromWarehouseId: payload.fromWarehouseId, toWarehouseId: payload.toWarehouseId, productId: payload.productId, quantity, status: requiresApproval ? "PENDING" : "RECEIVED" };
    db.transfers.unshift(transfer);
    if (!requiresApproval) {
      const target = ensureBalance(db, payload.toWarehouseId, payload.productId);
      source.onHand -= quantity;
      target.onHand += quantity;
      db.movements.unshift({ id: makeId("mov"), date: transfer.date, type: "TRANSFER_OUT", warehouseId: payload.fromWarehouseId, productId: payload.productId, quantity: -quantity, reference: transfer.number });
      db.movements.unshift({ id: makeId("mov"), date: transfer.date, type: "TRANSFER_IN", warehouseId: payload.toWarehouseId, productId: payload.productId, quantity, reference: transfer.number });
    }
    result = { ok: true, message: requiresApproval ? `${transfer.number} tasdiqqa yuborildi` : `${transfer.number} ko‘chirildi`, transfer };
  });
  return result;
}

export function approveTransfer(transferId) {
  let result = { ok: false, message: "Ko‘chirish topilmadi" };
  updateLocalDb((db) => {
    const transfer = db.transfers.find((item) => item.id === transferId);
    if (!transfer || transfer.status !== "PENDING") return;
    const source = ensureBalance(db, transfer.fromWarehouseId, transfer.productId);
    const target = ensureBalance(db, transfer.toWarehouseId, transfer.productId);
    if (source.onHand - source.reserved < Number(transfer.quantity) && !db.settings.inventory.allowNegativeStock) {
      result = { ok: false, message: "Tasdiqlash vaqtida manba qoldig‘i yetarli emas" };
      return;
    }
    source.onHand -= Number(transfer.quantity);
    target.onHand += Number(transfer.quantity);
    transfer.status = "RECEIVED";
    db.movements.unshift({ id: makeId("mov"), date: transfer.date, type: "TRANSFER_OUT", warehouseId: transfer.fromWarehouseId, productId: transfer.productId, quantity: -Number(transfer.quantity), reference: transfer.number });
    db.movements.unshift({ id: makeId("mov"), date: transfer.date, type: "TRANSFER_IN", warehouseId: transfer.toWarehouseId, productId: transfer.productId, quantity: Number(transfer.quantity), reference: transfer.number });
    result = { ok: true, message: `${transfer.number} tasdiqlandi` };
  });
  return result;
}

function validateDeliveryProof(db, proof) {
  if (db.settings.delivery.requireRecipientName === true && !String(proof.recipientName || "").trim()) {
    return "Qabul qiluvchi ismini kiriting";
  }
  if (db.settings.delivery.requirePhoto === true && !proof.photo && !proof.photoName) {
    return "Yetkazib berish fotosi talab qilinadi";
  }
  if (db.settings.delivery.requireGps === true && (proof.latitude === null || proof.latitude === undefined)) {
    return "GPS joylashuvini oling";
  }
  if (db.settings.finance.allowCreditSales === false && !proof.paymentMethod) {
    return "Nasiya savdo o‘chirilgan. To‘lov usulini tanlang";
  }
  return "";
}

function getRemainingDeliveryItems(order, delivery) {
  const deliveredMap = new Map((delivery.deliveredItems || []).map((item) => [item.productId, Number(item.quantity) || 0]));
  return order.items
    .map((line) => ({
      ...line,
      quantity: Math.max(0, Number(line.quantity || 0) - Number(deliveredMap.get(line.productId) || 0)),
    }))
    .filter((line) => line.quantity > 0);
}

function amountForDeliveredItems(order, items) {
  const originalSubtotal = order.items.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0);
  const partSubtotal = items.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.price || 0), 0);
  const factor = originalSubtotal > 0 ? Number(order.total || originalSubtotal) / originalSubtotal : 1;
  return Math.round(partSubtotal * factor);
}

function applyDeliveryStock(db, order, items, reference) {
  for (const line of items) {
    const balance = ensureBalance(db, order.warehouseId, line.productId);
    if (balance.onHand < line.quantity && !db.settings.inventory.allowNegativeStock) {
      return { ok: false, message: "Yetkazish uchun ombor qoldig‘i yetarli emas" };
    }
  }

  items.forEach((line) => {
    const balance = ensureBalance(db, order.warehouseId, line.productId);
    balance.onHand -= line.quantity;
    balance.reserved = Math.max(0, balance.reserved - line.quantity);

    let remainingToConsume = Number(line.quantity || 0);
    db.reservations
      .filter((reservation) => reservation.orderId === order.id && reservation.productId === line.productId && reservation.status === "ACTIVE")
      .forEach((reservation) => {
        if (remainingToConsume <= 0) return;
        const used = Math.min(Number(reservation.quantity || 0), remainingToConsume);
        reservation.quantity = Math.max(0, Number(reservation.quantity || 0) - used);
        remainingToConsume -= used;
        if (reservation.quantity <= 0) reservation.status = "CONSUMED";
      });

    db.movements.unshift({
      id: makeId("mov"),
      date: new Date().toISOString().slice(0, 10),
      type: "DELIVERY_OUT",
      warehouseId: order.warehouseId,
      productId: line.productId,
      quantity: -line.quantity,
      reference,
    });
  });
  return { ok: true, message: "" };
}

function createDeliveryFinance(db, order, items, total, paymentMethod) {
  if (total <= 0) return;
  const date = new Date().toISOString().slice(0, 10);
  const paidImmediately = db.settings.finance.allowCreditSales === false;
  const sale = {
    id: makeId("sale"),
    number: nextNumber("SAL", db.sales),
    date,
    channel: "DELIVERY",
    customerId: order.customerId,
    warehouseId: order.warehouseId,
    total,
    paymentStatus: paidImmediately ? "PAID" : "UNPAID",
    orderId: order.id,
    items: items.map((item) => ({ ...item })),
  };
  db.sales.unshift(sale);

  const invoice = {
    id: makeId("inv"),
    number: nextNumber(db.settings.documents?.invoicePrefix || "INV", db.invoices),
    date,
    customerId: order.customerId,
    saleId: sale.id,
    total,
    paid: paidImmediately ? total : 0,
    status: paidImmediately ? "PAID" : "ISSUED",
  };
  db.invoices.unshift(invoice);
  db.ledger.unshift({ id: makeId("led"), date, customerId: order.customerId, type: "INVOICE", debit: total, credit: 0, reference: invoice.number });

  if (paidImmediately) {
    const payment = {
      id: makeId("pay"),
      number: nextNumber(db.settings.documents?.paymentPrefix || "PAY", db.payments),
      date,
      customerId: order.customerId,
      amount: total,
      method: paymentMethod || "CASH",
      status: "CONFIRMED",
      invoiceId: invoice.id,
    };
    db.payments.unshift(payment);
    db.ledger.unshift({ id: makeId("led"), date, customerId: order.customerId, type: "PAYMENT", debit: 0, credit: total, reference: payment.number });
  }
  const customer = db.customers.find((item) => item.id === order.customerId);
  if (customer) customer.debt = getCustomerDebt(db, customer.id);
}

function syncDeliveryWorkflow(db, delivery, order, outcome, message) {
  const trip = db.deliveryTrips.find((item) => item.id === delivery.tripId);
  if (trip) {
    const tripDeliveries = db.deliveries.filter((item) => item.tripId === trip.id);
    const finished = tripDeliveries.every((item) => ["DELIVERED", "FAILED", "CANCELLED"].includes(item.status));
    if (trip.status === "PLANNED") trip.status = "OUT_FOR_DELIVERY";
    if (finished) {
      trip.status = "COMPLETED";
      trip.completedAt = new Date().toISOString();
    }
  }

  const ownerId = order?.requestedBy || getCurrentAuthUser()?.id || "";
  if (ownerId && outcome === "FAILED") {
    addWorkflowNotification(db, {
      userId: ownerId,
      role: "OWNER",
      title: "Yetkazib berishda muammo",
      message,
      type: "WARNING",
      referenceType: "ORDER",
      referenceId: order?.id || delivery.orderId,
      actionPath: "/deliveries",
    });
  }
  addActivity(db, {
    entityType: "ORDER",
    entityId: order?.id || delivery.orderId,
    action: outcome,
    title: message,
    description: delivery.failureReason || "",
    actorId: getCurrentAuthUser()?.id || "system",
    actorName: getCurrentAuthUser()?.name || "Tizim",
  });
}


export function arriveDelivery(deliveryId, location = {}) {
  let result = { ok: false, message: "Yetkazib berish topilmadi" };
  updateLocalDb((db) => {
    const delivery = db.deliveries.find((item) => item.id === deliveryId);
    if (!delivery || ["DELIVERED", "FAILED", "CANCELLED"].includes(delivery.status)) return;
    const trip = db.deliveryTrips.find((item) => item.id === delivery.tripId);
    const order = db.orders.find((item) => item.id === delivery.orderId);
    const now = new Date().toISOString();
    delivery.status = "ARRIVED";
    delivery.arrivedAt = now;
    delivery.arrivalLocation = {
      latitude: location.latitude ?? null,
      longitude: location.longitude ?? null,
    };
    if (trip && trip.status === "PLANNED") {
      trip.status = "OUT_FOR_DELIVERY";
      trip.startedAt = trip.startedAt || now;
    }
    if (order) order.deliveryStatus = "ARRIVED";
    addActivity(db, {
      entityType: "ORDER", entityId: order?.id || delivery.orderId, action: "ARRIVED", title: "Haydovchi manzilga yetib keldi",
      description: order?.number || "Yetkazib berish", actorId: getCurrentAuthUser()?.id || "system", actorName: getCurrentAuthUser()?.name || "Haydovchi",
      metadata: { deliveryId: delivery.id, tripId: delivery.tripId },
    });
    const ownerId = order?.requestedBy || "";
    if (ownerId) addWorkflowNotification(db, {
      userId: ownerId, title: "Haydovchi manzilga yetib keldi", message: `${order?.number || "Buyurtma"} yetkazish nuqtasiga yetib keldi.`,
      type: "INFO", referenceType: "ORDER", referenceId: order?.id || delivery.orderId, actionPath: "/orders",
    });
    result = { ok: true, message: "Manzilga yetib kelganingiz qayd etildi" };
  });
  return result;
}

export function completeDelivery(deliveryId, proof = {}) {
  let result = { ok: false, message: "Yetkazib berish topilmadi" };
  updateLocalDb((db) => {
    const delivery = db.deliveries.find((item) => item.id === deliveryId);
    if (!delivery || delivery.status === "DELIVERED") return;
    const order = db.orders.find((item) => item.id === delivery.orderId);
    if (!order) return;

    const proofError = validateDeliveryProof(db, proof);
    if (proofError) {
      result = { ok: false, message: proofError };
      return;
    }

    const remainingItems = getRemainingDeliveryItems(order, delivery);
    if (!remainingItems.length) {
      delivery.status = "DELIVERED";
      order.deliveryStatus = "DELIVERED";
      order.fulfillmentStatus = "COMPLETED";
      syncDeliveryWorkflow(db, delivery, order, "DELIVERED", `${order.number} to‘liq yetkazildi`);
      result = { ok: true, message: `${order.number} to‘liq yetkazilgan` };
      return;
    }

    const stockResult = applyDeliveryStock(db, order, remainingItems, order.number);
    if (!stockResult.ok) {
      result = stockResult;
      return;
    }

    const remainingTotal = amountForDeliveredItems(order, remainingItems);
    createDeliveryFinance(db, order, remainingItems, remainingTotal, proof.paymentMethod);

    delivery.status = "DELIVERED";
    delivery.deliveredItems = order.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) || 0 }));
    delivery.proof = {
      ...(delivery.proof || {}),
      recipientName: String(proof.recipientName || delivery.proof?.recipientName || "").trim(),
      photo: proof.photo || delivery.proof?.photo || "",
      photoName: proof.photoName || delivery.proof?.photoName || "",
      latitude: proof.latitude ?? delivery.proof?.latitude ?? null,
      longitude: proof.longitude ?? delivery.proof?.longitude ?? null,
      completedAt: new Date().toISOString(),
    };
    order.deliveryStatus = "DELIVERED";
    order.fulfillmentStatus = "COMPLETED";
    syncDeliveryWorkflow(db, delivery, order, "DELIVERED", `${order.number} to‘liq yetkazildi`);
    result = { ok: true, message: `${order.number} to‘liq yetkazildi` };
  });
  return result;
}

export function completePartialDelivery(deliveryId, deliveredItems = [], proof = {}) {
  let result = { ok: false, message: "Qisman yetkazib berish ma’lumoti noto‘g‘ri" };
  updateLocalDb((db) => {
    if (db.settings.delivery.allowPartialDelivery !== true) {
      result = { ok: false, message: "Sozlamalarda qisman yetkazib berish o‘chirilgan" };
      return;
    }
    const delivery = db.deliveries.find((item) => item.id === deliveryId);
    if (!delivery || delivery.status === "DELIVERED") return;
    const order = db.orders.find((item) => item.id === delivery.orderId);
    if (!order) return;

    const proofError = validateDeliveryProof(db, proof);
    if (proofError) {
      result = { ok: false, message: proofError };
      return;
    }

    const remainingItems = getRemainingDeliveryItems(order, delivery);
    const remainingMap = new Map(remainingItems.map((item) => [item.productId, item]));
    const lines = deliveredItems
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(0, Number(item.quantity) || 0),
        price: Number(remainingMap.get(item.productId)?.price || 0),
      }))
      .filter((item) => item.quantity > 0 && remainingMap.has(item.productId));

    if (!lines.length) {
      result = { ok: false, message: "Kamida bitta mahsulot uchun yetkazilgan miqdorni kiriting" };
      return;
    }
    const invalid = lines.find((line) => line.quantity > Number(remainingMap.get(line.productId)?.quantity || 0));
    if (invalid) {
      result = { ok: false, message: "Yetkazilgan miqdor qolgan miqdordan oshmasligi kerak" };
      return;
    }
    const allRemainingDelivered = remainingItems.every((remaining) => {
      const line = lines.find((item) => item.productId === remaining.productId);
      return Number(line?.quantity || 0) >= Number(remaining.quantity || 0);
    });
    if (allRemainingDelivered) {
      result = { ok: false, message: "Barcha qolgan mahsulot yetkazilsa «To‘liq yetkazildi» amalidan foydalaning" };
      return;
    }

    const stockResult = applyDeliveryStock(db, order, lines, order.number);
    if (!stockResult.ok) {
      result = stockResult;
      return;
    }

    const partialTotal = amountForDeliveredItems(order, lines);
    createDeliveryFinance(db, order, lines, partialTotal, proof.paymentMethod);

    const deliveredMap = new Map((delivery.deliveredItems || []).map((item) => [item.productId, Number(item.quantity) || 0]));
    lines.forEach((line) => deliveredMap.set(line.productId, Number(deliveredMap.get(line.productId) || 0) + line.quantity));
    delivery.deliveredItems = [...deliveredMap.entries()].map(([productId, quantity]) => ({ productId, quantity }));
    delivery.status = "PARTIALLY_DELIVERED";
    delivery.partialTotal = Number(delivery.partialTotal || 0) + partialTotal;
    delivery.proof = {
      ...(delivery.proof || {}),
      recipientName: String(proof.recipientName || delivery.proof?.recipientName || "").trim(),
      photo: proof.photo || delivery.proof?.photo || "",
      photoName: proof.photoName || delivery.proof?.photoName || "",
      latitude: proof.latitude ?? delivery.proof?.latitude ?? null,
      longitude: proof.longitude ?? delivery.proof?.longitude ?? null,
      lastPartialAt: new Date().toISOString(),
    };
    order.deliveryStatus = "PARTIALLY_DELIVERED";
    order.fulfillmentStatus = "PARTIAL";
    syncDeliveryWorkflow(db, delivery, order, "PARTIALLY_DELIVERED", `${order.number} qisman yetkazildi`);
    result = { ok: true, message: `${order.number} qisman yetkazildi` };
  });
  return result;
}

export function failDelivery(deliveryId, reason = "") {
  let result = { ok: false, message: "Yetkazib berish topilmadi" };
  updateLocalDb((db) => {
    const delivery = db.deliveries.find((item) => item.id === deliveryId);
    if (!delivery || delivery.status === "DELIVERED") return;
    const cleanReason = String(reason || "").trim();
    if (db.settings.delivery.requireFailureReason === true && !cleanReason) {
      result = { ok: false, message: "Yetkazib berilmaganlik sababini kiriting" };
      return;
    }
    delivery.status = "FAILED";
    delivery.failureReason = cleanReason;
    delivery.failedAt = new Date().toISOString();
    const order = db.orders.find((item) => item.id === delivery.orderId);
    if (order) {
      order.deliveryStatus = "FAILED";
      syncDeliveryWorkflow(db, delivery, order, "FAILED", `${order.number} yetkazib berilmadi`);
    }
    result = { ok: true, message: `${order?.number || "Yetkazib berish"} muammoli holatga o‘tkazildi` };
  });
  return result;
}

function applyPaymentToCustomer(db, payment) {
  const customer = db.customers.find((item) => item.id === payment.customerId);
  if (!customer) return { ok: false, message: "Mijoz topilmadi" };
  const amount = Number(payment.amount || 0);
  if (amount <= 0) return { ok: false, message: "To‘lov summasi noto‘g‘ri" };

  let remaining = amount;
  let firstInvoiceId = "";
  const allocations = [];
  const openInvoices = getCustomerOpenInvoices(db, customer.id);
  openInvoices.forEach((invoice) => {
    if (remaining <= 0) return;
    const due = Math.max(0, Number(invoice.total || 0) - Number(invoice.paid || 0));
    const allocated = Math.min(due, remaining);
    invoice.paid = Number(invoice.paid || 0) + allocated;
    invoice.status = invoice.paid >= invoice.total ? "PAID" : "PARTIALLY_PAID";
    allocations.push({ invoiceId: invoice.id, amount: allocated });
    remaining -= allocated;
    if (!firstInvoiceId) firstInvoiceId = invoice.id;
  });

  if (remaining > 0) customer.advance = Number(customer.advance || 0) + remaining;
  customer.debt = getCustomerDebt(db, customer.id);
  payment.invoiceId = firstInvoiceId;
  payment.allocations = allocations;
  payment.advanceAmount = remaining;
  payment.status = "CONFIRMED";
  db.ledger.unshift({ id: makeId("led"), date: payment.date, customerId: customer.id, type: remaining > 0 ? "PAYMENT_ADVANCE" : "PAYMENT", debit: 0, credit: amount, reference: payment.number });
  return { ok: true, message: "" };
}

export function createManualInvoice(payload) {
  let result = { ok: false, message: "Hisob-faktura ma’lumoti noto‘g‘ri" };
  updateLocalDb((db) => {
    const customer = db.customers.find((item) => item.id === payload.customerId);
    const total = Number(payload.total) || 0;
    if (!customer || total <= 0) return;
    const date = payload.date || new Date().toISOString().slice(0, 10);
    const invoice = {
      id: makeId("inv"),
      number: nextNumber(db.settings.documents?.invoicePrefix || "INV", db.invoices),
      date,
      dueDate: payload.dueDate || date,
      customerId: customer.id,
      total,
      paid: 0,
      status: "ISSUED",
      source: "MANUAL",
      note: String(payload.note || "").trim(),
    };
    db.invoices.unshift(invoice);
    db.ledger.unshift({ id: makeId("led"), date, customerId: customer.id, type: "INVOICE", debit: total, credit: 0, reference: invoice.number });
    const advanceUsed = Math.min(Number(customer.advance || 0), total);
    if (advanceUsed > 0) {
      invoice.paid = advanceUsed;
      invoice.status = advanceUsed >= total ? "PAID" : "PARTIALLY_PAID";
      customer.advance = Math.max(0, Number(customer.advance || 0) - advanceUsed);
      db.ledger.unshift({ id: makeId("led"), date, customerId: customer.id, type: "ADVANCE_ALLOCATION", debit: 0, credit: advanceUsed, reference: invoice.number });
    }
    customer.debt = getCustomerDebt(db, customer.id);
    result = { ok: true, message: `${invoice.number} yaratildi`, invoice };
  });
  return result;
}

export function collectPayment(payload) {
  let result = { ok: false, message: "To‘lov ma’lumoti noto‘g‘ri" };
  updateLocalDb((db) => {
    const amount = Number(payload.amount) || 0;
    const customer = db.customers.find((item) => item.id === payload.customerId);
    if (!customer || amount <= 0) return;
    const currentDebt = getCustomerDebt(db, customer.id);
    const existingAdvance = Number(customer.advance || 0);
    if (currentDebt <= 0 && existingAdvance > 0) {
      result = { ok: false, message: "Mijozda ochiq qarz yo‘q va avans qoldig‘i mavjud" };
      return;
    }

    const requiresConfirmation = db.settings.finance.requirePaymentConfirmation === true;
    const payment = {
      id: makeId("pay"),
      number: nextNumber(db.settings.documents?.paymentPrefix || "PAY", db.payments),
      date: new Date().toISOString().slice(0, 10),
      customerId: customer.id,
      amount,
      method: payload.method || "CASH",
      status: requiresConfirmation ? "PENDING" : "CONFIRMED",
      invoiceId: "",
    };
    db.payments.unshift(payment);

    if (!requiresConfirmation) {
      const applied = applyPaymentToCustomer(db, payment);
      if (!applied.ok) {
        db.payments = db.payments.filter((item) => item.id !== payment.id);
        result = applied;
        return;
      }
    }

    result = { ok: true, message: requiresConfirmation ? `${payment.number} tasdiqqa yuborildi` : `${payment.number} tasdiqlandi`, payment };
  });
  return result;
}

export function approvePayment(paymentId) {
  let result = { ok: false, message: "To‘lov topilmadi" };
  updateLocalDb((db) => {
    const payment = db.payments.find((item) => item.id === paymentId);
    if (!payment || payment.status !== "PENDING") return;
    const applied = applyPaymentToCustomer(db, payment);
    result = applied.ok ? { ok: true, message: `${payment.number} tasdiqlandi` } : applied;
  });
  return result;
}
