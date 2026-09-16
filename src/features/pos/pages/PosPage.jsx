import { Archive, ArrowLeftRight, Banknote, Bell, Boxes, Camera, Check, ChevronDown, Clock3, CreditCard, Expand, History, Landmark, LayoutGrid, List, LoaderCircle, LogOut, Minus, Package, PackageCheck, Plus, QrCode, ReceiptText, RotateCcw, ScanBarcode, Settings, ShoppingCart, Store, Trash2, UserPlus, Users, WalletCards, Warehouse, Wifi, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import CameraScannerModal from "../../../components/mobile/CameraScannerModal";
import MobilePinGate from "../../../components/mobile/MobilePinGate";
import { Field, Modal, PrimaryButton, SecondaryButton } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { useAuth } from "../../../hooks/useAuth";
import { usePermissions } from "../../../hooks/usePermissions";
import { updateLocalDb, useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { STORAGE_KEYS } from "../../../constants/storageKeys";
import { getAggregateStock, getVariantStockAvailability } from "../../../services/inventorySelectors";
import { completePosSale } from "../../../services/prototypeActions";
import { formatDateTime, formatMoney, getName } from "../../../utils/formatters";
import { findProductSelectionByScan, getProductBarcodes } from "../../../utils/productCodes";
import { exitPosWorkspace } from "../../../utils/pwa";

const POS_RETURN_ACTIVE_STATUSES = new Set(["DRAFT", "REQUESTED", "INSPECTING", "APPROVED", "RECEIVED", "REFUNDED"]);
const POS_REFUND_METHODS = new Set(["CASH", "CARD", "QR", "BANK", "OTHER"]);
const blankReturnLine = () => ({ quantity: "", condition: "RESTOCK", serialIds: [] });

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function posReturnLineLabel(line) {
  return [line?.productName || line?.product?.name || "Mahsulot", line?.variantName || line?.variant?.name, line?.packageName || line?.package?.name].filter(Boolean).join(" · ");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function printPosReceipt({ sale, cart, companyName, branchName, warehouseName, cashierName, customerName, paymentMethod, paymentMethodName, received, change }) {
  if (typeof document === "undefined" || !cart?.length) return;

  const fallbackTotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const total = Number(sale?.total ?? fallbackTotal);
  const receiptHeightMm = Math.max(94, 78 + cart.length * 13 + (paymentMethod === "CASH" ? 18 : 9));
  const rows = cart.map((item) => `
    <div class="item">
      <div class="item-name">${escapeHtml([item.name, item.variantName, item.packageName].filter(Boolean).join(" · "))}</div>
      <div class="item-row">
        <span>${Number(item.quantity)} × ${Number(item.price || 0).toLocaleString("uz-UZ")} so'm</span>
        <strong>${(Number(item.quantity) * Number(item.price || 0)).toLocaleString("uz-UZ")} so'm</strong>
      </div>
    </div>
  `).join("");

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.opacity = "0";
  frame.style.pointerEvents = "none";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const printWindow = frame.contentWindow;
  const doc = printWindow?.document;
  if (!printWindow || !doc) {
    frame.remove();
    notify("Chek oynasini tayyorlab bo‘lmadi", "warning");
    return;
  }

  doc.open();
  doc.write(`<!doctype html>
<html lang="uz">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(sale?.number || "Chek")}</title>
  <style>
    @page { size: 80mm ${receiptHeightMm}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { width: 80mm; margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
    body { padding: 4mm; font-size: 12px; line-height: 1.34; }
    .receipt { width: 72mm; margin: 0; padding: 0; }
    .brand { text-align: center; margin-bottom: 8px; }
    .brand h1 { margin: 0; font-size: 19px; line-height: 1.15; font-weight: 800; }
    .brand p { margin: 3px 0 0; font-size: 10.5px; }
    .divider { width: 100%; margin: 7px 0; border-top: 1px dashed #000; }
    .meta { display: grid; gap: 2px; }
    .meta-row, .item-row, .total-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .meta-row span:first-child { color: #444; }
    .meta-row strong { text-align: right; font-weight: 700; }
    .items { display: grid; gap: 7px; }
    .item { break-inside: avoid; }
    .item-name { margin-bottom: 1px; font-weight: 700; }
    .item-row { font-size: 10.5px; }
    .totals { display: grid; gap: 3px; }
    .total-row.main { margin-top: 2px; font-size: 15px; font-weight: 800; }
    .footer { margin-top: 9px; text-align: center; font-size: 10.5px; }
    .footer strong { display: block; margin-bottom: 2px; font-size: 11.5px; }
    @media print { html, body { width: 80mm !important; margin: 0 !important; padding: 0 !important; } body { padding: 4mm !important; } .receipt { width: 72mm !important; } }
  </style>
</head>
<body>
  <main class="receipt">
    <header class="brand"><h1>${escapeHtml(companyName || "Qulay")}</h1>${branchName ? `<p>${escapeHtml(branchName)}</p>` : ""}</header>
    <div class="divider"></div>
    <section class="meta">
      <div class="meta-row"><span>Chek:</span><strong>${escapeHtml(sale?.number || "—")}</strong></div>
      <div class="meta-row"><span>Sana:</span><strong>${escapeHtml(new Date().toLocaleString("uz-UZ"))}</strong></div>
      <div class="meta-row"><span>Ombor:</span><strong>${escapeHtml(warehouseName || "—")}</strong></div>
      <div class="meta-row"><span>Kassir:</span><strong>${escapeHtml(cashierName || "—")}</strong></div>
      <div class="meta-row"><span>Mijoz:</span><strong>${escapeHtml(customerName || "Anonim mijoz")}</strong></div>
    </section>
    <div class="divider"></div>
    <section class="items">${rows}</section>
    <div class="divider"></div>
    <section class="totals">
      <div class="total-row main"><span>JAMI</span><strong>${total.toLocaleString("uz-UZ")} so'm</strong></div>
      <div class="total-row"><span>To‘lov:</span><strong>${escapeHtml(paymentMethodName || paymentMethod)}</strong></div>
      ${paymentMethod === "CASH" ? `<div class="total-row"><span>Qabul qilindi:</span><strong>${Number(received || total).toLocaleString("uz-UZ")} so'm</strong></div><div class="total-row"><span>Qaytim:</span><strong>${Number(change || 0).toLocaleString("uz-UZ")} so'm</strong></div>` : ""}
    </section>
    <div class="divider"></div>
    <footer class="footer"><strong>Xaridingiz uchun rahmat!</strong><span>Qulay orqali xizmat ko‘rsatildi</span></footer>
  </main>
</body>
</html>`);
  doc.close();

  const runPrint = () => {
    window.setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } finally {
        window.setTimeout(() => frame.remove(), 2500);
      }
    }, 220);
  };

  if (doc.readyState === "complete") runPrint();
  else frame.onload = runPrint;
}

