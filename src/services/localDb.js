import { useSyncExternalStore } from "react";

import { AUTH_EVENT, DEFAULT_COMPANY_ID, getActiveCompanyId } from "./authService";
import { generateUniqueEan13, generateUniqueSku } from "../utils/productCodes";

const STORAGE_KEY_PREFIX = "qulay.prototype.db.v5.company";
const LEGACY_STORAGE_KEYS = ["qulay.prototype.db.v4", "qulay.prototype.db.v3", "qulay.prototype.db.v2", "qulay.prototype.db.v1"];
const BACKUP_KEY_PREFIX = "qulay.prototype.backup.v5.company";
const EVENT_NAME = "qulay:local-db-change";

const getStorageKey = () => `${STORAGE_KEY_PREFIX}.${getActiveCompanyId() || DEFAULT_COMPANY_ID}`;
const getBackupKey = () => `${BACKUP_KEY_PREFIX}.${getActiveCompanyId() || DEFAULT_COMPANY_ID}`;

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

const seedDb = () => ({
  meta: { version: 5, seededAt: now() },
  // Owner/Admin authentication lives only in authService. Business staff are
  // resource records here and never receive a platform login/workspace.
  users: [
    { id: "emp-manager-demo", name: "Dilshod Rahimov", title: "Savdo menejeri", phone: "+998903333333", roles: ["SALES_MANAGER"], role: "SALES_MANAGER", branch: "Bosh filial", territory: "Chilonzor", image: "", status: "ACTIVE" },
    { id: "emp-agent-demo", name: "Javohir Karimov", title: "Savdo agenti", phone: "+998902222222", roles: ["SALES_AGENT"], role: "SALES_AGENT", branch: "Bosh filial", territory: "Chilonzor / Yunusobod", image: "", status: "ACTIVE" },
    { id: "emp-agent-2-demo", name: "Azizbek Ergashev", title: "Savdo agenti", phone: "+998907002020", roles: ["SALES_AGENT"], role: "SALES_AGENT", branch: "Bosh filial", territory: "Sergeli", image: "", status: "ACTIVE" },
    { id: "emp-driver-demo", name: "Sardor Aliyev", title: "Haydovchi", phone: "+998909017777", roles: ["DELIVERY_DRIVER"], role: "DELIVERY_DRIVER", branch: "Bosh filial", image: "", status: "ACTIVE" },
    { id: "emp-warehouse-demo", name: "Otabek Ismoilov", title: "Omborchi", phone: "+998905555555", roles: ["WAREHOUSE_WORKER"], role: "WAREHOUSE_WORKER", branch: "Bosh filial", warehouseId: "wh-main", image: "", status: "ACTIVE" },
  ],
  roles: [],
  employeeTypes: [
    { id: "etype-agent", code: "SALES_AGENT", name: "Savdo agenti", system: true, status: "ACTIVE" },
    { id: "etype-manager", code: "SALES_MANAGER", name: "Savdo menejeri", system: true, status: "ACTIVE" },
    { id: "etype-driver", code: "DELIVERY_DRIVER", name: "Haydovchi", system: true, status: "ACTIVE" },
    { id: "etype-warehouse", code: "WAREHOUSE_WORKER", name: "Omborchi", system: true, status: "ACTIVE" },
    { id: "etype-other", code: "OTHER", name: "Boshqa xodim", system: true, status: "ACTIVE" },
  ],
  categories: [
    { id: "cat-drinks", name: "Ichimliklar", status: "ACTIVE" },
    { id: "cat-snacks", name: "Shirinliklar", status: "ACTIVE" },
    { id: "cat-dairy", name: "Sut mahsulotlari", status: "ACTIVE" },
    { id: "cat-home", name: "Maishiy kimyo", status: "ACTIVE" },
  ],
  units: [
    { id: "unit-piece", name: "Dona", shortName: "dona" },
    { id: "unit-box", name: "Quti", shortName: "quti" },
    { id: "unit-kg", name: "Kilogramm", shortName: "kg" },
    { id: "unit-liter", name: "Litr", shortName: "l" },
  ],
  priceLists: [
    { id: "pl-retail", name: "Chakana", status: "ACTIVE" },
    { id: "pl-wholesale", name: "Ulgurji", status: "ACTIVE" },
    { id: "pl-vip", name: "VIP", status: "ACTIVE" },
  ],
  products: [
    { id: "prd-cola", name: "Coca-Cola 1.5L", sku: "1001", barcode: "4780010000011", barcodes: ["4780010000011"], image: "", categoryId: "cat-drinks", unitId: "unit-piece", costPrice: 11000, price: 15000, wholesalePrice: 13500, minStock: 20, status: "ACTIVE" },
    { id: "prd-fanta", name: "Fanta 1.5L", sku: "1002", barcode: "4780010000028", barcodes: ["4780010000028"], image: "", categoryId: "cat-drinks", unitId: "unit-piece", costPrice: 10500, price: 14500, wholesalePrice: 13000, minStock: 18, status: "ACTIVE" },
    { id: "prd-water", name: "Suv 1L", sku: "1003", barcode: "4780010000035", barcodes: ["4780010000035"], image: "", categoryId: "cat-drinks", unitId: "unit-piece", costPrice: 3900, price: 6000, wholesalePrice: 5200, minStock: 30, status: "ACTIVE" },
    { id: "prd-cookie", name: "Pechenye 450g", sku: "2001", barcode: "4780020000018", barcodes: ["4780020000018"], image: "", categoryId: "cat-snacks", unitId: "unit-piece", costPrice: 15500, price: 22000, wholesalePrice: 19500, minStock: 15, status: "ACTIVE" },
    { id: "prd-milk", name: "Sut 1L", sku: "3001", barcode: "4780030000015", barcodes: ["4780030000015"], image: "", categoryId: "cat-dairy", unitId: "unit-piece", costPrice: 8200, price: 12000, wholesalePrice: 10800, minStock: 20, status: "ACTIVE" },
    { id: "prd-cleaner", name: "Tozalash vositasi", sku: "4001", barcode: "4780040000012", barcodes: ["4780040000012"], image: "", categoryId: "cat-home", unitId: "unit-piece", costPrice: 23000, price: 32000, wholesalePrice: 28500, minStock: 10, status: "ACTIVE" },
  ],
  warehouses: [
    { id: "wh-main", name: "Markaziy ombor", branch: "Bosh filial", address: "Shayxontohur, Toshkent", latitude: 41.3155, longitude: 69.2401, status: "ACTIVE" },
    { id: "wh-pos", name: "Kassa ombori", branch: "Bosh filial", address: "Chilonzor, Toshkent", latitude: 41.2852, longitude: 69.2039, status: "ACTIVE" },
  ],
  balances: [
    { id: "bal-1", warehouseId: "wh-main", productId: "prd-cola", onHand: 120, reserved: 20 },
    { id: "bal-2", warehouseId: "wh-main", productId: "prd-fanta", onHand: 82, reserved: 20 },
    { id: "bal-3", warehouseId: "wh-main", productId: "prd-water", onHand: 210, reserved: 24 },
    { id: "bal-4", warehouseId: "wh-main", productId: "prd-cookie", onHand: 46, reserved: 10 },
    { id: "bal-5", warehouseId: "wh-main", productId: "prd-milk", onHand: 19, reserved: 4 },
    { id: "bal-6", warehouseId: "wh-main", productId: "prd-cleaner", onHand: 13, reserved: 0 },
    { id: "bal-7", warehouseId: "wh-pos", productId: "prd-cola", onHand: 34, reserved: 0 },
    { id: "bal-8", warehouseId: "wh-pos", productId: "prd-fanta", onHand: 28, reserved: 0 },
    { id: "bal-9", warehouseId: "wh-pos", productId: "prd-water", onHand: 55, reserved: 0 },
  ],
  customers: [
    { id: "cus-1", name: "Baraka Market", phone: "+998 90 111 22 33", address: "Chilonzor, Toshkent", latitude: 41.2758, longitude: 69.2034, territory: "Chilonzor", priceListId: "pl-wholesale", agentId: "agt-1", debt: 1850000, creditLimit: 5000000, customerType: "ORGANIZATION", taxId: "", category: "A", image: "", status: "ACTIVE" },
    { id: "cus-2", name: "Safia Mini Market", phone: "+998 90 222 33 44", address: "Sergeli, Toshkent", latitude: 41.2243, longitude: 69.2203, territory: "Sergeli", priceListId: "pl-vip", agentId: "agt-2", debt: 620000, creditLimit: 3000000, customerType: "ORGANIZATION", taxId: "", category: "B", image: "", status: "ACTIVE" },
    { id: "cus-3", name: "Yangi Hayot Do‘koni", phone: "+998 90 333 44 55", address: "Yunusobod, Toshkent", latitude: 41.3662, longitude: 69.2860, territory: "Yunusobod", priceListId: "pl-wholesale", agentId: "agt-1", debt: 0, creditLimit: 2500000, customerType: "ORGANIZATION", taxId: "", category: "B", image: "", status: "ACTIVE" },
  ],
  suppliers: [
    { id: "sup-1", name: "Global Drinks", phone: "+998 71 200 10 10", contact: "Akmal", image: "", status: "ACTIVE" },
    { id: "sup-2", name: "Fresh Foods", phone: "+998 71 210 20 20", contact: "Dilshod", image: "", status: "ACTIVE" },
  ],
  contacts: [
    { id: "cnt-1", partnerType: "CUSTOMER", partnerId: "cus-1", name: "Rustam", position: "Do‘kon rahbari", phone: "+998 90 111 22 34" },
    { id: "cnt-2", partnerType: "SUPPLIER", partnerId: "sup-1", name: "Akmal", position: "Savdo menejeri", phone: "+998 90 555 20 20" },
  ],
  agents: [
    { id: "agt-1", employeeId: "emp-agent-demo", name: "Javohir Karimov", phone: "+998 90 700 10 10", territory: "Chilonzor / Yunusobod", latitude: 41.2848, longitude: 69.2122, activityStatus: "VISITING", status: "ACTIVE", visitsToday: 8, plannedVisitsToday: 12, ordersToday: 5, paymentsToday: 850000, salesToday: 3240000 },
    { id: "agt-2", employeeId: "emp-agent-2-demo", name: "Azizbek Ergashev", phone: "+998 90 700 20 20", territory: "Sergeli", latitude: 41.2389, longitude: 69.2312, activityStatus: "ON_ROUTE", status: "ACTIVE", visitsToday: 6, plannedVisitsToday: 10, ordersToday: 4, paymentsToday: 420000, salesToday: 2180000 },
  ],
  territories: [
    { id: "ter-1", name: "Chilonzor", agentId: "agt-1", customers: 22 },
    { id: "ter-2", name: "Yunusobod", agentId: "agt-1", customers: 17 },
    { id: "ter-3", name: "Sergeli", agentId: "agt-2", customers: 25 },
  ],
  visits: [
    { id: "vis-1", date: today(), agentId: "agt-1", customerId: "cus-1", status: "COMPLETED", checkIn: "09:12", checkOut: "09:29", result: "ORDER_CREATED" },
    { id: "vis-2", date: today(), agentId: "agt-2", customerId: "cus-2", status: "COMPLETED", checkIn: "10:04", checkOut: "10:18", result: "PAYMENT_COLLECTED" },
  ],
  orders: [
    { id: "ord-1", number: "ORD-2026-0001", date: today(), customerId: "cus-1", agentId: "agt-1", warehouseId: "wh-main", status: "CONFIRMED", fulfillmentStatus: "RESERVED", deliveryStatus: "PLANNED", total: 465000, items: [{ productId: "prd-cola", quantity: 20, price: 13500 }, { productId: "prd-cookie", quantity: 10, price: 19500 }] },
    { id: "ord-2", number: "ORD-2026-0002", date: today(), customerId: "cus-2", agentId: "agt-2", warehouseId: "wh-main", status: "CONFIRMED", fulfillmentStatus: "PICKING", deliveryStatus: "PLANNED", total: 260000, items: [{ productId: "prd-fanta", quantity: 20, price: 13000 }] },
  ],
  sales: [
    { id: "sale-1", number: "SAL-2026-0001", date: today(), channel: "DELIVERY", customerId: "cus-3", warehouseId: "wh-main", total: 378000, paymentStatus: "PAID", items: [{ productId: "prd-cola", quantity: 14, price: 13500 }, { productId: "prd-water", quantity: 35, price: 5400 }] },
  ],
  returns: [],
  heldCarts: [],
  goodsReceipts: [
    { id: "rec-1", number: "GR-2026-0001", date: today(), supplierId: "sup-1", warehouseId: "wh-main", status: "CONFIRMED", total: 3200000, items: [{ productId: "prd-cola", quantity: 100, cost: 11000 }] },
  ],
  movements: [
    { id: "mov-1", date: today(), type: "GOODS_RECEIPT", warehouseId: "wh-main", productId: "prd-cola", quantity: 100, reference: "GR-2026-0001" },
    { id: "mov-2", date: today(), type: "SALE", warehouseId: "wh-main", productId: "prd-cola", quantity: -14, reference: "SAL-2026-0001" },
  ],
  reservations: [
    { id: "res-1", orderId: "ord-1", warehouseId: "wh-main", productId: "prd-cola", quantity: 20, status: "ACTIVE" },
    { id: "res-2", orderId: "ord-1", warehouseId: "wh-main", productId: "prd-cookie", quantity: 10, status: "ACTIVE" },
    { id: "res-3", orderId: "ord-2", warehouseId: "wh-main", productId: "prd-fanta", quantity: 20, status: "ACTIVE" },
  ],
  transfers: [],
  inventoryCounts: [],
  adjustments: [],
  routeTemplates: [
    { id: "rt-1", name: "Chilonzor Dushanba", agentId: "agt-1", day: "Dushanba", stops: ["cus-1", "cus-3"] },
    { id: "rt-2", name: "Sergeli Seshanba", agentId: "agt-2", day: "Seshanba", stops: ["cus-2"] },
  ],
  routePlans: [
    { id: "rp-1", date: today(), name: "Bugungi Chilonzor", agentId: "agt-1", status: "IN_PROGRESS", stops: [{ customerId: "cus-1", status: "DONE" }, { customerId: "cus-3", status: "PENDING" }] },
  ],
  pickLists: [
    { id: "pick-1", number: "PICK-0001", orderId: "ord-1", status: "RESERVED", progress: 0 },
    { id: "pick-2", number: "PICK-0002", orderId: "ord-2", status: "PICKING", progress: 55 },
  ],
  deliveryTrips: [
    { id: "trip-1", number: "TRIP-0001", date: today(), driver: "Sardor Aliyev", driverEmployeeId: "emp-driver-demo", driverPhone: "+998 90 901 77 77", vehicle: "01 A 777 AA", warehouseId: "wh-main", status: "OUT_FOR_DELIVERY", deliveries: 1, startedAt: "09:10", plannedKm: 38, plannedMinutes: 155 },
  ],
  deliveries: [
    { id: "del-1", orderId: "ord-1", tripId: "trip-1", customerId: "cus-1", stopOrder: 1, status: "OUT_FOR_DELIVERY", total: 465000 },
  ],
  invoices: [
    { id: "inv-1", number: "INV-2026-0001", date: today(), customerId: "cus-3", saleId: "sale-1", total: 378000, paid: 378000, status: "PAID" },
  ],
  payments: [
    { id: "pay-1", number: "PAY-2026-0001", date: today(), customerId: "cus-3", amount: 378000, method: "CASH", status: "CONFIRMED", invoiceId: "inv-1" },
  ],
  ledger: [
    { id: "led-1", date: today(), customerId: "cus-3", type: "INVOICE", debit: 378000, credit: 0, reference: "INV-2026-0001" },
    { id: "led-2", date: today(), customerId: "cus-3", type: "PAYMENT", debit: 0, credit: 378000, reference: "PAY-2026-0001" },
  ],
  approvals: [],
  workflowNotifications: [],
  salaryKpi: [
    { id: "kpi-agent-demo", employeeId: "emp-agent-demo", employeeName: "Javohir Karimov", role: "SALES_AGENT", month: today().slice(0, 7), baseSalary: 3500000, kpiTarget: 100, kpiActual: 82, kpiBonus: 900000, salesBonus: 324000, penalties: 0 },
    { id: "kpi-driver-demo", employeeId: "emp-driver-demo", employeeName: "Sardor Aliyev", role: "DELIVERY_DRIVER", month: today().slice(0, 7), baseSalary: 3200000, kpiTarget: 100, kpiActual: 88, kpiBonus: 500000, salesBonus: 0, penalties: 0 },
  ],
  salaryPayments: [
    { id: "salary-pay-agent-prev", employeeId: "emp-agent-demo", employeeName: "Javohir Karimov", month: "2026-07", baseSalary: 3500000, kpiBonusEarned: 720000, salesBonus: 280000, adjustments: 0, penalties: 100000, total: 4400000, status: "PAID", paidAt: "2026-08-05T09:00:00.000Z" },
    { id: "salary-pay-driver-prev", employeeId: "emp-driver-demo", employeeName: "Sardor Aliyev", month: "2026-07", baseSalary: 3200000, kpiBonusEarned: 430000, salesBonus: 0, adjustments: 100000, penalties: 0, total: 3730000, status: "PAID", paidAt: "2026-08-05T09:00:00.000Z" },
  ],
  currencyRates: {
    source: "Google Finance",
    status: "FALLBACK",
    updatedAt: null,
    rates: { UZS: 1, USD: 11914.62, EUR: 13754, RUB: 146.59, GBP: 16029.04, CNY: 1758.53, AED: 3244.28 },
    errors: {},
  },
  settings: {
    appearance: {
      primaryColor: "#0a2a43",
      themeMode: "light",
      pageBackground: "#faf9f6",
      surfaceColor: "#ffffff",
      baseFontSize: 15,
      headingSize: 31,
      headingWeight: 720,
      cardRadius: 16,
      controlRadius: 10,
      sidebarWidth: 236,
      topbarHeight: 68,
      motion: "subtle",
      contentWidth: "fluid",
      sidebarDensity: "comfortable",
      tableDensity: "comfortable",
      cardShadow: "premium",
      borderStrength: "soft",
      showDescriptions: true,
      showBreadcrumbs: true,
      stickySectionNavigation: true,
      showTableSummary: true,
    },
    company: { name: "Qulay namunaviy kompaniya", logo: "", currency: "UZS", language: "uz", timezone: "Asia/Tashkent", branch: "Bosh filial", defaultWarehouseId: "wh-main" },
    modules: { sales: true, pos: true, catalog: true, inventory: true, partners: true, agents: true, routes: true, fulfillment: true, delivery: true, finance: true, reports: true },
    sales: { autoConfirmOrders: true, allowNegativeStock: false, maxAgentDiscount: 5, requireOwnerApprovalForAdminOrders: false, allowOrderEdit: true, showStockOnOrder: true, warnCustomerDebt: true },
    pos: { warehouseId: "wh-main", priceListId: "pl-retail", allowAnonymousCustomer: true, showImages: true, printReceipt: false, barcodeAutoAdd: true, clearCartAfterSale: true, showStockBadge: true, allowHeldCarts: true },
    inventory: { allowNegativeStock: false, reservations: true, lowStockAlerts: true, requireTransferApproval: false, requireAdjustmentApproval: true },
    agents: { requireGpsCheckIn: false, requireGpsCheckOut: false, allowOutsideRoute: true, allowCreateCustomer: true, allowCollectPayment: true, showDailyProgress: true },
    delivery: { allowPartialDelivery: true, requireFailureReason: true, requireRecipientName: true, requirePhoto: false, requireGps: false, showDriverWorkload: true },
    finance: { allowCreditSales: true, enforceCreditLimit: false, blockOverdueOrders: false, requirePaymentConfirmation: false },
    documents: { orderPrefix: "ORD", invoicePrefix: "INV", paymentPrefix: "PAY", returnPrefix: "RET", showCompanyLogo: true },
    locale: { language: "uz", dateFormat: "DD.MM.YYYY", timeFormat: "24h", currencyDisplay: "symbol" },
    notifications: { lowStock: true, overdueDebt: true, failedDelivery: true, payment: true, newOrder: true, browser: true, sound: false },
    workforce: { salaryPayDay: 5, workdayStart: "09:00", workdayEnd: "18:00" },
    maps: { provider: "YANDEX", defaultZoom: 12, showTraffic: false, navigationApp: "ASK", geofenceMeters: 250 },
    currency: { provider: "GOOGLE_FINANCE", showInHeader: true, headerCurrencies: ["USD", "EUR"], autoRefreshMinutes: 30 },
    mobile: { installPrompt: true, autoLockMinutes: 0, pinEnabled: false, pinHash: "", cameraScanner: true, offlineReady: true, compactBottomNav: true },
  },
});

