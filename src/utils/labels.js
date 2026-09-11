const labels = {
  ASSIGNED: "Biriktirilgan",
  SEEN: "Ko‘rildi",
  ACCEPTED: "Qabul qilindi",
  AWAITING_ACCEPTANCE: "Xodim qarori kutilmoqda",
  CHANGES_REQUESTED: "O‘zgartirish so‘raldi",
  ARRIVED: "Manzilga yetib keldi",
  WAITING: "Kutilmoqda",
  BLOCKED: "Bloklangan",
  URGENT: "Shoshilinch",
  HIGH: "Yuqori",
  NORMAL: "Oddiy",
  LOW: "Past",
  EMPLOYEE_TASK: "Xodim vazifasi",
  PICK_LIST: "Yig‘ish varaqasi",
  PICKING_TASK: "Yig‘ish vazifasi",
  ACTIVE: "Faol",
  INACTIVE: "Nofaol",
  DRAFT: "Qoralama",
  SUBMITTED: "Yuborilgan",
  CONFIRMED: "Tasdiqlangan",
  CANCELLED: "Bekor qilingan",
  NOT_STARTED: "Boshlanmagan",
  RESERVED: "Band qilingan",
  PICKING: "Yig‘ilmoqda",
  PICKED: "Yig‘ib bo‘lindi",
  PACKING: "Qadoqlanmoqda",
  PACKED: "Qadoqlangan",
  READY: "Yetkazishga tayyor",
  PARTIAL: "Qisman",
  COMPLETED: "Yakunlangan",
  PLANNED: "Rejalashtirilgan",
  OUT_FOR_DELIVERY: "Yetkazilmoqda",
  DELIVERED: "Yetkazilgan",
  PARTIALLY_DELIVERED: "Qisman yetkazilgan",
  FAILED: "Muvaffaqiyatsiz",
  ISSUED: "Chiqarilgan",
  PARTIALLY_PAID: "Qisman to‘langan",
  PAID: "To‘langan",
  UNPAID: "To‘lanmagan",
  OVERDUE: "Muddati o‘tgan",
  PENDING: "Kutilmoqda",
  REFUNDED: "Qaytarilgan",
  INSPECTING: "Tekshirilmoqda",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad etilgan",
  RECEIVED: "Qabul qilingan",
  SENT: "Jo‘natilgan",
  IN_PROGRESS: "Jarayonda",
  DONE: "Bajarilgan",
  OK: "Yaxshi",
  LOW_STOCK: "Kam qoldiq",
  OUT_OF_STOCK: "Tugagan",
  OVER_LIMIT: "Limitdan oshgan",
  OPEN: "Qarzdor",
  CLEAR: "Qarzi yo‘q",
  RETAIL: "Sotuv narxi",
  WHOLESALE: "Tannarx",
  VIP: "VIP",
  PROMO: "Aksiya",
  CUSTOM: "Maxsus",
  CASH: "Naqd",
  CARD: "Karta",
  BANK: "Bank o‘tkazmasi",
  BANK_TRANSFER: "Bank o‘tkazmasi",
  OTHER: "Boshqa",
  GOODS_RECEIPT: "Mahsulot kirimi",
  OPENING_BALANCE: "Boshlang‘ich qoldiq",
  SALE: "Sotuv",
  POS_SALE: "Tezkor kassa sotuvi",
  DELIVERY_OUT: "Yetkazib berish chiqimi",
  TRANSFER_OUT: "Ombordan ko‘chirish",
  TRANSFER_IN: "Omborga ko‘chirish",
  ADJUSTMENT: "Qoldiq tuzatish",
  RETURN: "Qaytarish",
  INVOICE: "Hisob-faktura",
  PAYMENT: "To‘lov",
  CREDIT_NOTE: "Qaytarma hisob",
  ORDER_CREATED: "Buyurtma yaratildi",
  ORDER: "Buyurtma",
  PAYMENT_COLLECTED: "To‘lov olindi",
  DELIVERY: "Yetkazib berish",
  POS: "Tezkor kassa",
  OWNER: "Ega",
  ADMIN: "Tizim boshqaruvchisi",
  SALES_MANAGER: "Savdo menejeri",
  SALES_AGENT: "Savdo agenti",
  WAREHOUSE_WORKER: "Omborchi",
  DELIVERY_MANAGER: "Yetkazib berish boshqaruvchisi",
  DELIVERY_DRIVER: "Haydovchi",
  ACCOUNTANT: "Hisobchi",
  AUDITOR: "Nazoratchi",
};

export function getLabel(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return labels[String(value)] || String(value).replaceAll("_", " ");
}

export function getStatusTone(status) {
  const value = String(status || "").toUpperCase();
  if (["ACTIVE", "PAID", "CONFIRMED", "COMPLETED", "READY", "DELIVERED", "RECEIVED", "DONE", "OK", "APPROVED"].includes(value)) return "success";
  if (["PICKING", "PICKED", "PACKING", "PLANNED", "PENDING", "RESERVED", "OUT_FOR_DELIVERY", "ARRIVED", "IN_PROGRESS", "PARTIAL", "PARTIALLY_PAID", "PARTIALLY_DELIVERED", "SUBMITTED", "INSPECTING", "SENT"].includes(value)) return "warning";
  if (["CANCELLED", "FAILED", "REJECTED", "OVERDUE", "INACTIVE", "OUT_OF_STOCK"].includes(value)) return "danger";
  return "neutral";
}

export function getPaymentMethodLabel(value, methods = []) {
  const custom = methods.find((item) => item.code === value);
  if (custom) return custom.name;
  return getLabel(value, "Noma’lum");
}

export function getMovementTypeLabel(value) {
  return getLabel(value, "Noma’lum");
}

export function getMovementSourceLabel(type, reference = "") {
  const action = {
    GOODS_RECEIPT: "Mahsulot kirimi", OPENING_BALANCE: "Boshlang‘ich qoldiq", SALE: "Sotuv", POS_SALE: "Tezkor kassa sotuvi",
    DELIVERY_OUT: "Yetkazib berildi", TRANSFER_OUT: "Ombordan ko‘chirildi", TRANSFER_IN: "Omborga qabul qilindi",
    ADJUSTMENT: "Qoldiq tuzatildi", RETURN: "Qaytarildi",
  }[String(type || "")] || getMovementTypeLabel(type);
  return { action, reference: String(reference || "").trim() };
}

export function getRoleLabel(value) {
  return getLabel(value, "Noma’lum");
}
