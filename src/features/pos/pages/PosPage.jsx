import { Archive, Camera, Clock3, Expand, LayoutGrid, List, LogOut, Minus, Plus, ScanBarcode, ShoppingCart, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import CameraScannerModal from "../../../components/mobile/CameraScannerModal";
import MobilePinGate from "../../../components/mobile/MobilePinGate";
import { Field, Modal, PrimaryButton, SecondaryButton } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { useAuth } from "../../../hooks/useAuth";
import { makeId, updateLocalDb, useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { completePosSale } from "../../../services/prototypeActions";
import { formatDateTime, formatMoney, getName } from "../../../utils/formatters";
import { findProductByScan, getProductBarcodes } from "../../../utils/productCodes";

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

  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const receiptHeightMm = Math.max(94, 78 + cart.length * 13 + (paymentMethod === "CASH" ? 18 : 9));
  const rows = cart.map((item) => `
    <div class="item">
      <div class="item-name">${escapeHtml(item.name)}</div>
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
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [showHeld, setShowHeld] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mobileView, setMobileView] = useState("products");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryProductIds, setCategoryProductIds] = useState([]);
  const [now, setNow] = useState(new Date());

  const activeWarehouses = useMemo(() => (db.warehouses || []).filter((warehouse) => warehouse.status === "ACTIVE"), [db.warehouses]);
  const configuredWarehouse = activeWarehouses.find((warehouse) => warehouse.id === db.settings?.pos?.warehouseId);
  const defaultWarehouse = activeWarehouses.find((warehouse) => warehouse.id === db.settings?.company?.defaultWarehouseId);
  const warehouseId = configuredWarehouse?.id || defaultWarehouse?.id || activeWarehouses[0]?.id || "";
  const priceListId = db.settings.pos.priceListId || "pl-retail";
  const productView = db.settings.pos.productView === "list" ? "list" : "card";

  useEffect(() => {
    if (!warehouseId || db.settings?.pos?.warehouseId === warehouseId) return;
    updateLocalDb((draft) => { draft.settings.pos.warehouseId = warehouseId; });
  }, [db.settings?.pos?.warehouseId, warehouseId]);

  const priceFor = (product) => ["pl-wholesale", "pl-vip"].includes(priceListId)
    ? Number(product.wholesalePrice || product.price || 0)
    : Number(product.price || 0);

  const availableFor = (productId) => {
    if (!warehouseId) return 0;
    const balance = db.balances.find((item) => item.productId === productId && item.warehouseId === warehouseId);
    return balance ? Math.max(0, Number(balance.onHand || 0) - Number(balance.reserved || 0)) : 0;
  };

  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    return db.products.filter((product) => {
      const matchesCategory = categoryId === "ALL" || product.categoryId === categoryId;
      const matchesSearch = !query || `${product.name} ${product.sku} ${getProductBarcodes(product).join(" ")}`.toLowerCase().includes(query);
      return product.status === "ACTIVE" && matchesCategory && matchesSearch;
    });
  }, [categoryId, db.products, search]);

  const addProduct = (product) => {
    const available = availableFor(product.id);
    const currentQuantity = cart.find((item) => item.productId === product.id)?.quantity || 0;
    if (!db.settings.inventory.allowNegativeStock && currentQuantity + 1 > available) {
      notify(`${product.name} uchun mavjud qoldiq yetarli emas`, "warning");
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) return current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { productId: product.id, name: product.name, sku: product.sku, quantity: 1, price: priceFor(product) }];
    });
    searchRef.current?.focus();
  };

  const updateQuantity = (productId, delta) => {
    const product = db.products.find((item) => item.id === productId);
    setCart((current) => current.map((item) => {
      if (item.productId !== productId) return item;
      const next = Math.max(1, item.quantity + delta);
      if (!db.settings.inventory.allowNegativeStock && next > availableFor(productId)) {
        notify(`${product?.name || "Mahsulot"} uchun qoldiq yetarli emas`, "warning");
        return item;
      }
      return { ...item, quantity: next };
    }));
  };

  const removeLine = (productId) => setCart((current) => current.filter((item) => item.productId !== productId));

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

  const createCategory = (event) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) { notify("Kategoriya nomini kiriting", "warning"); return; }
    if (db.categories.some((item) => item.name.trim().toLocaleLowerCase("uz-UZ") === name.toLocaleLowerCase("uz-UZ"))) {
      notify("Bu nomdagi kategoriya allaqachon mavjud", "warning");
      return;
    }
    const categoryIdToCreate = makeId("cat");
    const selectedIds = new Set(categoryProductIds);
    updateLocalDb((draft) => {
      draft.categories = [{ id: categoryIdToCreate, name, status: "ACTIVE" }, ...draft.categories];
      draft.products = draft.products.map((product) => selectedIds.has(product.id) ? { ...product, categoryId: categoryIdToCreate } : product);
    });
    setCategoryId(categoryIdToCreate);
    setCategoryOpen(false);
    notify(`${name} kategoriyasi yaratildi`);
  };

  const changeProductView = (view) => updateLocalDb((draft) => {
    draft.settings.pos.productView = view;
  });
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const received = Number(cashReceived) || 0;
  const change = paymentMethod === "CASH" ? Math.max(0, received - total) : 0;
  const selectedCustomer = db.customers.find((customer) => customer.id === customerId);

  const quickCashValues = useMemo(() => {
    if (!total) return [];
    const standard = [20000, 50000, 100000, 200000, 500000];
    return Array.from(new Set([total, ...standard.filter((value) => value >= total)])).slice(0, 4);
  }, [total]);

  const checkout = () => {
    if (!warehouseId) {
      notify("Kassa uchun faol ombor topilmadi", "warning");
      return;
    }
    if (!customerId && db.settings.pos.allowAnonymousCustomer === false) {
      notify("Bu kassada mijoz tanlash majburiy", "warning");
      return;
    }
    if (paymentMethod === "CASH" && cashReceived && received < total) {
      notify("Qabul qilingan naqd summa jami summadan kam", "warning");
      return;
    }

    const cartSnapshot = cart.map((item) => ({ ...item }));
    const result = completePosSale({ cart: cartSnapshot, customerId, warehouseId, paymentMethod });
    notify(result.message, result.ok ? "success" : "danger");

    if (result.ok && db.settings.pos.printReceipt === true) {
      const warehouse = db.warehouses.find((item) => item.id === warehouseId);
      printPosReceipt({
        sale: result.sale,
        cart: cartSnapshot,
        companyName: db.settings.company.name || "Qulay",
        branchName: db.settings.company.branch || "",
        warehouseName: warehouse?.name || "",
        cashierName: user?.name || "Kassir",
        customerName: selectedCustomer?.name || "Anonim mijoz",
        paymentMethod,
        paymentMethodName: (db.paymentMethods || []).find((item) => item.code === paymentMethod)?.name,
        received: paymentMethod === "CASH" ? (received || total) : total,
        change,
      });
    }

    if (result.ok && db.settings.pos.clearCartAfterSale !== false) {
      setCart([]);
      setCustomerId("");
      setSearch("");
      setCashReceived("");
      setMobileView("products");
      searchRef.current?.focus();
    }
  };

  const holdCart = () => {
    if (!cart.length || db.settings.pos.allowHeldCarts === false) return;
    updateLocalDb((draft) => { draft.heldCarts.unshift({ id: makeId("cart"), createdAt: new Date().toISOString(), customerId, warehouseId, paymentMethod, cart }); });
    setCart([]);
    setCustomerId("");
    setCashReceived("");
    notify("Savat vaqtincha saqlandi");
  };

  const restoreCart = (held) => {
    setCart(held.cart || []);
    setCustomerId(held.customerId || "");
    setPaymentMethod(held.paymentMethod || "CASH");
    updateLocalDb((draft) => { draft.heldCarts = draft.heldCarts.filter((item) => item.id !== held.id); });
    setShowHeld(false);
    notify("Saqlangan savat tiklandi");
  };

  const addScannedValue = (rawValue) => {
    const product = findProductByScan(db.products, rawValue);
    if (!product) {
      setSearch(String(rawValue || "").trim());
      notify("Bu kod bo‘yicha mahsulot topilmadi", "warning");
      return;
    }
    addProduct(product);
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
    const exact = findProductByScan(db.products, search);
    if (exact && db.settings.pos.barcodeAutoAdd !== false) {
      event.preventDefault();
      addProduct(exact);
      setSearch("");
      return;
    }
    if (products.length === 1) {
      event.preventDefault();
      addProduct(products[0]);
      setSearch("");
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      notify("To‘liq ekran rejimi mavjud emas", "warning");
    }
  };

  return (
    <>
      <MobilePinGate />
      <div className="qp-pos-focus">
      <header className="qp-pos-focus-header">
        <div className="qp-pos-brand"><span>Q</span><div><strong>Kassa rejimi</strong><small>Tezkor savdo ish maydoni</small></div></div>
        <div className="qp-pos-context">
          <span><ScanBarcode size={15} /> {getName(db.warehouses, warehouseId) || "Ombor tanlanmagan"}</span>
          <span><Clock3 size={15} /> {now.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</span>
          <span>{user?.name || "Kassir"}</span>
        </div>
        <div className="qp-inline-actions">
          {db.settings.mobile?.cameraScanner !== false ? <button type="button" className="qp-icon-button qp-pos-camera-button" title="Kamera bilan skanerlash" onClick={() => setScannerOpen(true)}><Camera size={17} /></button> : null}
          <button type="button" className="qp-icon-button" title="To‘liq ekran" onClick={toggleFullscreen}><Expand size={17} /></button>
          <button type="button" className="qp-button qp-button-secondary qp-pos-exit-button" aria-label="Kassadan chiqish" title="Kassadan chiqish" onClick={() => { if (window.opener) window.close(); else navigate("/orders"); }}><LogOut size={17} /><span>Kassadan chiqish</span></button>
        </div>
      </header>

      <div className="qp-pos-command-row">
        <div className="qp-pos-search-wrap qp-pos-search-primary">
          <ScanBarcode size={20} />
          <input ref={searchRef} className="qp-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Mahsulot qidiring yoki shtrix-kodni skaner qiling..." />
          {search ? <button type="button" onClick={() => setSearch("")} aria-label="Qidiruvni tozalash"><X size={15} /></button> : null}
          {db.settings.mobile?.cameraScanner !== false ? <button type="button" className="qp-pos-inline-camera" onClick={() => setScannerOpen(true)} aria-label="Kamera bilan skanerlash"><Camera size={16}/></button> : null}
          <kbd>F2</kbd>
        </div>
        <div className="qp-pos-shortcut-mini"><span><kbd>Enter</kbd> Qo‘shish</span><span><kbd>F4</kbd> Mijoz</span><span><kbd>F8</kbd> To‘lov</span></div>
      </div>

      <nav className="qp-pos-mobile-switch" aria-label="Kassa mobil bo‘limlari">
        <button type="button" className={mobileView === "products" ? "active" : ""} onClick={() => setMobileView("products")}><ScanBarcode size={18} /> Mahsulotlar</button>
        <button type="button" className={mobileView === "cart" ? "active" : ""} onClick={() => setMobileView("cart")}><ShoppingCart size={18} /> Savat <span>{cart.length}</span></button>
      </nav>

      <div className="qp-pos-focus-grid">
        <section className={`qp-pos-products-panel ${mobileView === "products" ? "is-mobile-active" : ""}`}>
          <div className="qp-pos-products-toolbar">
            <div className="qp-category-tabs qp-pos-category-tabs">
              <button type="button" className={categoryId === "ALL" ? "active" : ""} onClick={() => setCategoryId("ALL")}>Barchasi</button>
              {db.categories.filter((category) => category.status !== "INACTIVE").map((category) => <button key={category.id} type="button" className={categoryId === category.id ? "active" : ""} onClick={() => setCategoryId(category.id)}>{category.name}</button>)}
              <button type="button" className="qp-pos-new-category" onClick={openCategoryCreate}><Plus size={16}/> Yangi</button>
            </div>
            <div className="qp-pos-view-switch" role="group" aria-label="Mahsulot ko‘rinishi">
              <button type="button" className={productView === "card" ? "active" : ""} onClick={() => changeProductView("card")} title="Kartochka ko‘rinishi" aria-label="Kartochka ko‘rinishi"><LayoutGrid size={18}/></button>
              <button type="button" className={productView === "list" ? "active" : ""} onClick={() => changeProductView("list")} title="Ro‘yxat ko‘rinishi" aria-label="Ro‘yxat ko‘rinishi"><List size={18}/></button>
            </div>
          </div>

          <div className="qp-pos-product-scroll">
            <div className={`qp-product-grid qp-product-grid-focus ${productView === "list" ? "is-list-view" : "is-card-view"}`}>
              {products.map((product) => {
                const available = availableFor(product.id);
                return <button type="button" className={`qp-product-tile qp-product-tile-focus ${available <= 0 ? "out" : ""}`} key={product.id} onClick={() => addProduct(product)} disabled={available <= 0 && !db.settings.inventory.allowNegativeStock}>
                  {product.image ? <img className="qp-product-visual qp-product-visual-image" src={product.image} alt=""/> : <span className="qp-product-visual" aria-hidden="true">{product.name.slice(0, 1).toUpperCase()}</span>}
                  <div className="qp-product-tile-copy"><strong>{product.name}</strong><small>{product.sku}</small></div>
                  <div className="qp-product-tile-bottom"><b>{formatMoney(priceFor(product))}</b>{db.settings.pos.showStockBadge !== false ? <span className={available <= 0 ? "danger" : available <= Number(product.minStock || 0) ? "warning" : ""}>{available} sotish mumkin</span> : null}</div>
                </button>;
              })}
            </div>
            {!products.length ? <div className="qp-empty"><strong>Mahsulot topilmadi</strong><span>Qidiruvni yoki kategoriyani o‘zgartiring.</span></div> : null}
          </div>
        </section>

        <aside className={`qp-pos-checkout-panel ${mobileView === "cart" ? "is-mobile-active" : ""}`}>
          <div className="qp-pos-cart-head"><div><h2><ShoppingCart size={19} /> Savat</h2><p>{cart.length ? `${cart.length} tur · ${totalQuantity} dona · ${formatMoney(total)}` : "Sotuvni boshlash uchun mahsulot qo‘shing"}</p></div><div className="qp-inline-actions">{db.settings.pos.allowHeldCarts !== false ? <button type="button" className="qp-icon-button" title="Saqlangan savatlar" onClick={() => setShowHeld((value) => !value)}><Archive size={17} /><span className="qp-mini-count">{db.heldCarts.length}</span></button> : null}{cart.length ? <button type="button" className="qp-icon-button" title="Savatni tozalash" onClick={() => setCart([])}><Trash2 size={17} /></button> : null}</div></div>

          {showHeld ? <div className="qp-held-carts qp-held-carts-focus">{db.heldCarts.length ? db.heldCarts.map((held) => <button type="button" key={held.id} onClick={() => restoreCart(held)}><strong>{held.cart?.length || 0} tur · {formatMoney((held.cart || []).reduce((sum, item) => sum + item.price * item.quantity, 0))}</strong><span>{formatDateTime(held.createdAt)}</span></button>) : <div className="qp-muted">Saqlangan savat yo‘q</div>}</div> : null}

          <div className="qp-cart-lines qp-cart-lines-focus">
            {cart.length ? cart.map((line) => <div className="qp-cart-line qp-cart-line-focus" key={line.productId}><div className="qp-cart-line-top"><div><strong>{line.name}</strong><span>SKU {line.sku || "—"} · {formatMoney(line.price)}</span></div><button type="button" className="qp-icon-button" onClick={() => removeLine(line.productId)} aria-label="Mahsulotni savatdan o‘chirish"><Trash2 size={15} /></button></div><div className="qp-qty"><div className="qp-qty-controls"><button type="button" onClick={() => updateQuantity(line.productId, -1)}><Minus size={14} /></button><strong>{line.quantity}</strong><button type="button" onClick={() => updateQuantity(line.productId, 1)}><Plus size={14} /></button></div><strong>{formatMoney(line.quantity * line.price)}</strong></div></div>) : <div className="qp-pos-empty-cart"><ShoppingCart size={34} /><strong>Savat bo‘sh</strong><span>Mahsulotni bosing yoki shtrix-kodni skaner qiling</span></div>}
          </div>

          <div className="qp-pos-payment-area">
            <label className="qp-field"><span>Mijoz</span><Select data-pos-customer value={customerId} onChange={(event) => setCustomerId(event.target.value)}>{db.settings.pos.allowAnonymousCustomer !== false ? <option value="">Anonim mijoz</option> : <option value="">Mijozni tanlang</option>}{db.customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name}{Number(customer.debt || 0) > 0 ? ` · qarz ${formatMoney(customer.debt)}` : ""}</option>)}</Select></label>
            {selectedCustomer ? <div className="qp-pos-customer-meta"><span>Joriy qarz <strong>{formatMoney(selectedCustomer.debt || 0)}</strong></span><span>Kredit limiti <strong>{formatMoney(selectedCustomer.creditLimit || 0)}</strong></span></div> : null}

            <div className="qp-payment-methods qp-payment-methods-focus">{(db.paymentMethods || []).filter((item) => item.status === "ACTIVE").map((method) => <button type="button" key={method.id} title={method.shortcut || undefined} className={`qp-payment-method ${paymentMethod === method.code ? "active" : ""}`} onClick={() => setPaymentMethod(method.code)}>{method.name}</button>)}</div>

            {paymentMethod === "CASH" ? <div className="qp-pos-cash-section"><div className="qp-pos-cash-grid"><label className="qp-field"><span>Qabul qilindi</span><input className="qp-input" inputMode="numeric" value={cashReceived} onChange={(event) => setCashReceived(event.target.value.replace(/[^0-9.]/g, ""))} placeholder={String(total || 0)} /></label><div className="qp-pos-change"><span>Qaytim</span><strong>{formatMoney(change)}</strong></div></div>{quickCashValues.length ? <div className="qp-pos-quick-cash">{quickCashValues.map((value) => <button key={value} type="button" onClick={() => setCashReceived(String(value))}>{value === total ? "Aniq summa" : formatMoney(value)}</button>)}</div> : null}</div> : null}

            <div className="qp-pos-total-box"><div><span>Mahsulotlar</span><strong>{totalQuantity} dona</strong></div><div><span>Tur</span><strong>{cart.length}</strong></div><div className="primary"><span>Jami</span><strong>{formatMoney(total)}</strong></div></div>

            <div className="qp-pos-cart-actions">{db.settings.pos.allowHeldCarts !== false ? <SecondaryButton disabled={!cart.length} onClick={holdCart}><Archive size={15} /> Saqlab turish</SecondaryButton> : null}<PrimaryButton disabled={!cart.length || (!customerId && db.settings.pos.allowAnonymousCustomer === false)} onClick={checkout}>To‘lovni yakunlash <kbd>F8</kbd></PrimaryButton></div>
          </div>
        </aside>
      </div>

      <CameraScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={addScannedValue} title="Kassada skanerlash" />
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
      </div>
    </>
  );
}

export default PosPage;