let cache;
let cacheStorageKey;

function deepMergeDefaults(defaultValue, currentValue) {
  if (Array.isArray(defaultValue)) return Array.isArray(currentValue) ? currentValue : defaultValue;
  if (!defaultValue || typeof defaultValue !== "object") return currentValue ?? defaultValue;
  const current = currentValue && typeof currentValue === "object" && !Array.isArray(currentValue) ? currentValue : {};
  return Object.fromEntries(
    Object.entries(defaultValue).map(([key, value]) => [key, deepMergeDefaults(value, current[key])])
      .concat(Object.entries(current).filter(([key]) => !(key in defaultValue))),
  );
}

function normalizeDb(value) {
  const defaults = seedDb();
  const merged = deepMergeDefaults(defaults, value);

  // Visual migration: the old green/default-light palette is replaced by Qulay's
  // premium navy identity while preserving deliberately customized company colors.
  const appearance = merged.settings?.appearance;
  if (appearance) {
    const primary = String(appearance.primaryColor || "").toLowerCase();
    if (!primary || primary === "#22b455") appearance.primaryColor = "#0a2a43";
    if (!appearance.pageBackground || ["#f5f8f6", "#f7f9f8"].includes(String(appearance.pageBackground).toLowerCase())) appearance.pageBackground = "#faf9f6";
    if (!appearance.surfaceColor) appearance.surfaceColor = "#ffffff";
  }

  // Owner-only prototype: authentication accounts live in authService only.
  // Older LocalStorage snapshots may still contain Owner/employee auth records;
  // convert them into resource-only employees without creating duplicate identities.
  const loginRoles = new Set(["OWNER", "ADMIN", "SUPER_ADMIN"]);
  merged.users = (merged.users || [])
    .filter((employee) => {
      const roles = Array.isArray(employee.roles) ? employee.roles : [employee.role].filter(Boolean);
      return !roles.some((role) => loginRoles.has(role));
    })
    .map((employee) => {
      const resource = { ...employee };
      delete resource.authUserId;
      delete resource.password;
      delete resource.temporaryPassword;
      return { image: "", status: "ACTIVE", ...resource };
    });
  merged.roles = [];

  const employeeByLegacyReference = (reference, name) => (merged.users || []).find((employee) =>
    employee.id === reference || String(employee.name || "").trim().toLowerCase() === String(name || "").trim().toLowerCase(),
  );

  merged.agents = (merged.agents || []).map((agent) => {
    let employee = employeeByLegacyReference(agent.employeeId || agent.authUserId, agent.name);
    if (!employee) {
      employee = {
        id: makeId("emp"),
        name: agent.name || "Savdo agenti",
        title: "Savdo agenti",
        phone: agent.phone || "",
        image: agent.image || "",
        roles: ["SALES_AGENT"],
        role: "SALES_AGENT",
        branch: agent.branch || "Bosh filial",
        warehouseId: agent.warehouseId || "",
        territory: agent.territory || "",
        address: agent.address || "",
        latitude: agent.latitude ?? null,
        longitude: agent.longitude ?? null,
        status: agent.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        migratedAt: now(),
      };
      merged.users.push(employee);
    }
    const resourceAgent = { ...agent };
    delete resourceAgent.authUserId;
    return { ...resourceAgent, employeeId: employee.id, image: resourceAgent.image || employee.image || "" };
  });

  merged.deliveryTrips = (merged.deliveryTrips || []).map((trip) => {
    let employee = employeeByLegacyReference(trip.driverEmployeeId || trip.driverAuthUserId, trip.driver);
    if (!employee && trip.driver) {
      employee = {
        id: makeId("emp"),
        name: trip.driver,
        title: "Haydovchi",
        phone: trip.driverPhone || "",
        image: "",
        roles: ["DELIVERY_DRIVER"],
        role: "DELIVERY_DRIVER",
        branch: "Bosh filial",
        warehouseId: trip.warehouseId || "",
        territory: "",
        status: "ACTIVE",
        migratedAt: now(),
      };
      merged.users.push(employee);
    }
    const resourceTrip = { ...trip };
    delete resourceTrip.driverAuthUserId;
    return { ...resourceTrip, driverEmployeeId: employee?.id || resourceTrip.driverEmployeeId || "" };
  });

  const migrateEmployeeFinance = (records = []) => records.map((record) => {
    const employee = employeeByLegacyReference(record.employeeId || record.authUserId, record.employeeName);
    const resource = { ...record };
    delete resource.authUserId;
    return { ...resource, employeeId: employee?.id || resource.employeeId || "" };
  });
  merged.salaryKpi = migrateEmployeeFinance(merged.salaryKpi || []);
  merged.salaryPayments = migrateEmployeeFinance(merged.salaryPayments || []);

  const productsSoFar = [];
  merged.products = (merged.products || []).map((product) => {
    const normalized = { ...product };
    if (!normalized.sku) normalized.sku = generateUniqueSku([...productsSoFar, ...merged.products], normalized.id);
    const rawBarcodes = Array.isArray(normalized.barcodes) ? normalized.barcodes : [normalized.barcode];
    normalized.barcodes = Array.from(new Set(rawBarcodes.map((value) => String(value || "").trim()).filter(Boolean)));
    if (!normalized.barcodes.length) normalized.barcodes = [generateUniqueEan13([...productsSoFar, ...merged.products], normalized.id)];
    normalized.barcode = normalized.barcodes[0];
    normalized.image = String(normalized.image || "");
    if (!Number.isFinite(Number(normalized.costPrice))) {
      const receiptItems = (merged.goodsReceipts || [])
        .flatMap((receipt) => receipt.items || [])
        .filter((item) => item.productId === normalized.id && Number(item.quantity) > 0 && Number(item.cost) > 0);
      const qty = receiptItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const valueTotal = receiptItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.cost || 0), 0);
      normalized.costPrice = qty > 0 ? Math.round((valueTotal / qty) * 100) / 100 : 0;
    }
    productsSoFar.push(normalized);
    return normalized;
  });

  merged.employeeTypes = (merged.employeeTypes || defaults.employeeTypes).map((type) => ({ ...type, status: type.status || "ACTIVE" }));
  merged.customers = (merged.customers || []).map((customer) => ({ customerType: "ORGANIZATION", taxId: "", category: "", image: "", ...customer }));
  merged.suppliers = (merged.suppliers || []).map((supplier) => ({ image: "", ...supplier }));

  if (merged.settings?.sales) {
    delete merged.settings.sales.requireManagerApproval;
    delete merged.settings.sales.orderApprovalRole;
  }
  if (merged.settings?.mobile?.pinEnabled && !merged.settings.mobile.pinHash) {
    merged.settings.mobile.pinEnabled = false;
    merged.settings.mobile.autoLockMinutes = 0;
  }

  // POS always needs a real active warehouse. Older demos used a partial "wh-pos"
  // stock that made half of the catalog look unavailable.
  const activeWarehouses = (merged.warehouses || []).filter((warehouse) => warehouse.status === "ACTIVE");
  const configuredPosId = merged.settings?.pos?.warehouseId;
  const defaultWarehouseId = merged.settings?.company?.defaultWarehouseId;
  const configuredExists = activeWarehouses.some((warehouse) => warehouse.id === configuredPosId);
  const defaultExists = activeWarehouses.some((warehouse) => warehouse.id === defaultWarehouseId);
  if (!configuredExists || configuredPosId === "wh-pos") {
    merged.settings.pos.warehouseId = defaultExists ? defaultWarehouseId : (activeWarehouses[0]?.id || "");
  }

  merged.balances = (merged.balances || []).map((balance) => ({
    ...balance,
    onHand: Number(balance.onHand || 0),
    reserved: Math.max(0, Number(balance.reserved || 0)),
  }));
  merged.approvals = merged.approvals || [];
  // Employee self-service workspaces/tasks were removed from the Owner-only product.
  delete merged.workSessions;
  delete merged.employeeTasks;
  if (merged.settings?.workforce) {
    delete merged.settings.workforce.taskReminderMinutes;
    delete merged.settings.workforce.overdueEscalationMinutes;
  }
  merged.workflowNotifications = merged.workflowNotifications || [];
  merged.activityLog = merged.activityLog || [];
  merged.meta = { ...merged.meta, version: 5, lastOpenedAt: now() };
  return merged;
}

