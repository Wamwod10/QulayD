import { useEffect, useSyncExternalStore } from "react";

import { apiRequest, AUTH_EVENT, DEFAULT_COMPANY_ID, getActiveCompanyId } from "./authService";
import { useBootstrapQuery } from "./baseApi";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { relationDisplayFields } from "../utils/displayValue";

const STORAGE_KEY_PREFIX = "qulay.ui.preferences.v1";
const EVENT_NAME = "qulay:local-db-change";
const getStorageKey = () => `${STORAGE_KEY_PREFIX}.${getActiveCompanyId() || DEFAULT_COMPANY_ID}`;

const BUSINESS_COLLECTIONS = [
  "users", "roles", "employeeTypes", "categories", "units", "priceLists", "products", "warehouses",
  "balances", "customers", "suppliers", "contacts", "agents", "territories", "visits", "orders", "sales",
  "returns", "goodsReceipts", "movements", "reservations", "transfers", "inventoryCounts", "adjustments",
  "routeTemplates", "routePlans", "pickLists", "deliveryTrips", "deliveries", "invoices", "payments",
  "paymentMethods", "cashboxes", "shifts", "heldCarts", "ledger", "debts", "cashTransactions", "approvals",
  "workflowNotifications", "salaryKpi", "salaryPayments", "packing", "activityLog",
];

const DEFAULT_SETTINGS = {
  appearance: {
    primaryColor: "#0a2a43", themeMode: "light", pageBackground: "#faf9f6", surfaceColor: "#ffffff",
    baseFontSize: 15, headingSize: 31, headingWeight: 720, cardRadius: 16, controlRadius: 10,
    sidebarWidth: 236, topbarHeight: 68, motion: "subtle", contentWidth: "fluid",
    sidebarDensity: "comfortable", tableDensity: "comfortable", cardShadow: "premium",
    borderStrength: "soft", showDescriptions: true, showBreadcrumbs: true,
    stickySectionNavigation: true, showTableSummary: true,
  },
  company: { name: "", logo: "", currency: "UZS", language: "uz", timezone: "Asia/Tashkent", branch: "", defaultWarehouseId: "" },
  modules: { dashboard: true, sales: true, pos: true, inventory: true, partners: true, agents: true, routes: true, fulfillment: true, delivery: true, finance: true, reports: true, settings: true },
  employeeWorkspaces: {
    agent_workspace: false, warehouse_workspace: false, fulfillment_workspace: false,
    driver_workspace: false, sales_operator_workspace: false, cashier_workspace: false,
  },
  sales: { autoConfirmOrders: false, allowNegativeStock: false, maxAgentDiscount: 0, allowOrderEdit: true, showStockOnOrder: true, warnCustomerDebt: true },
  pos: { warehouseId: "", priceListId: "", productView: "card", allowAnonymousCustomer: true, showImages: true, printReceipt: false, barcodeAutoAdd: true, clearCartAfterSale: true, showStockBadge: true, allowHeldCarts: true },
  inventory: { allowNegativeStock: false, reservations: true, lowStockAlerts: true, requireTransferApproval: true, requireAdjustmentApproval: true },
  agents: { requireGpsCheckIn: false, requireGpsCheckOut: false, allowOutsideRoute: true, allowCreateCustomer: true, allowCollectPayment: true, showDailyProgress: true },
  delivery: { allowPartialDelivery: true, requireFailureReason: true, requireRecipientName: true, requirePhoto: false, requireGps: false, showDriverWorkload: true },
  finance: { allowCreditSales: true, enforceCreditLimit: false, blockOverdueOrders: false, requirePaymentConfirmation: true },
  documents: { orderPrefix: "ORD", invoicePrefix: "INV", paymentPrefix: "PAY", returnPrefix: "RET", showCompanyLogo: true },
  locale: { language: "uz", dateFormat: "DD.MM.YYYY", timeFormat: "24h", currencyDisplay: "symbol" },
  notifications: { lowStock: true, overdueDebt: true, failedDelivery: true, payment: true, newOrder: true, browser: true, sound: false },
  workforce: { salaryPayDay: 5, workdayStart: "09:00", workdayEnd: "18:00" },
  maps: { provider: "YANDEX", defaultZoom: 12, showTraffic: false, navigationApp: "ASK", geofenceMeters: 250 },
  currency: { provider: "GOOGLE_FINANCE", showInHeader: true, headerCurrencies: ["USD", "EUR"], autoRefreshMinutes: 30 },
  mobile: { installPrompt: true, autoLockMinutes: 0, pinEnabled: false, pinHash: "", cameraScanner: true, offlineReady: true, compactBottomNav: true },
};