function PosPage() {
  const db = useLocalDb();
  const { user } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [showHeld, setShowHeld] = useState(false);
  const [quickPanel, setQuickPanel] = useState("");
  const [returnView, setReturnView] = useState("create");
  const [returnOrderId, setReturnOrderId] = useState("");
  const [returnReason, setReturnReason] = useState("Mijoz qaytarishi");
  const [returnDraftItems, setReturnDraftItems] = useState({});
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnRefundRow, setReturnRefundRow] = useState(null);
  const [returnRefundMethodCode, setReturnRefundMethodCode] = useState("");
  const [returnRefundNote, setReturnRefundNote] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mobileView, setMobileView] = useState("products");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryProductIds, setCategoryProductIds] = useState([]);
  const [now, setNow] = useState(new Date());
  const [selector, setSelector] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedSerialIds, setSelectedSerialIds] = useState([]);
  const [generalDiscount, setGeneralDiscount] = useState({ type: "PERCENT", value: "" });
  const [dueAt, setDueAt] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", creditLimit: "" });
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [branchOpen, setBranchOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [shiftMode, setShiftMode] = useState("OPEN");
  const [shiftBusy, setShiftBusy] = useState(false);
  const [shiftForm, setShiftForm] = useState({ cashboxId: "", openingBalance: "", closingBalance: "", cashType: "CASH_IN", amount: "", description: "", note: "" });
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (typeof window === "undefined") return user?.branchId || "";
    return window.localStorage.getItem(STORAGE_KEYS.selectedBranchId) || user?.branchId || "";
  });

  const activeBranches = useMemo(() => (db.branches || []).filter((branch) => branch.status !== "INACTIVE"), [db.branches]);
  const selectedBranch = activeBranches.find((branch) => branch.id === selectedBranchId) || user?.branch || activeBranches[0] || null;
  const activeWarehouses = useMemo(() => (db.warehouses || []).filter((warehouse) => warehouse.status === "ACTIVE" && (!selectedBranchId || !warehouse.branchId || warehouse.branchId === selectedBranchId)), [db.warehouses, selectedBranchId]);
  const configuredWarehouse = activeWarehouses.find((warehouse) => warehouse.id === db.settings?.pos?.warehouseId);
  const defaultWarehouse = activeWarehouses.find((warehouse) => warehouse.id === db.settings?.company?.defaultWarehouseId);
  const warehouseId = configuredWarehouse?.id || defaultWarehouse?.id || activeWarehouses[0]?.id || "";
  const activePosPriceLists = (db.priceLists || []).filter((list) => !["INACTIVE", "ARCHIVED"].includes(list.status));
  const configuredPriceListId = activePosPriceLists.some((list) => list.id === db.settings.pos.priceListId)
    ? db.settings.pos.priceListId
    : activePosPriceLists.find((list) => list.isDefault)?.id || activePosPriceLists[0]?.id || "";
  const selectedCustomerForPrice = db.customers.find((customer) => customer.id === customerId);
  const priceListId = selectedCustomerForPrice?.priceListId || configuredPriceListId;
  const productView = db.settings.pos.productView === "list" ? "list" : "card";
  const currentEmployeeId = user?.employeeId || user?.id || "";
  const currentShift = (db.shifts || []).find((shift) => shift.status === "OPEN" && (!currentEmployeeId || shift.employeeId === currentEmployeeId));
  const currentShiftCashbox = currentShift?.cashbox || (db.cashboxes || []).find((cashbox) => cashbox.id === currentShift?.cashboxId) || null;
  const activeCashboxes = useMemo(() => (db.cashboxes || []).filter((cashbox) => cashbox.status === "ACTIVE"
    && (!selectedBranchId || !cashbox.branchId || cashbox.branchId === selectedBranchId)
    && (!warehouseId || !cashbox.warehouseId || cashbox.warehouseId === warehouseId)), [db.cashboxes, selectedBranchId, warehouseId]);
  const posNotifications = useMemo(() => (db.workflowNotifications || db.notifications || [])
    .filter((item) => !item.userId || item.userId === user?.id)
    .slice(0, 40), [db.notifications, db.workflowNotifications, user?.id]);

  const returnClaims = useMemo(() => {
    const quantityByItem = new Map();
    const serialIds = new Set();
    for (const doc of db.returns || []) {
      if (!POS_RETURN_ACTIVE_STATUSES.has(doc.status)) continue;
      for (const item of doc.items || []) {
        if (item.orderItemId) quantityByItem.set(item.orderItemId, numeric(quantityByItem.get(item.orderItemId)) + numeric(item.quantity));
        for (const serialId of Array.isArray(item.serialIds) ? item.serialIds : []) serialIds.add(serialId);
      }
    }
    return { quantityByItem, serialIds };
  }, [db.returns]);
  const returnCompletedOrders = useMemo(() => (db.orders || []).filter((order) => order.status === "COMPLETED" && (order.items || []).some((line) => numeric(line.quantity) - numeric(returnClaims.quantityByItem.get(line.id)) > 1e-9)), [db.orders, returnClaims]);
  const selectedReturnOrder = returnCompletedOrders.find((order) => order.id === returnOrderId);
  const returnRefundOptions = useMemo(() => {
    const configured = (db.paymentMethods || []).filter((item) => item.status === "ACTIVE" && POS_REFUND_METHODS.has(item.method || item.code));
    return configured.length ? configured.map((item) => ({ code: item.code, method: item.method || item.code, name: item.name })) : [
      { code: "CASH", method: "CASH", name: "Naqd" }, { code: "CARD", method: "CARD", name: "Karta" },
      { code: "QR", method: "QR", name: "QR" }, { code: "BANK", method: "BANK", name: "Bank" }, { code: "OTHER", method: "OTHER", name: "Boshqa" },
    ];
  }, [db.paymentMethods]);
  const selectedReturnRefundOption = returnRefundOptions.find((item) => item.code === returnRefundMethodCode) || returnRefundOptions[0];
  const returnRefundSettlement = useMemo(() => {
    if (!returnRefundRow) return { creditOffset: 0, payoutAmount: 0 };
    const invoiceIds = new Set((db.invoices || []).filter((invoice) => invoice.orderId === returnRefundRow.orderId).map((invoice) => invoice.id));
    const outstandingDebt = (db.debts || []).filter((debt) => invoiceIds.has(debt.invoiceId)).reduce((sum, debt) => sum + Math.max(0, numeric(debt.outstanding)), 0);
    const creditOffset = Math.min(numeric(returnRefundRow.total), outstandingDebt);
    return { creditOffset, payoutAmount: Math.max(0, numeric(returnRefundRow.total) - creditOffset) };
  }, [db.debts, db.invoices, returnRefundRow]);

  const markPosNotificationRead = async (item) => {
    if (!item?.id || item.read || item.readAt) return;
    try {
      await apiRequest({ url: `/notifications/${item.id}/read`, method: "PATCH", body: {} });
      updateLocalDb((state) => {
        const listKey = Array.isArray(state.workflowNotifications) ? "workflowNotifications" : "notifications";
        state[listKey] = (state[listKey] || []).map((row) => row.id === item.id ? { ...row, read: true, readAt: row.readAt || new Date().toISOString() } : row);
        return state;
      });
    } catch (error) { notify(error.message || "Bildirishnomani yangilab bo‘lmadi", "warning"); }
  };

  const markAllPosNotificationsRead = async () => {
    try {
      await apiRequest({ url: "/notifications/read-all", body: {} });
      updateLocalDb((state) => {
        const nowIso = new Date().toISOString();
        const listKey = Array.isArray(state.workflowNotifications) ? "workflowNotifications" : "notifications";
        state[listKey] = (state[listKey] || []).map((row) => !row.userId || row.userId === user?.id ? { ...row, read: true, readAt: row.readAt || nowIso } : row);
        return state;
      });
    } catch (error) { notify(error.message || "Bildirishnomalarni yangilab bo‘lmadi", "warning"); }
  };

  useEffect(() => {
    if (!activeBranches.length) return;
    if (selectedBranchId && activeBranches.some((branch) => branch.id === selectedBranchId)) return;
    const fallback = activeBranches.find((branch) => branch.id === user?.branchId) || activeBranches[0];
    if (!fallback) return;
    setSelectedBranchId(fallback.id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.selectedBranchId, fallback.id);
  }, [activeBranches, selectedBranchId, user?.branchId]);

  useEffect(() => {
    const shiftBranchId = currentShiftCashbox?.branchId || "";
    if (currentShift && shiftBranchId && shiftBranchId !== selectedBranchId && activeBranches.some((branch) => branch.id === shiftBranchId)) {
      setSelectedBranchId(shiftBranchId);
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.selectedBranchId, shiftBranchId);
    }
    if (currentShift && currentShiftCashbox?.warehouseId && db.settings?.pos?.warehouseId !== currentShiftCashbox.warehouseId) {
      updateLocalDb((draft) => { draft.settings.pos.warehouseId = currentShiftCashbox.warehouseId; });
    }
  }, [activeBranches, currentShift, currentShiftCashbox, db.settings?.pos?.warehouseId, selectedBranchId]);

  useEffect(() => {
    if (!warehouseId || currentShiftCashbox?.warehouseId || db.settings?.pos?.warehouseId === warehouseId) return;
    updateLocalDb((draft) => { draft.settings.pos.warehouseId = warehouseId; });
  }, [currentShiftCashbox?.warehouseId, db.settings?.pos?.warehouseId, warehouseId]);

  const priceForList = (product, variant, productPackage, targetPriceListId = priceListId) => {
    if (productPackage?.price != null) return Number(productPackage.price || 0);
    if (variant?.price != null) return Number(variant.price || 0);
    const matched = (product.prices || []).find((entry) => (entry.priceListId || entry.priceList?.id) === targetPriceListId);
    const fallback = (product.prices || []).find((entry) => entry.priceList?.isDefault) || product.prices?.[0];
    return Number(matched?.price ?? fallback?.price ?? product.price ?? 0);
  };

  const priceFor = (product, variant, productPackage) => priceForList(product, variant, productPackage, priceListId);

  const selectCustomer = (nextCustomerId) => {
    const nextCustomer = db.customers.find((customer) => customer.id === nextCustomerId);
    const requestedListId = nextCustomer?.priceListId || configuredPriceListId;
    const nextPriceListId = activePosPriceLists.some((list) => list.id === requestedListId) ? requestedListId : configuredPriceListId;
    setCustomerId(nextCustomerId);
    setCart((current) => current.map((line) => {
      const product = db.products.find((item) => item.id === line.productId);
      if (!product) return line;
      const variant = (product.variants || []).find((item) => item.id === line.variantId) || null;
      const productPackage = (product.packages || []).find((item) => item.id === line.packageId) || null;
      return { ...line, price: priceForList(product, variant, productPackage, nextPriceListId) };
    }));
  };

  const availableFor = (productId, variantId = "") => {
    if (!warehouseId) return 0;
    const product = db.products.find((item) => item.id === productId);
    return variantId ? getVariantStockAvailability(product, db.balances, warehouseId, variantId)
      : getAggregateStock(db.balances, productId, warehouseId).available;
  };

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    return db.products.filter((product) => {
      const matchesCategory = categoryId === "ALL" || product.categoryId === categoryId;
      const extraCodes = [...(product.variants || []).flatMap((item) => [item.name, item.sku, ...getProductBarcodes(item)]),
        ...(product.packages || []).flatMap((item) => [item.name, ...getProductBarcodes(item)]), ...(product.serials || []).flatMap((item) => [item.serial, item.imei])];
      const matchesSearch = !query || `${product.name} ${product.sku} ${getProductBarcodes(product).join(" ")} ${extraCodes.join(" ")}`.toLowerCase().includes(query);
      return product.status === "ACTIVE" && matchesCategory && matchesSearch;
    });
  }, [categoryId, db.products, search]);

  const cartKey = (productId, variantId = "", packageId = "") => `${productId}:${variantId || "base"}:${packageId || "base"}`;
  const commitProduct = (product, variant = null, productPackage = null, serialIds = []) => {
    const key = cartKey(product.id, variant?.id, productPackage?.id); const conversionToBase = Number(productPackage?.conversionToBase || 1);
    const currentBase = cart.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity * item.conversionToBase, 0);
    const currentVariantBase = variant ? cart.filter((item) => item.productId === product.id && item.variantId === variant.id)
      .reduce((sum, item) => sum + item.quantity * item.conversionToBase, 0) : currentBase;
    if (!db.settings.inventory.allowNegativeStock && currentBase + conversionToBase > availableFor(product.id)) return notify(`${product.name} uchun umumiy qoldiq yetarli emas`, "warning");
    if (!db.settings.inventory.allowNegativeStock && variant && currentVariantBase + conversionToBase > availableFor(product.id, variant.id)) return notify(`${product.name} · ${variant.name} varianti uchun qoldiq yetarli emas`, "warning");
    const alreadySelected = new Set(cart.flatMap((item) => item.serialIds || []));
    if (serialIds.some((id) => alreadySelected.has(id))) return notify("Tanlangan serial / IMEI savatda allaqachon mavjud", "warning");
    setCart((current) => { const existing = current.find((item) => item.key === key);
      if (existing) return current.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1, serialIds: product.trackSerial ? [...(item.serialIds || []), ...serialIds] : item.serialIds } : item);
      return [...current, { key, productId: product.id, variantId: variant?.id || "", packageId: productPackage?.id || "", variantName: variant?.name || "",
        packageName: productPackage?.name || "", conversionToBase, name: product.name, sku: variant?.sku || product.sku, quantity: 1,
        price: priceFor(product, variant, productPackage), discountType: "PERCENT", discountValue: "", serialIds }]; });
    setSelector(null); setSelectedVariantId(""); setSelectedPackageId(""); setSelectedSerialIds([]); searchRef.current?.focus();
  };
  const addProduct = (product, exact = {}) => { const variants = (product.variants || []).filter((item) => item.status === "ACTIVE"); const packages = (product.packages || []).filter((item) => item.status === "ACTIVE");
    const exactVariant = exact.variant || (exact.package?.variantId ? variants.find((item) => item.id === exact.package.variantId) : null);
    if (!product.trackSerial && (exactVariant || (exact.package && !variants.length) || (!variants.length && !packages.length))) return commitProduct(product, exactVariant, exact.package);
    setSelector(product); setSelectedVariantId(exactVariant?.id || (variants.length === 1 ? variants[0].id : "")); setSelectedPackageId(exact.package?.id || ""); setSelectedSerialIds(exact.serial?.id ? [exact.serial.id] : []); };
  const updateQuantity = (key, value, absolute = false) => {
    const selectedLine = cart.find((item) => item.key === key);
    const selectedProduct = db.products.find((row) => row.id === selectedLine?.productId);
    if (selectedProduct?.trackSerial) { notify("Serial / IMEI mahsulot miqdorini serial tanlash orqali o‘zgartiring", "warning"); return; }
    setCart((current) => current.map((item) => { if (item.key !== key) return item;
      const product = db.products.find((row) => row.id === item.productId); const unit = db.units.find((row) => row.id === product?.unitId); const raw = absolute ? Number(value) : item.quantity + Number(value);
      const next = Math.max(unit?.precision > 0 ? 0.001 : 1, unit?.precision > 0 ? Math.round(raw * 1000) / 1000 : Math.round(raw));
      const otherBase = current.filter((row) => row.productId === item.productId && row.key !== key).reduce((sum, row) => sum + row.quantity * row.conversionToBase, 0);
      const otherVariantBase = item.variantId ? current.filter((row) => row.productId === item.productId && row.variantId === item.variantId && row.key !== key)
        .reduce((sum, row) => sum + row.quantity * row.conversionToBase, 0) : otherBase;
      if (!db.settings.inventory.allowNegativeStock && otherBase + next * item.conversionToBase > availableFor(item.productId)) { notify(`${product?.name || "Mahsulot"} uchun umumiy qoldiq yetarli emas`, "warning"); return item; }
      if (!db.settings.inventory.allowNegativeStock && item.variantId && otherVariantBase + next * item.conversionToBase > availableFor(item.productId, item.variantId)) { notify(`${product?.name || "Mahsulot"} varianti uchun qoldiq yetarli emas`, "warning"); return item; }
      return { ...item, quantity: next }; }));
  };
  const removeLine = (key) => setCart((current) => current.filter((item) => item.key !== key));

  const openCategoryCreate = () => {
    setCategoryName("");
    setCategoryProductIds([]);
    setCategoryOpen(true);
  };

  const toggleCategoryProduct = (productId) => {
    setCategoryProductIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId]);
  };

  const createCategory = async (event) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) { notify("Kategoriya nomini kiriting", "warning"); return; }
    if (db.categories.some((item) => item.name.trim().toLocaleLowerCase("uz-UZ") === name.toLocaleLowerCase("uz-UZ"))) {
      notify("Bu nomdagi kategoriya allaqachon mavjud", "warning");
      return;
    }
    try { const category = await apiRequest({ url: "/catalog/categories", body: { name, status: "ACTIVE" } }); await Promise.all(categoryProductIds.map((id) => apiRequest({ url: `/catalog/products/${id}`, method: "PATCH", body: { categoryId: category.id } }))); setCategoryId(category.id); setCategoryOpen(false); notify(`${name} kategoriyasi yaratildi`); }
    catch (error) { notify(error.message, "danger"); }
  };

  const changeProductView = (view) => updateLocalDb((draft) => {
    draft.settings.pos.productView = view;
  });
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const itemDiscount = cart.reduce((sum, item) => { const gross = item.quantity * item.price; return sum + (item.discountType === "PERCENT" ? gross * Math.min(100, Number(item.discountValue) || 0) / 100 : Math.min(gross, Number(item.discountValue) || 0)); }, 0);
  const generalDiscountAmount = generalDiscount.type === "PERCENT" ? (subtotal - itemDiscount) * Math.min(100, Number(generalDiscount.value) || 0) / 100 : Math.min(subtotal - itemDiscount, Number(generalDiscount.value) || 0);
  const total = Math.max(0, Math.round((subtotal - itemDiscount - generalDiscountAmount) * 100) / 100);
  const received = Number(cashReceived) || 0;
  const selectedCustomer = db.customers.find((customer) => customer.id === customerId);
  const selectedPaymentConfig = (db.paymentMethods || []).find((item) => item.code === paymentMethod);
  const selectedPaymentType = selectedPaymentConfig?.method || paymentMethod;
  const change = selectedPaymentType === "CASH" ? Math.max(0, received - total) : 0;

  const quickCashValues = useMemo(() => {
    if (!total) return [];
    const standard = [20000, 50000, 100000, 200000, 500000];
    return Array.from(new Set([total, ...standard.filter((value) => value >= total)])).slice(0, 4);
  }, [total]);

  const checkout = async () => {
    if (checkoutBusy || !cart.length) return;
    if (!warehouseId) {
      notify("Kassa uchun faol ombor topilmadi", "warning");
      return;
    }
    if (!customerId && db.settings.pos.allowAnonymousCustomer === false) {
      notify("Bu kassada mijoz tanlash majburiy", "warning");
      return;
    }
    if (selectedPaymentType === "CASH" && !currentShift) {
      notify("Naqd savdo uchun avval smenani oching", "warning");
      openShiftManager("OPEN");
      return;
    }
    if (selectedPaymentType === "CASH" && cashReceived && received < total) {
      notify("Qabul qilingan naqd summa jami summadan kam", "warning");
      return;
    }
    if (selectedPaymentType === "CREDIT" && !customerId) return notify("Nasiya savdo uchun mijoz majburiy", "warning");

    const cartSnapshot = cart.map((item) => ({ ...item }));
    setCheckoutBusy(true);
    const result = await completePosSale({ cart: cartSnapshot, customerId, warehouseId, shiftId: currentShift?.id, priceListId: activePosPriceLists.some((list) => list.id === priceListId) ? priceListId : undefined,
      paymentMethod, total, generalDiscount, dueAt: dueAt || undefined });
    notify(result.message, result.ok ? "success" : "danger"); setCheckoutBusy(false);

    if (result.ok) {
      const warehouse = db.warehouses.find((item) => item.id === warehouseId);
      const preview = {
        sale: result.data?.order || result.sale?.order || result.sale,
        cart: cartSnapshot,
        companyName: db.settings.company.name || "Qulay",
        branchName: db.settings.company.branch || "",
        warehouseName: warehouse?.name || "",
        cashierName: user?.name || "Kassir",
        customerName: selectedCustomer?.name || "Anonim mijoz",
        paymentMethod: selectedPaymentType,
        paymentMethodName: (db.paymentMethods || []).find((item) => item.code === paymentMethod)?.name,
        received: selectedPaymentType === "CASH" ? (received || total) : total,
        change };
      setReceiptPreview(preview);
      if (db.settings.pos.printReceipt === true) printPosReceipt(preview);
    }

    if (result.ok && db.settings.pos.clearCartAfterSale !== false) {
      setCart([]);
      setCustomerId("");
      setSearch("");
      setCashReceived("");
      setGeneralDiscount({ type: "PERCENT", value: "" }); setDueAt("");
      setMobileView("products");
      searchRef.current?.focus();
    }
  };

  const holdCart = async () => {
    if (!cart.length || db.settings.pos.allowHeldCarts === false) return;
    try { await apiRequest({ url: "/pos/held-carts", body: { customerId: customerId || null, name: `Chek #${db.heldCarts.length + 1}`, items: cart.map((item) => ({
      productId: item.productId, variantId: item.variantId || null, packageId: item.packageId || null, quantity: Number(item.quantity),
      baseQuantity: item.quantity * item.conversionToBase, conversionToBase: item.conversionToBase, unitPrice: Number(item.price), serialIds: item.serialIds || [],
      discountAmount: item.discountType === "FIXED" ? Number(item.discountValue || 0) : 0 })) } }); }
    catch (error) { notify(error.message, "danger"); return; }
    setCart([]);
    setCustomerId("");
    setCashReceived("");
    notify("Savat vaqtincha saqlandi");
  };

  const restoreCart = async (held) => {
    setCart((held.items || held.cart || []).map((item) => ({ ...item, key: cartKey(item.productId, item.variantId, item.packageId),
      conversionToBase: Number(item.conversionToBase || 1), price: Number(item.unitPrice ?? item.price), name: item.product?.name || item.name,
      sku: item.variant?.sku || item.product?.sku || item.sku, variantName: item.variant?.name || "", packageName: item.package?.name || "", serialIds: Array.isArray(item.serialIds) ? item.serialIds : [], discountType: "FIXED", discountValue: String(item.discount || "") })));
    setCustomerId(held.customerId || "");
    setPaymentMethod(held.paymentMethod || "CASH");
    try { await apiRequest({ url: `/pos/held-carts/${held.id}`, method: "DELETE" }); } catch (error) { notify(error.message, "danger"); return; }
    setShowHeld(false);
    notify("Saqlangan savat tiklandi");
  };

  const addScannedValue = (rawValue) => {
    const selection = findProductSelectionByScan(db.products, rawValue);
    if (!selection) {
      setSearch(String(rawValue || "").trim());
      notify("Bu kod bo‘yicha mahsulot topilmadi", "warning");
      return;
    }
    addProduct(selection.product, selection);
    setSearch("");
  };

  useEffect(() => {
    searchRef.current?.focus();
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "F2") { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === "F8") { event.preventDefault(); if (cart.length) checkout(); }
      if (event.key === "F4") { event.preventDefault(); document.querySelector("[data-pos-customer]")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
      if (event.key === "Escape" && document.activeElement === searchRef.current) { setSearch(""); searchRef.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;
    const exact = findProductSelectionByScan(db.products, search);
    if (exact && db.settings.pos.barcodeAutoAdd !== false) {
      event.preventDefault();
      addProduct(exact.product, exact);
      setSearch("");
      return;
    }
    if (products.length === 1) {
      event.preventDefault();
      addProduct(products[0]);
      setSearch("");
    }
  };

  const openShiftManager = (mode = currentShift ? "CASH" : "OPEN") => {
    const cashboxId = currentShift?.cashboxId || activeCashboxes[0]?.id || "";
    setShiftMode(mode);
    setShiftForm((current) => ({
      ...current,
      cashboxId,
      openingBalance: mode === "OPEN" ? String(activeCashboxes.find((item) => item.id === cashboxId)?.balance || 0) : current.openingBalance,
      closingBalance: mode === "CLOSE" ? String(currentShift?.expectedCash ?? currentShift?.cashbox?.balance ?? 0) : current.closingBalance,
      amount: "", description: "", note: "",
    }));
    setShiftOpen(true);
  };

  const submitShiftAction = async (event) => {
    event.preventDefault();
    if (shiftBusy) return;
    setShiftBusy(true);
    try {
      if (shiftMode === "OPEN") {
        if (!shiftForm.cashboxId) throw new Error("Faol kassa tanlang");
        await apiRequest({ url: "/pos/shifts/open", body: { cashboxId: shiftForm.cashboxId, openingBalance: Number(shiftForm.openingBalance || 0), note: shiftForm.note.trim() || undefined } });
        notify("Smena ochildi");
      } else if (shiftMode === "CLOSE") {
        if (!currentShift?.id) throw new Error("Ochiq smena topilmadi");
        await apiRequest({ url: `/pos/shifts/${currentShift.id}/close`, body: { closingBalance: Number(shiftForm.closingBalance || 0), note: shiftForm.note.trim() || undefined } });
        notify("Smena yopildi");
      } else {
        if (!currentShift?.id) throw new Error("Avval smenani oching");
        if (!(Number(shiftForm.amount) > 0)) throw new Error("Summani kiriting");
        await apiRequest({ url: `/pos/shifts/${currentShift.id}/cash`, body: { type: shiftForm.cashType, amount: Number(shiftForm.amount), description: shiftForm.description.trim() || (shiftForm.cashType === "CASH_OUT" ? "Kassadan chiqim" : "Kassaga kirim") } });
        notify(shiftForm.cashType === "CASH_OUT" || shiftForm.cashType === "EXPENSE" ? "Kassa chiqimi yozildi" : "Kassa kirimi yozildi");
      }
      setShiftOpen(false);
    } catch (error) { notify(error.message, "danger"); }
    finally { setShiftBusy(false); }
  };

  const changeBranch = (branchId) => {
    const branch = activeBranches.find((item) => item.id === branchId);
    if (!branch) return;
    const shiftBranchId = currentShiftCashbox?.branchId || "";
    if (currentShift && shiftBranchId && shiftBranchId !== branch.id) { notify("Ochiq smena vaqtida boshqa filialga o‘tib bo‘lmaydi. Avval smenani yoping.", "warning"); return; }
    if (cart.length && !window.confirm("Filialni almashtirsangiz joriy savat tozalanadi. Davom etasizmi?")) return;
    setSelectedBranchId(branch.id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEYS.selectedBranchId, branch.id);
    updateLocalDb((draft) => {
      draft.settings.company.branch = branch.name;
      const preferred = (draft.warehouses || []).find((warehouse) => warehouse.status === "ACTIVE" && (!warehouse.branchId || warehouse.branchId === branch.id));
      if (preferred) draft.settings.pos.warehouseId = preferred.id;
    });
    setCart([]);
    setCustomerId("");
    setCashReceived("");
    setBranchOpen(false);
    notify(`${branch.name} filialiga o‘tildi`);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      notify("To‘liq ekran rejimi mavjud emas", "warning");
    }
  };

  const createCustomer = async (event) => {
    event.preventDefault(); if (!customerForm.name.trim()) return;
    try { const customer = await apiRequest({ url: "/customers", body: { code: `CUS-${Date.now().toString(36).toUpperCase()}`, name: customerForm.name.trim(),
      phone: customerForm.phone.trim() || undefined, creditLimit: Number(customerForm.creditLimit || 0), status: "ACTIVE" } });
      selectCustomer(customer.id); setCustomerOpen(false); setCustomerForm({ name: "", phone: "", creditLimit: "" }); notify("Mijoz yaratildi");
    } catch (error) { notify(error.message, "danger"); }
  };

  const chooseReturnOrder = (nextOrderId) => {
    setReturnOrderId(nextOrderId);
    const order = returnCompletedOrders.find((item) => item.id === nextOrderId);
    setReturnDraftItems(Object.fromEntries((order?.items || []).map((line) => [line.id, blankReturnLine()])));
  };

  const updateReturnDraftLine = (lineId, patch) => setReturnDraftItems((current) => ({
    ...current,
    [lineId]: { ...(current[lineId] || blankReturnLine()), ...patch },
  }));

  const toggleReturnSerial = (lineId, serialId, required) => {
    setReturnDraftItems((current) => {
      const line = current[lineId] || blankReturnLine();
      const exists = line.serialIds.includes(serialId);
      const serialIds = exists ? line.serialIds.filter((id) => id !== serialId) : [...line.serialIds, serialId].slice(0, Math.max(0, required));
      return { ...current, [lineId]: { ...line, serialIds } };
    });
  };

  const submitPosReturn = async (event) => {
    event.preventDefault();
    if (returnBusy) return;
    if (!selectedReturnOrder) return notify("Yakunlangan sotuvni tanlang", "warning");
    if (returnReason.trim().length < 3) return notify("Qaytarish sababini kiriting", "warning");
    const items = [];
    for (const line of selectedReturnOrder.items || []) {
      const draft = returnDraftItems[line.id] || blankReturnLine();
      const quantity = numeric(draft.quantity);
      if (quantity <= 0) continue;
      const remaining = numeric(line.quantity) - numeric(returnClaims.quantityByItem.get(line.id));
      if (quantity > remaining + 1e-9) return notify(`${posReturnLineLabel(line)} uchun qaytarish miqdori qoldiqdan katta`, "warning");
      const product = line.product || db.products.find((item) => item.id === line.productId);
      const baseQuantity = Math.round(quantity * numeric(line.conversionToBase || 1) * 1000) / 1000;
      if (product?.trackSerial) {
        if (!Number.isInteger(baseQuantity)) return notify(`${posReturnLineLabel(line)} uchun miqdor butun base birlik bo‘lishi kerak`, "warning");
        if ((draft.serialIds || []).length !== baseQuantity) return notify(`${posReturnLineLabel(line)} uchun ${baseQuantity} ta serial/IMEI tanlang`, "warning");
      }
      if ((product?.trackLot || product?.trackExpiry) && draft.condition === "RESTOCK" && !(Array.isArray(line.batchAllocations) && line.batchAllocations.length)) {
        return notify(`${posReturnLineLabel(line)} sotuvining lot identifikatori yo‘q. Shikastlangan/utilizatsiya holatini tanlang yoki tracked qoldiq tuzatishidan foydalaning.`, "warning");
      }
      items.push({ orderItemId: line.id, quantity, condition: draft.condition, ...(draft.serialIds?.length ? { serialIds: draft.serialIds } : {}) });
    }
    if (!items.length) return notify("Kamida bitta mahsulot uchun qaytarish miqdorini kiriting", "warning");
    setReturnBusy(true);
    try {
      const created = await apiRequest({ url: "/returns", body: { orderId: selectedReturnOrder.id, reason: returnReason.trim(), items } });
      notify(`${created.number} qaytarish so‘rovi yaratildi`, "success");
      setReturnOrderId(""); setReturnDraftItems({}); setReturnReason("Mijoz qaytarishi");
    } catch (error) { notify(error.message, "danger"); }
    finally { setReturnBusy(false); }
  };

  const runPosReturnAction = async (row, action) => {
    if (returnBusy) return;
    setReturnBusy(true);
    try {
      await apiRequest({ url: `/returns/${row.id}/${action}` });
      notify(action === "approve" ? "Qaytarish tasdiqlandi" : "Qaytarilgan mahsulot omborga qabul qilindi", "success");
    } catch (error) { notify(error.message, "danger"); }
    finally { setReturnBusy(false); }
  };

  const openPosRefund = (row) => {
    setReturnRefundRow(row);
    setReturnRefundMethodCode(returnRefundOptions[0]?.code || "CASH");
    setReturnRefundNote("");
  };

  const submitPosRefund = async (event) => {
    event.preventDefault();
    if (!returnRefundRow || !selectedReturnRefundOption || returnBusy) return;
    setReturnBusy(true);
    try {
      await apiRequest({ url: `/returns/${returnRefundRow.id}/refund`, body: {
        method: selectedReturnRefundOption.method, methodCode: selectedReturnRefundOption.code,
        ...(currentShift?.id ? { shiftId: currentShift.id } : {}),
        ...(returnRefundNote.trim() ? { note: returnRefundNote.trim() } : {}),
      } });
      notify(returnRefundSettlement.creditOffset > 0 ? `Qaytarish yopildi: ${formatMoney(returnRefundSettlement.creditOffset)} qarzdan kamaytirildi${returnRefundSettlement.payoutAmount > 0 ? `, ${formatMoney(returnRefundSettlement.payoutAmount)} qaytarildi` : ""}` : "Pul qaytarildi", "success");
      setReturnRefundRow(null);
    } catch (error) { notify(error.message, "danger"); }
    finally { setReturnBusy(false); }
  };

  useEffect(() => {
    if ((db.paymentMethods || []).some((item) => item.status === "ACTIVE" && item.code === paymentMethod)) return;
    const first = (db.paymentMethods || []).find((item) => item.status === "ACTIVE"); if (first) setPaymentMethod(first.code);
  }, [db.paymentMethods, paymentMethod]);

  const paymentIcon = (method) => {
    const type = method?.method || method?.code || "";
    if (type === "CASH") return <Banknote size={18}/>;
    if (type === "CARD") return <CreditCard size={18}/>;
    if (type === "QR") return <QrCode size={18}/>;
    if (type === "CREDIT") return <WalletCards size={18}/>;
    if (type === "BANK") return <Landmark size={18}/>;
    return <WalletCards size={18}/>;
  };



  return (
    <>
      <MobilePinGate />
      <div className="qp-pos-pro-shell">
        <div className="qp-pos-stage">
          <header className="qp-pos-pro-header">
            <div className="qp-pos-pro-title"><ShoppingCart size={22}/><div><strong>Kassa</strong><span className={currentShift ? "online" : "offline"}><i/>{currentShift ? "Online" : "Smena yopiq"}</span></div></div>
            <div className="qp-pos-pro-context">
              <button type="button" className="qp-pos-context-button" onClick={() => setBranchOpen(true)}><Store size={17}/><span>{selectedBranch?.name || db.settings.company.branch || "Filial"}</span><ChevronDown size={14}/></button>
              <span className="qp-pos-signal"><Wifi size={18}/></span>
              <button type="button" className={`qp-pos-shift-chip ${currentShift ? "open" : "closed"}`} onClick={() => openShiftManager(currentShift ? "CASH" : "OPEN")}><Banknote size={16}/><span>{currentShift ? "Smena" : "Smenani ochish"}</span></button>
              <button type="button" className="qp-pos-icon-top" aria-label="Bildirishnomalar" onClick={() => setQuickPanel("notifications")}><Bell size={18}/><i>{posNotifications.filter((item) => !item.read && !item.readAt).length || ""}</i></button>
              {db.settings.mobile?.cameraScanner !== false ? <button type="button" className="qp-pos-icon-top" title="Kamera bilan skanerlash" onClick={() => setScannerOpen(true)}><Camera size={18}/></button> : null}
              <button type="button" className="qp-pos-icon-top" title="To‘liq ekran" onClick={toggleFullscreen}><Expand size={18}/></button>
              <div className="qp-pos-user-chip"><span>{(user?.name || "K").slice(0,2).toUpperCase()}</span><div><strong>{user?.name || "Kassir"}</strong><small>Kassir</small></div></div>
              <button type="button" className="qp-pos-icon-top" title="Kassadan chiqish" onClick={() => exitPosWorkspace(navigate)}><LogOut size={18}/></button>
            </div>
          </header>

          <div className="qp-pos-check-strip">
            <button type="button" className="qp-pos-check-summary" onClick={() => setShowHeld((value) => !value)}><ReceiptText size={16}/><span>Ochiq chek</span><b>{(db.heldCarts || []).length + 1}</b></button>
            <div className="qp-pos-check-tabs-pro"><button type="button" className="active" aria-current="true" onClick={() => { setMobileView("products"); searchRef.current?.focus(); }}><span>#1</span><strong>{formatMoney(total)}</strong></button>{(db.heldCarts || []).slice(0, 4).map((held, index) => <button type="button" key={held.id} onClick={() => restoreCart(held)}><span>#{index + 2}</span><strong>{formatMoney((held.items || held.cart || []).reduce((sum, item) => sum + Number(item.unitPrice ?? item.price) * Number(item.quantity), 0))}</strong></button>)}</div>
            <button type="button" className="qp-pos-new-check" onClick={() => { if (cart.length) holdCart(); else searchRef.current?.focus(); }}><Plus size={17}/> Yangi chek</button>
          </div>

          <nav className="qp-pos-mobile-switch" aria-label="Kassa mobil bo‘limlari">
            <button type="button" className={mobileView === "products" ? "active" : ""} onClick={() => setMobileView("products")}><ScanBarcode size={18} /> Mahsulotlar</button>
            <button type="button" className={mobileView === "cart" ? "active" : ""} onClick={() => setMobileView("cart")}><ShoppingCart size={18} /> Savat <span>{cart.length}</span></button>
          </nav>

          <div className="qp-pos-pro-grid">
            <section className={`qp-pos-products-panel qp-pos-products-pro ${mobileView === "products" ? "is-mobile-active" : ""}`}>
              <div className="qp-pos-search-actions-row">
                <div className="qp-pos-search-wrap qp-pos-search-pro">
                  <ScanBarcode size={20}/>
                  <input ref={searchRef} className="qp-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Mahsulot qidiring (nomi, shtrix-kod, SKU, IMEI...)" />
                  {search ? <button type="button" onClick={() => setSearch("")} aria-label="Qidiruvni tozalash"><X size={15}/></button> : null}
                  {db.settings.mobile?.cameraScanner !== false ? <button type="button" className="qp-pos-inline-camera" onClick={() => setScannerOpen(true)} aria-label="Kamera bilan skanerlash"><Camera size={16}/></button> : null}
                </div>
                <button type="button" className="qp-pos-utility-action return" onClick={() => { setReturnView("create"); setQuickPanel("returns"); }}><RotateCcw size={17}/><span>Qaytarish</span></button>
                <button type="button" className="qp-pos-utility-action" onClick={() => setQuickPanel("history")}><ArrowLeftRight size={17}/><span>Savdo tarixi</span></button>
              </div>

              <div className="qp-pos-products-toolbar">
                <div className="qp-category-tabs qp-pos-category-tabs qp-pos-category-tabs-pro">
                  <button type="button" className={categoryId === "ALL" ? "active" : ""} onClick={() => setCategoryId("ALL")}><LayoutGrid size={15}/> Barchasi</button>
                  {db.categories.filter((category) => category.status !== "INACTIVE").map((category) => <button key={category.id} type="button" className={categoryId === category.id ? "active" : ""} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}
                  <button type="button" className="qp-pos-new-category" onClick={openCategoryCreate}><Plus size={16}/> Kategoriya</button>
                </div>
                <div className="qp-pos-view-switch" role="group" aria-label="Mahsulot ko‘rinishi"><button type="button" className={productView === "card" ? "active" : ""} onClick={() => changeProductView("card")} title="Kartochka ko‘rinishi"><LayoutGrid size={18}/></button><button type="button" className={productView === "list" ? "active" : ""} onClick={() => changeProductView("list")} title="Ro‘yxat ko‘rinishi"><List size={18}/></button></div>
              </div>

              <div className="qp-pos-product-scroll">
                <div className={`qp-product-grid qp-product-grid-focus qp-product-grid-pro ${productView === "list" ? "is-list-view" : "is-card-view"}`}>
                  {products.map((product) => { const available = availableFor(product.id); const unit = getName(db.units, product.unitId) || "dona"; return <button type="button" className={`qp-product-tile qp-product-tile-focus qp-product-card-pro ${available <= 0 ? "out" : ""}`} key={product.id} onClick={() => addProduct(product)} disabled={available <= 0 && !db.settings.inventory.allowNegativeStock}>
                    <div className="qp-product-card-media">{product.image ? <img src={product.image} alt=""/> : <span>{product.name.slice(0,1).toUpperCase()}</span>}{product.trackSerial ? <i>IMEI</i> : product.variants?.length ? <i>{product.variants.length} variant</i> : product.packages?.length ? <i>{product.packages.length} qadoq</i> : null}</div>
                    <div className="qp-product-card-copy"><strong>{product.name}</strong><small>{available} {unit} · SKU {product.sku}</small><b>{formatMoney(priceFor(product))}</b></div>
                  </button>; })}
                </div>
                {!products.length ? <div className="qp-empty"><strong>Mahsulot topilmadi</strong><span>Qidiruvni yoki kategoriyani o‘zgartiring.</span></div> : null}
              </div>
            </section>

            <aside className={`qp-pos-checkout-panel qp-pos-checkout-pro ${mobileView === "cart" ? "is-mobile-active" : ""}`}>
              <div className="qp-pos-customer-pro">
                <div className="qp-pos-customer-head"><div><Users size={18}/><strong>Mijoz tanlash</strong></div><button type="button" className="qp-pos-add-customer" title="Yangi mijoz" onClick={() => setCustomerOpen(true)}><Plus size={18}/></button></div>
                <div className="qp-pos-customer-select"><Users size={17}/><Select data-pos-customer value={customerId} onChange={(event) => selectCustomer(event.target.value)}>{db.settings.pos.allowAnonymousCustomer !== false ? <option value="">Anonim mijoz</option> : <option value="">Mijozni tanlang</option>}{db.customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</Select></div>
                {selectedCustomer ? <div className="qp-pos-customer-meta"><span>Joriy qarz <strong>{formatMoney(selectedCustomer.debt || 0)}</strong></span><span>Kredit limiti <strong>{formatMoney(selectedCustomer.creditLimit || 0)}</strong></span></div> : null}
              </div>

              <div className="qp-pos-cart-head qp-pos-cart-head-pro"><div><h2><ShoppingCart size={20}/> Savat <span>({cart.length})</span></h2><p>{cart.length ? `${totalQuantity} birlik · ${formatMoney(total)}` : "Sotuvni boshlash uchun mahsulot qo‘shing"}</p></div><div className="qp-inline-actions">{db.settings.pos.allowHeldCarts !== false ? <button type="button" className="qp-icon-button" title="Saqlangan savatlar" onClick={() => setShowHeld((value) => !value)}><Archive size={17}/>{db.heldCarts.length ? <span className="qp-mini-count">{db.heldCarts.length}</span> : null}</button> : null}{cart.length ? <button type="button" className="qp-icon-button qp-danger-ghost" title="Savatni tozalash" onClick={() => setCart([])}><Trash2 size={17}/></button> : null}</div></div>
              {showHeld ? <div className="qp-held-carts qp-held-carts-focus qp-held-carts-pro">{db.heldCarts.length ? db.heldCarts.map((held) => <button type="button" key={held.id} onClick={() => restoreCart(held)}><strong>{(held.items || held.cart)?.length || 0} tur · {formatMoney((held.items || held.cart || []).reduce((sum, item) => sum + Number(item.unitPrice ?? item.price) * Number(item.quantity), 0))}</strong><span>{formatDateTime(held.createdAt)}</span></button>) : <div className="qp-muted">Saqlangan savat yo‘q</div>}</div> : null}

              <div className="qp-cart-lines qp-cart-lines-focus qp-cart-lines-pro">
                {cart.length ? cart.map((line, index) => <div className="qp-cart-line qp-cart-line-focus qp-cart-line-pro" key={line.key}><span className="qp-cart-row-number">{index + 1}</span><div className="qp-cart-product-cell"><strong>{line.name}</strong><span>{[line.variantName, line.packageName].filter(Boolean).join(" · ") || `SKU ${line.sku || "—"}`}</span></div><div className="qp-qty-controls qp-qty-controls-pro"><button type="button" disabled={Boolean(line.serialIds?.length)} onClick={() => updateQuantity(line.key, -1)}><Minus size={13}/></button><input value={line.quantity} disabled={Boolean(line.serialIds?.length)} inputMode="decimal" onChange={(event) => updateQuantity(line.key, event.target.value, true)}/><button type="button" disabled={Boolean(line.serialIds?.length)} onClick={() => updateQuantity(line.key, 1)}><Plus size={13}/></button></div><div className="qp-cart-price-cell"><small>{formatMoney(line.price)}</small><strong>{formatMoney(Math.max(0, line.quantity * line.price - (line.discountType === "PERCENT" ? line.quantity * line.price * Math.min(100,Number(line.discountValue)||0)/100 : Number(line.discountValue)||0)))}</strong></div><div className="qp-line-discount qp-line-discount-pro"><select value={line.discountType} onChange={(event) => setCart((current) => current.map((item) => item.key === line.key ? {...item,discountType:event.target.value}:item))}><option value="PERCENT">%</option><option value="FIXED">UZS</option></select><input inputMode="decimal" placeholder="0" value={line.discountValue} onChange={(event) => setCart((current) => current.map((item) => item.key === line.key ? {...item,discountValue:event.target.value.replace(/[^0-9.]/g,'')}:item))}/></div><button type="button" className="qp-cart-remove-pro" onClick={() => removeLine(line.key)} aria-label="Mahsulotni savatdan o‘chirish"><Trash2 size={15}/></button></div>) : <div className="qp-pos-empty-cart"><ShoppingCart size={34}/><strong>Savat bo‘sh</strong><span>Mahsulotni bosing yoki shtrix-kodni skaner qiling</span></div>}
              </div>

              <div className="qp-pos-payment-area qp-pos-payment-pro">
                <div className="qp-general-discount qp-general-discount-pro"><span>Umumiy chegirma</span><div><button type="button" className={generalDiscount.type === "PERCENT" ? "active" : ""} onClick={() => setGeneralDiscount((current) => ({ ...current, type: "PERCENT" }))}>%</button><button type="button" className={generalDiscount.type === "FIXED" ? "active" : ""} onClick={() => setGeneralDiscount((current) => ({ ...current, type: "FIXED" }))}>UZS</button></div><input inputMode="decimal" value={generalDiscount.value} onChange={(event) => setGeneralDiscount((current) => ({ ...current, value: event.target.value.replace(/[^0-9.]/g, "") }))} placeholder="0"/></div>
                <div className="qp-pos-grand-total"><span>Jami</span><strong>{formatMoney(total)}</strong></div>
                <div className="qp-pos-payment-label">To‘lov usuli</div>
                <div className="qp-payment-methods qp-payment-methods-focus qp-payment-methods-pro">{(db.paymentMethods || []).filter((item) => item.status === "ACTIVE").map((method) => <button type="button" key={method.id} title={method.shortcut || undefined} className={`qp-payment-method ${paymentMethod === method.code ? "active" : ""}`} onClick={() => setPaymentMethod(method.code)}>{paymentIcon(method)}<span>{method.name}</span></button>)}</div>
                {selectedPaymentType === "CASH" ? <div className="qp-pos-cash-section qp-pos-cash-pro"><div className="qp-pos-cash-grid"><label className="qp-field"><span>Qabul qilindi</span><div className="qp-money-input"><input className="qp-input" inputMode="numeric" value={cashReceived} onChange={(event) => setCashReceived(event.target.value.replace(/[^0-9.]/g, ""))} placeholder={String(total || 0)}/><b>UZS</b></div></label><div className="qp-pos-change"><span>Qaytim</span><strong>{formatMoney(change)}</strong></div></div>{quickCashValues.length ? <div className="qp-pos-quick-cash">{quickCashValues.map((value) => <button key={value} type="button" onClick={() => setCashReceived(String(value))}>{value === total ? "Aniq summa" : formatMoney(value)}</button>)}</div> : null}</div> : null}
                {selectedPaymentType === "CREDIT" ? <label className="qp-field"><span>To‘lov muddati</span><input className="qp-input" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)}/></label> : null}
                <div className="qp-pos-payment-summary"><span><small>Oraliq jami</small><b>{formatMoney(subtotal)}</b></span>{itemDiscount + generalDiscountAmount > 0 ? <span><small>Chegirma</small><b>-{formatMoney(itemDiscount + generalDiscountAmount)}</b></span> : null}</div>
                <div className="qp-pos-cart-actions qp-pos-cart-actions-pro">{db.settings.pos.allowHeldCarts !== false ? <SecondaryButton disabled={!cart.length || checkoutBusy} onClick={holdCart}><Archive size={15}/> Kutishga qo‘yish</SecondaryButton> : null}<PrimaryButton disabled={checkoutBusy || !cart.length || (!customerId && db.settings.pos.allowAnonymousCustomer === false)} onClick={checkout}>{checkoutBusy ? <><LoaderCircle className="qp-spin" size={15}/> Yakunlanmoqda...</> : <><Check size={17}/> Savdoni yakunlash <kbd>F8</kbd></>}</PrimaryButton></div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Modal open={shiftOpen} title={shiftMode === "OPEN" ? "Smenani ochish" : shiftMode === "CLOSE" ? "Smenani yopish" : "Kassa harakati"} description={currentShift ? `Joriy smena: ${formatMoney(currentShift.expectedCash || 0)}` : "Naqd savdo uchun smena ochiq bo‘lishi kerak."} onClose={() => !shiftBusy && setShiftOpen(false)}>
        <form className="qp-form-stack qp-pos-shift-form" onSubmit={submitShiftAction}>
          {shiftMode === "OPEN" ? <>
            <Field label="Kassa"><Select value={shiftForm.cashboxId} onChange={(event) => setShiftForm((current) => ({ ...current, cashboxId: event.target.value }))}><option value="">Kassani tanlang</option>{activeCashboxes.map((cashbox) => <option key={cashbox.id} value={cashbox.id}>{cashbox.name} · {cashbox.code}</option>)}</Select></Field>
            {!activeCashboxes.length ? <div className="qp-inline-alert warning">Bu filial/ombor uchun faol kassa topilmadi. Boshqaruv → Kassa sozlamalaridan kassa yarating.</div> : null}
            <Field label="Boshlang‘ich naqd"><input className="qp-input" type="number" min="0" step="0.01" value={shiftForm.openingBalance} onChange={(event) => setShiftForm((current) => ({ ...current, openingBalance: event.target.value }))}/></Field>
          </> : null}
          {shiftMode === "CASH" ? <>
            <div className="qp-pos-shift-summary"><span>Kutilayotgan naqd</span><strong>{formatMoney(currentShift?.expectedCash || 0)}</strong></div>
            <Field label="Harakat turi"><Select value={shiftForm.cashType} onChange={(event) => setShiftForm((current) => ({ ...current, cashType: event.target.value }))}><option value="CASH_IN">Kassaga kirim</option><option value="CASH_OUT">Kassadan chiqim</option><option value="INCOME">Boshqa daromad</option><option value="EXPENSE">Boshqa xarajat</option></Select></Field>
            <Field label="Summa"><input className="qp-input" type="number" min="0.01" step="0.01" value={shiftForm.amount} onChange={(event) => setShiftForm((current) => ({ ...current, amount: event.target.value }))}/></Field>
            <Field label="Izoh"><input className="qp-input" value={shiftForm.description} onChange={(event) => setShiftForm((current) => ({ ...current, description: event.target.value }))} placeholder="Masalan: mayda pul qo‘shildi"/></Field>
          </> : null}
          {shiftMode === "CLOSE" ? <><div className="qp-pos-shift-summary"><span>Tizim bo‘yicha</span><strong>{formatMoney(currentShift?.expectedCash || 0)}</strong></div><Field label="Sanab chiqilgan naqd"><input className="qp-input" type="number" min="0" step="0.01" value={shiftForm.closingBalance} onChange={(event) => setShiftForm((current) => ({ ...current, closingBalance: event.target.value }))}/></Field></> : null}
          {shiftMode !== "CASH" ? <Field label="Izoh (ixtiyoriy)"><textarea className="qp-input" rows="3" value={shiftForm.note} onChange={(event) => setShiftForm((current) => ({ ...current, note: event.target.value }))}/></Field> : null}
          <div className="qp-form-actions">
            {currentShift && shiftMode === "CASH" ? <SecondaryButton type="button" onClick={() => openShiftManager("CLOSE")}>Smenani yopish</SecondaryButton> : <SecondaryButton type="button" onClick={() => setShiftOpen(false)}>Bekor qilish</SecondaryButton>}
            <PrimaryButton type="submit" disabled={shiftBusy || (shiftMode === "OPEN" && !activeCashboxes.length)}>{shiftBusy ? <><LoaderCircle className="qp-spin" size={15}/> Saqlanmoqda...</> : shiftMode === "OPEN" ? "Smenani ochish" : shiftMode === "CLOSE" ? "Smenani yopish" : "Harakatni saqlash"}</PrimaryButton>
          </div>
        </form>
      </Modal>
      <Modal open={branchOpen} title="Filialni tanlang" description="Kassa qoldiq va ombor kontekstini tanlangan filialga moslaydi." onClose={() => setBranchOpen(false)}>
        <div className="qp-pos-branch-picker">
          {activeBranches.length ? activeBranches.map((branch) => {
            const warehouseCount = (db.warehouses || []).filter((warehouse) => warehouse.status === "ACTIVE" && (!warehouse.branchId || warehouse.branchId === branch.id)).length;
            return <button type="button" key={branch.id} className={selectedBranch?.id === branch.id ? "active" : ""} onClick={() => changeBranch(branch.id)}>
              <Store size={18}/><span><strong>{branch.name}</strong><small>{warehouseCount} ta faol ombor</small></span>{selectedBranch?.id === branch.id ? <Check size={16}/> : null}
            </button>;
          }) : <div className="qp-role-empty">Faol filial topilmadi.</div>}
        </div>
      </Modal>
      <Modal open={Boolean(quickPanel)} title={quickPanel === "returns" ? "Qaytarish" : quickPanel === "notifications" ? "Bildirishnomalar" : "Savdo tarixi"} description="Kassadan chiqmasdan tezkor ko‘rish va ishni davom ettirish." onClose={() => setQuickPanel("")} wide>
        {quickPanel === "history" ? <div className="qp-pos-inline-workspace"><div className="qp-pos-inline-workspace-head"><strong>Oxirgi savdolar</strong><span>{(db.orders || []).filter((order) => order.status === "COMPLETED").length} ta yakunlangan savdo</span></div><div className="qp-pos-inline-list">{(db.orders || []).filter((order) => order.status === "COMPLETED").slice(0, 30).map((order) => <article key={order.id}><div><strong>{order.number || "Savdo"}</strong><span>{order.customer?.name || db.customers.find((item) => item.id === order.customerId)?.name || "Anonim mijoz"}</span></div><div><strong>{formatMoney(order.total)}</strong><span>{formatDateTime(order.completedAt || order.createdAt)}</span></div></article>)}</div></div> : null}
        {quickPanel === "notifications" ? <div className="qp-pos-inline-workspace"><div className="qp-pos-inline-workspace-head"><div><strong>Bildirishnomalar</strong><span>{posNotifications.filter((item) => !item.read && !item.readAt).length} ta o‘qilmagan</span></div>{posNotifications.some((item) => !item.read && !item.readAt) ? <SecondaryButton type="button" onClick={markAllPosNotificationsRead}><Check size={14}/> Hammasini o‘qish</SecondaryButton> : null}</div><div className="qp-pos-notification-list">{posNotifications.length ? posNotifications.map((item) => <button type="button" key={item.id} className={`qp-pos-notification ${item.read || item.readAt ? "read" : "unread"}`} onClick={() => markPosNotificationRead(item)}><span className="qp-pos-notification-icon"><Bell size={15}/></span><span><strong>{item.title || "Bildirishnoma"}</strong><small>{item.message || item.description || ""}</small><i>{item.createdAt ? formatDateTime(item.createdAt) : ""}</i></span>{!item.read && !item.readAt ? <b/> : null}</button>) : <div className="qp-empty"><strong>Yangi bildirishnoma yo‘q</strong><span>Kassa bilan bog‘liq yangi xabarlar shu yerda ko‘rinadi.</span></div>}</div></div> : null}
        {quickPanel === "returns" ? <div className="qp-pos-return-workspace">
          <div className="qp-pos-return-tabs" role="tablist" aria-label="Qaytarish jarayoni">
            <button type="button" className={returnView === "create" ? "active" : ""} onClick={() => setReturnView("create")}><RotateCcw size={15}/> Yangi qaytarish</button>
            <button type="button" className={returnView === "list" ? "active" : ""} onClick={() => setReturnView("list")}><History size={15}/> Jarayonlar <span>{(db.returns || []).length}</span></button>
          </div>
          {returnView === "create" ? <form className="qp-pos-return-create" onSubmit={submitPosReturn}>
            <div className="qp-form-grid">
              <Field label="Yakunlangan sotuv"><Select searchable value={returnOrderId} onChange={(event) => chooseReturnOrder(event.target.value)}><option value="">Sotuvni tanlang</option>{returnCompletedOrders.map((order) => <option key={order.id} value={order.id}>{order.number} · {order.customer?.name || getName(db.customers, order.customerId) || "Anonim mijoz"} · {formatMoney(order.total)}</option>)}</Select></Field>
              <Field label="Qaytarish sababi"><input className="qp-input" value={returnReason} maxLength={1000} onChange={(event) => setReturnReason(event.target.value)} placeholder="Masalan: mijoz fikrini o‘zgartirdi"/></Field>
            </div>
            {selectedReturnOrder ? <div className="qp-pos-return-lines">{(selectedReturnOrder.items || []).map((line) => {
              const remaining = Math.max(0, numeric(line.quantity) - numeric(returnClaims.quantityByItem.get(line.id)));
              if (remaining <= 1e-9) return null;
              const draft = returnDraftItems[line.id] || blankReturnLine();
              const product = line.product || db.products.find((item) => item.id === line.productId);
              const baseQuantity = Math.round(numeric(draft.quantity) * numeric(line.conversionToBase || 1) * 1000) / 1000;
              const requiredSerials = Number.isInteger(baseQuantity) && baseQuantity > 0 ? baseQuantity : 0;
              const availableSerials = (line.serials || []).filter((serial) => serial.status === "SOLD" && !returnClaims.serialIds.has(serial.id));
              return <section className="qp-pos-return-line" key={line.id}>
                <header><div><strong>{posReturnLineLabel(line)}</strong><span>Sotilgan: {Number(line.quantity)} · qaytarish mumkin: {remaining}</span></div><b>{formatMoney(numeric(line.unitPrice) * numeric(draft.quantity))}</b></header>
                <div className="qp-form-grid">
                  <Field label="Miqdor" hint={line.packageName ? `1 ${line.packageName} = ${Number(line.conversionToBase || 1)} base birlik` : ""}><input className="qp-input" type="number" min="0" max={remaining} step="0.001" value={draft.quantity} onChange={(event) => updateReturnDraftLine(line.id, { quantity: event.target.value, serialIds: [] })}/></Field>
                  <Field label="Holati"><Select value={draft.condition} onChange={(event) => updateReturnDraftLine(line.id, { condition: event.target.value })}><option value="RESTOCK">Sotuvga qaytarish</option><option value="DAMAGED">Shikastlangan</option><option value="DISPOSE">Utilizatsiya</option></Select></Field>
                  {product?.trackSerial && numeric(draft.quantity) > 0 ? <div className="qp-form-grid-span"><Field label={`Serial / IMEI (${draft.serialIds.length}/${requiredSerials})`} hint="Mijoz qaytargan aynan o‘sha qurilmani tanlang."><div className="qp-selector-serials">{availableSerials.length ? availableSerials.map((serial) => <label key={serial.id}><input type="checkbox" checked={draft.serialIds.includes(serial.id)} onChange={() => toggleReturnSerial(line.id, serial.id, requiredSerials)}/><span>{serial.imei || serial.serial}{serial.batch?.lotNumber ? ` · lot ${serial.batch.lotNumber}` : ""}</span></label>) : <span className="qp-muted">Sotilgan serial/IMEI identifikatori topilmadi.</span>}</div></Field></div> : null}
                </div>
              </section>;
            })}</div> : <div className="qp-empty"><strong>Sotuvni tanlang</strong><span>Qaytariladigan mahsulotlar va qolgan qaytarish miqdori avtomatik chiqadi.</span></div>}
            <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setQuickPanel("")}>Yopish</SecondaryButton><PrimaryButton type="submit" disabled={returnBusy || !selectedReturnOrder || !can("sales.create")}>{returnBusy ? <><LoaderCircle className="qp-spin" size={15}/> Saqlanmoqda...</> : <><RotateCcw size={15}/> Qaytarish so‘rovi</>}</PrimaryButton></div>
          </form> : <div className="qp-pos-inline-workspace">
            <div className="qp-pos-inline-workspace-head"><strong>Qaytarish jarayonlari</strong><span>Tasdiqlash, omborga qabul qilish va refund shu oynada bajariladi.</span></div>
            <div className="qp-pos-return-list">{(db.returns || []).length ? (db.returns || []).slice(0, 40).map((row) => <article key={row.id}>
              <div className="qp-pos-return-main"><strong>{row.number || "Qaytarish"}</strong><span>{row.order?.number || db.orders.find((order) => order.id === row.orderId)?.number || "—"} · {row.customer?.name || db.customers.find((customer) => customer.id === row.customerId)?.name || "Anonim mijoz"}</span><small>{row.reason || "Sabab ko‘rsatilmagan"}</small></div>
              <div className="qp-pos-return-meta"><strong>{formatMoney(row.total)}</strong><span>{row.status}</span></div>
              <div className="qp-pos-return-actions">
                {row.status === "REQUESTED" && can("sales.approve") ? <SecondaryButton type="button" disabled={returnBusy} onClick={() => runPosReturnAction(row, "approve")}><Check size={14}/> Tasdiqlash</SecondaryButton> : null}
                {row.status === "APPROVED" && can("inventory.update") ? <SecondaryButton type="button" disabled={returnBusy} onClick={() => runPosReturnAction(row, "receive")}><PackageCheck size={14}/> Qabul qilish</SecondaryButton> : null}
                {row.status === "RECEIVED" && can("finance.approve") ? <SecondaryButton type="button" disabled={returnBusy} onClick={() => openPosRefund(row)}><WalletCards size={14}/> Pul qaytarish</SecondaryButton> : null}
              </div>
            </article>) : <div className="qp-empty"><strong>Qaytarish yo‘q</strong><span>Yangi qaytarish yaratilganda shu yerda ko‘rinadi.</span></div>}</div>
          </div>}
        </div> : null}
      </Modal>
      <Modal open={Boolean(returnRefundRow)} title="Pulni qaytarish" description={returnRefundRow ? `${returnRefundRow.number} · ${formatMoney(returnRefundRow.total)}` : ""} onClose={() => !returnBusy && setReturnRefundRow(null)}>
        <form onSubmit={submitPosRefund}>
          <div className="qp-form-grid"><Field label="Qaytarish usuli"><Select value={returnRefundMethodCode || returnRefundOptions[0]?.code || ""} onChange={(event) => setReturnRefundMethodCode(event.target.value)}>{returnRefundOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</Select></Field><Field label="Izoh"><input className="qp-input" maxLength={500} value={returnRefundNote} onChange={(event) => setReturnRefundNote(event.target.value)} placeholder="Ixtiyoriy"/></Field></div>
          {returnRefundSettlement.creditOffset > 0 ? <div className="qp-inline-alert"><strong>{formatMoney(returnRefundSettlement.creditOffset)} qarzdorlikdan kamayadi.</strong>{returnRefundSettlement.payoutAmount > 0 ? ` ${formatMoney(returnRefundSettlement.payoutAmount)} real pul sifatida qaytariladi.` : " Real pul chiqimi bo‘lmaydi."}</div> : null}
          {selectedReturnRefundOption?.method === "CASH" && returnRefundSettlement.payoutAmount > 0 ? <div className={`qp-inline-alert ${currentShift ? "" : "warning"}`}><strong>{currentShift ? `Ochiq smena: ${formatMoney(currentShift.expectedCash)}` : "Ochiq kassa smenasi topilmadi"}</strong></div> : null}
          <div className="qp-form-actions"><SecondaryButton type="button" disabled={returnBusy} onClick={() => setReturnRefundRow(null)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit" disabled={returnBusy}>{returnBusy ? <><LoaderCircle className="qp-spin" size={15}/> Bajarilmoqda...</> : <><WalletCards size={15}/> {returnRefundSettlement.payoutAmount > 0 ? `${formatMoney(returnRefundSettlement.payoutAmount)} qaytarish` : "Qarzni kamaytirish"}</>}</PrimaryButton></div>
        </form>
      </Modal>
      <CameraScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={addScannedValue} title="Kassada skanerlash" />
      <Modal open={Boolean(selector)} title={selector?.name || "Variantni tanlang"} description="Faqat zarur variant, qadoq va serialni tanlang." onClose={() => setSelector(null)}>
        {selector ? <div className="qp-pos-selector">{selector.variants?.length ? <Field label="Variant"><div className="qp-selector-options">{selector.variants.filter((item)=>item.status==='ACTIVE').map((item)=><button type="button" key={item.id} className={selectedVariantId===item.id?'active':''} onClick={()=>setSelectedVariantId(item.id)}>{item.name}<small>{Object.values(item.attributes || {}).join(' · ')}</small></button>)}</div></Field> : null}
          {selector.packages?.length ? <Field label="Sotuv birligi"><div className="qp-selector-options"><button type="button" className={!selectedPackageId?'active':''} onClick={()=>setSelectedPackageId('')}>Dona / base</button>{selector.packages.filter((item)=>item.status==='ACTIVE' && (!item.variantId || item.variantId===selectedVariantId)).map((item)=><button type="button" key={item.id} className={selectedPackageId===item.id?'active':''} onClick={()=>setSelectedPackageId(item.id)}><Package size={14}/>{item.name}<small>1 = {Number(item.conversionToBase)} base</small></button>)}</div></Field> : null}
          {selector.trackSerial ? <Field label="Serial / IMEI"><div className="qp-selector-serials">{(selector.serials || []).filter((item)=>item.status==='AVAILABLE' && (item.variantId || '') === (selectedVariantId || '') && !cart.some((line)=>(line.serialIds || []).includes(item.id))).map((item)=><label key={item.id}><input type="checkbox" checked={selectedSerialIds.includes(item.id)} onChange={()=>setSelectedSerialIds((current)=>current.includes(item.id)?current.filter((id)=>id!==item.id):[...current,item.id])}/><span>{item.imei || item.serial}</span></label>)}</div></Field> : null}
          <div className="qp-form-actions"><SecondaryButton onClick={()=>setSelector(null)}>Bekor qilish</SecondaryButton><PrimaryButton disabled={Boolean(selector.variants?.length && !selectedVariantId) || Boolean(selector.trackSerial && selectedSerialIds.length !== Number(selector.packages?.find((item)=>item.id===selectedPackageId)?.conversionToBase || 1))} onClick={()=>commitProduct(selector, selector.variants?.find((item)=>item.id===selectedVariantId), selector.packages?.find((item)=>item.id===selectedPackageId), selectedSerialIds)}><Check size={15}/> Savatga qo‘shish</PrimaryButton></div></div> : null}
      </Modal>
      <Modal open={customerOpen} title="Yangi mijoz" description="Mijoz darhol canonical bazaga yoziladi." onClose={()=>setCustomerOpen(false)}><form className="qp-form-stack" onSubmit={createCustomer}><Field label="Mijoz nomi"><input className="qp-input" value={customerForm.name} onChange={(event)=>setCustomerForm((current)=>({...current,name:event.target.value}))} required/></Field><Field label="Telefon"><input className="qp-input" value={customerForm.phone} onChange={(event)=>setCustomerForm((current)=>({...current,phone:event.target.value}))}/></Field><Field label="Kredit limiti"><input className="qp-input" type="number" min="0" value={customerForm.creditLimit} onChange={(event)=>setCustomerForm((current)=>({...current,creditLimit:event.target.value}))}/></Field><div className="qp-form-actions"><SecondaryButton type="button" onClick={()=>setCustomerOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Mijozni saqlash</PrimaryButton></div></form></Modal>
      <Modal open={Boolean(receiptPreview)} title="Savdo muvaffaqiyatli yakunlandi" description={receiptPreview?.sale?.number || "Chek tayyor"} onClose={()=>setReceiptPreview(null)}><div className="qp-receipt-preview"><Check size={30}/><strong>{formatMoney(receiptPreview?.sale?.total ?? receiptPreview?.cart?.reduce((sum,item)=>sum+item.price*item.quantity,0) ?? 0)}</strong><span>{receiptPreview?.customerName}</span><div className="qp-form-actions"><SecondaryButton onClick={()=>setReceiptPreview(null)}>Keyingi savdo</SecondaryButton><PrimaryButton onClick={()=>printPosReceipt(receiptPreview)}>Chekni chop etish</PrimaryButton></div></div></Modal>
      <Modal
        open={categoryOpen}
        title="Yangi kategoriya"
        description="Kategoriya yarating va unga kerakli mahsulotlarni biriktiring."
        onClose={() => setCategoryOpen(false)}
        wide
      >
        <form className="qp-form-stack" onSubmit={createCategory}>
          <Field label="Kategoriya nomi">
            <input className="qp-input" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Masalan: Ichimliklar" autoFocus />
          </Field>
          <div className="qp-pos-category-products">
            <div className="qp-pos-category-products-head">
              <div><strong>Mahsulotlarni tanlang</strong><span>Tanlangan mahsulotlar yangi kategoriyaga o‘tkaziladi.</span></div>
              <b>{categoryProductIds.length} ta tanlandi</b>
            </div>
            <div className="qp-pos-category-product-list">
              {db.products.filter((product) => product.status === "ACTIVE").map((product) => {
                const selected = categoryProductIds.includes(product.id);
                const currentCategory = db.categories.find((category) => category.id === product.categoryId);
                return <label className={selected ? "active" : ""} key={product.id}>
                  <input type="checkbox" checked={selected} onChange={() => toggleCategoryProduct(product.id)} />
                  {product.image ? <img src={product.image} alt="" /> : <i aria-hidden="true">{product.name.slice(0, 1).toUpperCase()}</i>}
                  <span><strong>{product.name}</strong><small>{formatMoney(priceFor(product))}{currentCategory ? ` · ${currentCategory.name}` : ""}</small></span>
                </label>;
              })}
            </div>
          </div>
          <div className="qp-form-actions">
            <SecondaryButton type="button" onClick={() => setCategoryOpen(false)}>Bekor qilish</SecondaryButton>
            <PrimaryButton type="submit">Kategoriyani saqlash</PrimaryButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default PosPage;