function safeWrite(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Qulay mahalliy xotirasiga yozib bo‘lmadi:", error);
    return false;
  }
}

function readStorage() {
  if (typeof window === "undefined") return seedDb();
  const storageKey = getStorageKey();
  let raw = window.localStorage.getItem(storageKey);

  if (!raw && getActiveCompanyId() === DEFAULT_COMPANY_ID) {
    raw = LEGACY_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
  }

  if (!raw) {
    const seeded = seedDb();
    safeWrite(storageKey, seeded);
    return seeded;
  }

  try {
    const normalized = normalizeDb(JSON.parse(raw));
    safeWrite(storageKey, normalized);
    return normalized;
  } catch (error) {
    console.error("Qulay saqlangan ma’lumotini o‘qib bo‘lmadi. Boshlang‘ich holat tiklandi:", error);
    const seeded = seedDb();
    safeWrite(storageKey, seeded);
    return seeded;
  }
}

function getSnapshot() {
  const storageKey = getStorageKey();
  if (!cache || cacheStorageKey !== storageKey) {
    cacheStorageKey = storageKey;
    cache = readStorage();
  }
  return cache;
}

function emitChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

export function setLocalDb(nextDb) {
  cache = normalizeDb(nextDb);
  cacheStorageKey = getStorageKey();
  safeWrite(cacheStorageKey, cache);
  emitChange();
  return cache;
}