const DEFAULT_RATES = { UZS: 1, USD: 11914.62, EUR: 13754, RUB: 146.59, GBP: 16029.04, CNY: 1758.53, AED: 3244.28 };

let cache;
let cacheStorageKey;
let lastRemoteData;
let settingsVersion = null;
let settingsTimer;

function merge(defaultValue, currentValue) {
  if (Array.isArray(defaultValue)) return Array.isArray(currentValue) ? currentValue : defaultValue;
  if (!defaultValue || typeof defaultValue !== "object") return currentValue ?? defaultValue;
  const current = currentValue && typeof currentValue === "object" && !Array.isArray(currentValue) ? currentValue : {};
  return Object.fromEntries([
    ...Object.entries(defaultValue).map(([key, value]) => [key, merge(value, current[key])]),
    ...Object.entries(current).filter(([key]) => !(key in defaultValue)),
  ]);
}

function emptyState(preferences = {}) {
  const state = Object.fromEntries(BUSINESS_COLLECTIONS.map((key) => [key, []]));
  state.dashboard = {};
  state.settings = merge(DEFAULT_SETTINGS, preferences.settings);
  state.currencyRates = preferences.currencyRates || { source: "Fallback", status: "FALLBACK", updatedAt: null, rates: DEFAULT_RATES, errors: {} };
  state.meta = { version: 7, source: "backend", loading: true };
  return state;
}

function safeWrite(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({
      settings: {
        appearance: value.settings?.appearance,
        locale: value.settings?.locale,
        maps: value.settings?.maps,
        currency: value.settings?.currency,
        mobile: value.settings?.mobile,
      },
      currencyRates: value.currencyRates,
    }));
  } catch (error) {
    console.warn("UI sozlamalarini mahalliy xotiraga yozib bo‘lmadi", error);
  }
}

function readStorage() {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(getStorageKey());
    return emptyState(raw ? JSON.parse(raw) : {});
  } catch {
    return emptyState();
  }
}

function getSnapshot() {
  const key = getStorageKey();
  if (!cache || cacheStorageKey !== key) {
    cacheStorageKey = key;
    cache = readStorage();
  }
  return cache;
}

function emitChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

function setState(value) {
  cache = value;
  cacheStorageKey = getStorageKey();
  safeWrite(cacheStorageKey, cache);
  emitChange();
  return cache;
}

const RELATION_KEYS = [
  "warehouse", "sourceWarehouse", "targetWarehouse", "customer", "employee", "branch", "product",
  "supplier", "category", "unit", "paymentMethod", "createdBy", "assignedTo", "pickerEmployee",
  "driver", "agent", "order", "invoice", "route", "territory",
];