export function updateLocalDb(mutator) {
  const current = getSnapshot();
  const draft = typeof structuredClone === "function"
    ? structuredClone(current)
    : JSON.parse(JSON.stringify(current));
  const result = mutator(draft) || draft;
  return setLocalDb(result);
}

export function subscribeLocalDb(listener) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event) => {
    if (event.key === getStorageKey()) {
      cache = readStorage();
      cacheStorageKey = getStorageKey();
      listener();
    }
  };
  const handleLocal = () => listener();
  window.addEventListener("storage", handleStorage);
  const handleAuth = () => { cache = undefined; cacheStorageKey = undefined; listener(); };
  window.addEventListener(EVENT_NAME, handleLocal);
  window.addEventListener(AUTH_EVENT, handleAuth);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(EVENT_NAME, handleLocal);
    window.removeEventListener(AUTH_EVENT, handleAuth);
  };
}

export function useLocalDb(selector = (db) => db) {
  const db = useSyncExternalStore(subscribeLocalDb, getSnapshot, getSnapshot);
  return selector(db);
}

export function makeId(prefix = "id") {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function nextNumber(prefix, collection) {
  const year = new Date().getFullYear();
  const sequence = String((collection?.length || 0) + 1).padStart(4, "0");
  return `${prefix}-${year}-${sequence}`;
}

export function addLocalRecord(collectionName, record) {
  let created;
  updateLocalDb((db) => {
    created = { id: record.id || makeId(collectionName.slice(0, 3)), ...record };
    db[collectionName] = [created, ...(db[collectionName] || [])];
  });
  return created;
}

export function updateLocalRecord(collectionName, id, patch) {
  updateLocalDb((db) => {
    db[collectionName] = (db[collectionName] || []).map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    );
  });
}

export function removeLocalRecord(collectionName, id) {
  updateLocalDb((db) => {
    db[collectionName] = (db[collectionName] || []).filter((item) => item.id !== id);
  });
}

export function resetLocalDb() {
  return setLocalDb(seedDb());
}

export function createLocalBackup() {
  const snapshot = getSnapshot();
  safeWrite(getBackupKey(), snapshot);
  return snapshot;
}

export function restoreLocalBackup() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getBackupKey());
  if (!raw) return null;
  try {
    return setLocalDb(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function exportLocalDb() {
  return JSON.stringify(getSnapshot(), null, 2);
}

export function importLocalDb(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.products) || !parsed.settings) {
    throw new Error("Tanlangan fayl Qulay ma’lumotlar bazasi formatiga mos emas.");
  }
  createLocalBackup();
  return setLocalDb(parsed);
}

export function initializeCompanyDb({ company }) {
  const db = seedDb();
  const keep = ["roles", "currencyRates", "settings"];
  for (const key of Object.keys(db)) {
    if (Array.isArray(db[key]) && !keep.includes(key)) db[key] = [];
  }
  db.meta = { version: 5, seededAt: now(), companyId: company.id };
  db.users = [];
  db.warehouses = [{ id: "wh-main", name: "Asosiy ombor", branch: "Bosh filial", address: "", latitude: null, longitude: null, status: "ACTIVE" }];
  db.settings.company = { ...db.settings.company, name: company.name, branch: "Bosh filial", defaultWarehouseId: "wh-main" };
  const key = `${STORAGE_KEY_PREFIX}.${company.id}`;
  safeWrite(key, db);
  cache = db;
  cacheStorageKey = key;
  emitChange();
  return db;
}

export function resetLocalDbCache() {
  cache = undefined;
  cacheStorageKey = undefined;
  emitChange();
}

export { STORAGE_KEY_PREFIX, BACKUP_KEY_PREFIX };