export function normalizeRemoteData(remote = {}) {
  const mapped = Object.fromEntries(Object.entries(remote).map(([key, value]) => [
    key,
    Array.isArray(value) ? value.map((item) => relationDisplayFields(item, RELATION_KEYS)) : value,
  ]));
  mapped.settings = remote.settingsRecord?.data || {};
  mapped.products = (remote.products || []).map((item) => {
    const currentPrices = [...(item.prices || [])].sort((a, b) => Number(Boolean(b.priceList?.isDefault)) - Number(Boolean(a.priceList?.isDefault)));
    const primaryPrice = currentPrices.find((entry) => entry.priceList?.isDefault) || currentPrices[0];
    const secondaryPrice = currentPrices.find((entry) => entry.id !== primaryPrice?.id);
    return {
      ...relationDisplayFields(item, RELATION_KEYS),
      barcode: item.barcodes?.find((code) => code.isPrimary)?.barcode || item.barcodes?.[0]?.barcode || "",
      barcodes: item.barcodes?.map((code) => code.barcode) || [],
      image: item.imageUrl || "",
      price: Number(primaryPrice?.price || 0),
      wholesalePrice: Number(secondaryPrice?.price ?? primaryPrice?.price ?? 0),
      prices: currentPrices,
      stocks: (item.stocks || []).map((stock) => ({ ...stock, onHand: Number(stock.onHand || 0), reserved: Number(stock.reserved || 0) })),
    };
  });
  mapped.customers = (remote.customers || []).map((item) => {
    const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
    return { ...relationDisplayFields(item, RELATION_KEYS), ...metadata, image: metadata.image || "", agentId: metadata.agentId || "", priceListId: metadata.priceListId || "",
      customerType: metadata.customerType || "ORGANIZATION", category: metadata.category || "", territory: metadata.territory || "", debt: Number(item.balance || 0), creditLimit: Number(item.creditLimit || 0) };
  });
  mapped.suppliers = (remote.suppliers || []).map((item) => {
    const metadata = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
    return { ...relationDisplayFields(item, RELATION_KEYS), ...metadata, image: metadata.image || "", contact: metadata.contact || "", balance: Number(item.balance || 0) };
  });
  mapped.orders = (remote.orders || []).map((item) => ({
    ...relationDisplayFields(item, RELATION_KEYS),
    date: item.orderedAt || item.createdAt,
    items: (item.items || []).map((line) => ({ ...line, price: Number(line.unitPrice ?? line.price ?? 0) })),
  }));
  mapped.sales = mapped.orders.filter((item) => item.status === "COMPLETED");
  mapped.balances = (remote.balances || []).filter((item) => !item.variantId && (!item.stockKey || item.stockKey === "BASE"))
    .map((item) => ({ ...item, onHand: Number(item.onHand), reserved: Number(item.reserved), available: Number(item.available) }));
  mapped.workflowNotifications = (remote.workflowNotifications || []).map((item) => ({ ...item, read: item.status === "READ" }));
  mapped.pickLists = (remote.pickLists || []).map((item) => ({ ...item, picker: item.pickerEmployee?.name || "" }));
  mapped.employeeTypes = (remote.employeeTypes || []).map((item) => ({ ...item, system: item.isSystem }));
  mapped.routeTemplates = (remote.routeTemplates || []).map((item) => ({
    ...item,
    day: ["", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"][item.dayOfWeek || 0],
    stops: (item.stops || []).map((stop) => stop.customerId),
  }));
  mapped.routePlans = (remote.routePlans || []).map((item) => ({ ...item, date: item.planDate, stops: (item.stops || []).map((stop) => ({ ...stop, order: stop.stopOrder })) }));
  mapped.warehouses = (mapped.warehouses || []).map((item) => ({ ...item, branchName: item.branchName || "—" }));
  mapped.transfers = (mapped.transfers || []).map((item) => ({
    ...item,
    fromWarehouseId: item.fromWarehouseId || item.sourceWarehouseId || "",
    toWarehouseId: item.toWarehouseId || item.targetWarehouseId || "",
    fromWarehouseName: item.fromWarehouseName || item.sourceWarehouseName || "—",
    toWarehouseName: item.toWarehouseName || item.targetWarehouseName || "—",
    productId: item.productId || item.items?.[0]?.productId || "",
    quantity: item.quantity ?? item.items?.[0]?.quantity ?? 0,
  }));
  mapped.adjustments = (mapped.adjustments || []).map((item) => ({
    ...item,
    date: item.date || item.createdAt,
    productId: item.productId || item.items?.[0]?.productId || "",
    quantity: Number(item.quantity ?? item.items?.[0]?.quantity ?? 0),
    unitCost: Number(item.unitCost ?? item.items?.[0]?.unitCost ?? 0),
  }));
  mapped.inventoryCounts = (mapped.inventoryCounts || []).map((item) => {
    const items = (item.items || []).map((line) => ({
      ...line,
      systemQty: Number(line.systemQty ?? line.expected ?? 0),
      countedQty: line.countedQty ?? line.counted ?? "",
      difference: Number(line.difference ?? 0),
    }));
    return {
      ...item,
      date: item.date || item.countedAt || item.createdAt,
      items,
      differences: item.differences ?? items.filter((line) => Number(line.difference) !== 0).length,
    };
  });
  mapped.goodsReceipts = (mapped.goodsReceipts || []).map((item) => ({
    ...item,
    date: item.date || item.receivedAt || item.createdAt,
    total: Number(item.total || 0),
    items: (item.items || []).map((line) => ({
      ...line,
      quantity: Number(line.quantity || 0),
      baseQuantity: Number(line.baseQuantity ?? line.quantity ?? 0),
      conversionToBase: Number(line.conversionToBase || 1),
      unitCost: Number(line.unitCost || 0),
      total: Number(line.total || 0),
    })),
  }));
  mapped.deliveryTrips = (mapped.deliveryTrips || []).map((item) => ({
    ...item,
    driverName: item.driverName || item.driver?.name || "—",
    warehouseName: item.warehouseName || item.warehouse?.name || "—",
  }));
  mapped.contacts = [...(remote.customers || []), ...(remote.suppliers || [])].flatMap((item) => item.contacts || []);
  return mapped;
}

function setRemoteData(remote) {
  if (!remote || remote === lastRemoteData) return getSnapshot();
  lastRemoteData = remote;
  settingsVersion = remote.settingsRecord?.version ?? settingsVersion;
  const current = getSnapshot();
  const mapped = normalizeRemoteData(remote);
  const next = { ...current, ...Object.fromEntries(BUSINESS_COLLECTIONS.map((key) => [key, mapped[key] || []])) };
  next.dashboard = mapped.dashboard || {};
  next.branches = mapped.branches || [];
  next.settings = merge(DEFAULT_SETTINGS, { ...(mapped.settings || {}), appearance: current.settings.appearance, locale: current.settings.locale });
  if (mapped.company) next.settings.company = { ...next.settings.company, ...mapped.company };
  next.meta = { version: 7, source: "backend", loading: false, syncedAt: new Date().toISOString() };
  return setState(next);
}

export function updateLocalDb(mutator) {
  const current = getSnapshot();
  const oldSettings = JSON.stringify(current.settings);
  const draft = structuredClone(current);
  const next = setState(mutator(draft) || draft);
  if (getActiveCompanyId() && settingsVersion !== null && JSON.stringify(next.settings) !== oldSettings) {
    clearTimeout(settingsTimer);
    settingsTimer = setTimeout(async () => {
      try {
        const saved = await apiRequest({ url: "/settings", method: "PUT", body: { version: settingsVersion, data: next.settings } });
        settingsVersion = saved.version;
      } catch (error) {
        next.meta = { ...next.meta, apiError: { status: error.status, message: error.message } };
        emitChange();
      }
    }, 350);
  }
  return next;
}

function subscribeLocalDb(listener) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event) => {
    if (event.key === getStorageKey()) {
      cache = readStorage();
      cacheStorageKey = getStorageKey();
      listener();
    }
  };
  const handleLocal = () => listener();
  const handleAuth = () => {
    cache = undefined;
    cacheStorageKey = undefined;
    lastRemoteData = undefined;
    listener();
  };
  window.addEventListener("storage", handleStorage);
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
  const hasToken = typeof window !== "undefined" && Boolean(window.localStorage.getItem(STORAGE_KEYS.accessToken));
  const { data, error, refetch } = useBootstrapQuery(undefined, { skip: !hasToken, pollingInterval: 60_000 });
  useEffect(() => { if (data) setRemoteData(data); }, [data]);
  useEffect(() => {
    if (!error) return;
    const current = getSnapshot();
    cache = { ...current, meta: { ...current.meta, loading: false, apiError: error, retry: refetch } };
    emitChange();
  }, [error, refetch]);
  return selector(db);
}

export function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nextNumber(prefix, collection) {
  return `${prefix}-${new Date().getFullYear()}-${String((collection?.length || 0) + 1).padStart(4, "0")}`;
}

export function exportLocalDb() {
  return JSON.stringify(getSnapshot(), null, 2);
}

export function resetLocalDbCache() {
  cache = undefined;
  cacheStorageKey = undefined;
  lastRemoteData = undefined;
  emitChange();
}

export { STORAGE_KEY_PREFIX };
