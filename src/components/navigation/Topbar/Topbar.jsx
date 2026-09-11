import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  CircleHelp,
  Keyboard,
  Languages,
  LogOut,
  Maximize2,
  Menu,
  MoreHorizontal,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { findNavigationPage, findNavigationSection, flatNavigation } from "../../../app/navigationConfig";
import { PERMISSIONS } from "../../../constants/permissions";
import { useAuth } from "../../../hooks/useAuth";
import { useModuleAccess } from "../../../hooks/useModuleAccess";
import { usePermissions } from "../../../hooks/usePermissions";
import { getLanguageLabel } from "../../../i18n";
import { refreshCurrencyRates } from "../../../services/currencyService";
import { updateLocalDb, useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatExchangeRateValue } from "../../../utils/formatters";
import { getProductBarcodes } from "../../../utils/productCodes";
import { openPosWorkspace } from "../../../utils/pwa";
import styles from "./Topbar.module.scss";

const quickCreateActions = [
  { label: "Yangi buyurtma", to: "/orders/new", module: "sales", permission: PERMISSIONS.ORDERS_CREATE },
  { label: "Tezkor kassa", to: "/sales/pos", module: "pos", permission: PERMISSIONS.ORDERS_CREATE },
  { label: "Yangi mahsulot", to: "/products?create=1", module: "catalog", permission: PERMISSIONS.PRODUCTS_MANAGE },
  { label: "Yangi mijoz", to: "/customers?create=1", module: "partners", permission: PERMISSIONS.CUSTOMERS_MANAGE },
  { label: "Mahsulot kirimi", to: "/inventory/receipts", module: "inventory", permission: PERMISSIONS.INVENTORY_RECEIVE },
  { label: "To‘lov qabul qilish", to: "/payments", module: "finance", permission: PERMISSIONS.PAYMENTS_COLLECT },
  { label: "Marshrut rejasi", to: "/routes/plans", module: "routes", permission: PERMISSIONS.ORDERS_VIEW },
];

const shortcutGroups = [
  {
    label: "Navigatsiya",
    items: [
      { label: "Umumiy qidiruv", keys: "Ctrl K", action: "search" },
      { label: "Bosh sahifa", keys: "Alt H", to: "/dashboard", module: "dashboard", permission: PERMISSIONS.DASHBOARD_VIEW },
      { label: "Bildirishnomalar", keys: "Alt N", to: "/notifications", module: "settings" },
      { label: "Sozlamalar", keys: "Alt S", to: "/settings/general", module: "settings", permission: PERMISSIONS.SETTINGS_MANAGE },
    ],
  },
  {
    label: "Savdo",
    items: [
      { label: "Yangi buyurtma", keys: "Alt B", to: "/orders/new", module: "sales", permission: PERMISSIONS.ORDERS_CREATE },
      { label: "Tezkor kassa", keys: "Alt P", to: "/sales/pos", module: "pos", permission: PERMISSIONS.ORDERS_CREATE },
      { label: "Yangi mijoz", keys: "Alt C", to: "/customers?create=1", module: "partners", permission: PERMISSIONS.CUSTOMERS_MANAGE },
      { label: "Yangi mahsulot", keys: "Alt M", to: "/products?create=1", module: "catalog", permission: PERMISSIONS.PRODUCTS_MANAGE },
    ],
  },
  {
    label: "Ombor va operatsiyalar",
    items: [
      { label: "Mahsulot kirimi", keys: "Alt R", to: "/inventory/receipts", module: "inventory", permission: PERMISSIONS.INVENTORY_RECEIVE },
      { label: "Omborlararo ko‘chirish", keys: "Alt T", to: "/inventory/transfers", module: "inventory", permission: PERMISSIONS.INVENTORY_TRANSFER },
      { label: "Inventarizatsiya", keys: "Alt I", to: "/inventory/counts", module: "inventory", permission: PERMISSIONS.INVENTORY_VIEW },
      { label: "Yangi reys", keys: "Alt D", to: "/deliveries/planning", module: "delivery", permission: PERMISSIONS.DELIVERY_PLAN },
      { label: "Tashriflar", keys: "Alt V", to: "/visits", module: "agents", permission: PERMISSIONS.ORDERS_VIEW },
      { label: "To‘lov qabul qilish", keys: "Alt F", to: "/payments", module: "finance", permission: PERMISSIONS.PAYMENTS_COLLECT },
      { label: "Xodim qo‘shish", keys: "Alt E", to: "/users", module: "settings", permission: PERMISSIONS.USERS_MANAGE },
    ],
  },
];

const languageOptions = ["uz", "ru", "tg", "kk"];

function notificationModule(item) {
  const type = String(item?.referenceType || item?.type || "").toUpperCase();
  if (type.includes("DELIVERY") || type.includes("TRIP")) return "delivery";
  if (type.includes("PICK") || type.includes("PACK") || type.includes("FULFILL")) return "fulfillment";
  if (type.includes("PAYMENT") || type.includes("INVOICE") || type.includes("DEBT")) return "finance";
  if (type.includes("ORDER")) return "sales";
  if (type.includes("VISIT") || type.includes("AGENT")) return "agents";
  return "";
}

function isTypingTarget(target) {
  const tag = target?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
}

function Topbar({ onOpenMenu }) {
  const db = useLocalDb();
  const { user, company, logout } = useAuth();
  const { isEnabled } = useModuleAccess();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const [searchValue, setSearchValue] = useState("");
  const [openMenu, setOpenMenu] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const currentSection = findNavigationSection(location.pathname);
  const currentPage = findNavigationPage(location.pathname);
  const pages = useMemo(
    () => flatNavigation().filter((item) => isEnabled(item.key) && (item.to !== "/sales/pos" || isEnabled("pos"))),
    [isEnabled],
  );

  const theme = db.settings.appearance?.themeMode || "light";
  const language = db.settings.locale?.language || "uz";

  const availableShortcutGroups = useMemo(() => shortcutGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => (!item.module || isEnabled(item.module)) && (!item.permission || can(item.permission))),
  })).filter((group) => group.items.length), [can, isEnabled]);

  useEffect(() => {
    const close = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpenMenu("");
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    const shortcutMap = new Map();
    availableShortcutGroups.forEach((group) => group.items.forEach((item) => {
      if (item.keys?.startsWith("Alt ")) shortcutMap.set(item.keys.slice(4).toLowerCase(), item);
    }));
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key === "Escape") {
        setSearchValue("");
        setOpenMenu("");
        return;
      }
      if (!event.altKey || isTypingTarget(event.target)) return;
      const shortcut = shortcutMap.get(event.key.toLowerCase());
      if (!shortcut?.to) return;
      event.preventDefault();
      navigate(shortcut.to);
      setOpenMenu("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [availableShortcutGroups, navigate]);

  const results = useMemo(() => {
    const q = searchValue.trim().toLocaleLowerCase("uz-UZ");
    if (q.length < 2) return [];
    const matches = (value) => String(value || "").toLocaleLowerCase("uz-UZ").includes(q);
    const nav = pages
      .filter((item) => matches(`${item.group} ${item.label} ${item.description || ""}`))
      .slice(0, 4)
      .map((item) => ({ type: "Sahifa", title: item.label, subtitle: item.group, to: item.to }));
    const products = isEnabled("catalog") && can(PERMISSIONS.PRODUCTS_VIEW)
      ? (db.products || []).filter((item) => matches(`${item.name} ${item.sku} ${getProductBarcodes(item).join(" ")}`)).slice(0, 3).map((item) => ({ type: "Mahsulot", title: item.name, subtitle: `SKU ${item.sku}`, to: "/products" }))
      : [];
    const customers = isEnabled("partners") && can(PERMISSIONS.CUSTOMERS_VIEW)
      ? (db.customers || []).filter((item) => matches(`${item.name} ${item.phone || ""} ${item.address || ""}`)).slice(0, 3).map((item) => ({ type: "Mijoz", title: item.name, subtitle: item.phone || item.address, to: "/customers" }))
      : [];
    const orders = isEnabled("sales") && can(PERMISSIONS.ORDERS_VIEW)
      ? (db.orders || []).filter((item) => matches(`${item.number} ${(db.customers || []).find((customer) => customer.id === item.customerId)?.name || ""}`)).slice(0, 3).map((item) => ({ type: "Buyurtma", title: item.number, subtitle: (db.customers || []).find((customer) => customer.id === item.customerId)?.name || "", to: "/orders" }))
      : [];
    const employees = can(PERMISSIONS.USERS_VIEW)
      ? (db.users || []).filter((item) => matches(`${item.name} ${item.phone || ""} ${item.title || ""}`)).slice(0, 3).map((item) => ({ type: "Xodim", title: item.name, subtitle: item.title || item.phone || "", to: `/users/${item.id}` }))
      : [];
    const invoices = isEnabled("finance") && can(PERMISSIONS.FINANCE_VIEW)
      ? (db.invoices || []).filter((item) => matches(`${item.number} ${(db.customers || []).find((customer) => customer.id === item.customerId)?.name || ""}`)).slice(0, 2).map((item) => ({ type: "Hisob-faktura", title: item.number, subtitle: (db.customers || []).find((customer) => customer.id === item.customerId)?.name || "", to: "/invoices" }))
      : [];
    const trips = isEnabled("delivery") && can(PERMISSIONS.DELIVERY_VIEW)
      ? (db.deliveryTrips || []).filter((item) => matches(`${item.number} ${item.driver || ""} ${item.vehicle || ""}`)).slice(0, 2).map((item) => ({ type: "Reys", title: item.number, subtitle: item.driver || item.vehicle || "", to: "/delivery-trips" }))
      : [];
    return [...nav, ...products, ...customers, ...orders, ...employees, ...invoices, ...trips].slice(0, 12);
  }, [can, db.customers, db.deliveryTrips, db.invoices, db.orders, db.products, db.users, isEnabled, pages, searchValue]);

  const notificationCount = useMemo(() => {
    let count = 0;
    if (isEnabled("inventory") && db.settings.notifications?.lowStock !== false && db.settings.inventory?.lowStockAlerts !== false) {
      count += (db.balances || []).filter((balance) => {
        const product = (db.products || []).find((item) => item.id === balance.productId);
        return product && Number(balance.onHand || 0) - Number(balance.reserved || 0) <= Number(product.minStock || 0);
      }).length;
    }
    if (isEnabled("delivery") && db.settings.notifications?.failedDelivery !== false) count += (db.deliveries || []).filter((item) => item.status === "FAILED").length;
    count += (db.workflowNotifications || []).filter((item) => {
      if (item.read) return false;
      if (item.userId && item.userId !== user?.id) return false;
      const moduleKey = notificationModule(item);
      return !moduleKey || isEnabled(moduleKey);
    }).length;
    return count;
  }, [db.balances, db.deliveries, db.products, db.settings.inventory?.lowStockAlerts, db.settings.notifications?.failedDelivery, db.settings.notifications?.lowStock, db.workflowNotifications, isEnabled, user?.id]);

  const go = (to) => {
    if (to === "/sales/pos") openPosWorkspace(navigate);
    else navigate(to);
    setSearchValue("");
    setOpenMenu("");
  };

  const helpArticleBySection = { sales: "first-order", inventory: "reserved-stock", fulfillment: "fulfillment", delivery: "delivery-flow", finance: "debt", reports: "reports", settings: "modules", agents: "maps" };
  const contextualHelpPath = `/help/${helpArticleBySection[currentSection?.key] || "first-setup"}`;

  const refreshRates = async () => {
    if (refreshing) return;
    setRefreshing(true);
    const result = await refreshCurrencyRates();
    notify(result.ok ? "Valyuta kurslari yangilandi" : "Jonli kurs olinmadi. Oxirgi saqlangan kurs ishlatilmoqda", result.ok ? "success" : "warning");
    setRefreshing(false);
  };

  const toggleTheme = () => updateLocalDb((draft) => {
    draft.settings.appearance.themeMode = theme === "dark" ? "light" : "dark";
  });

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      notify("To‘liq ekran rejimini ochib bo‘lmadi", "warning");
    }
  };

  const rates = db.currencyRates?.rates || {};
  const availableCreateActions = quickCreateActions.filter((item) => isEnabled(item.module) && can(item.permission));

  return (
    <header ref={rootRef} className={styles.topbar}>
      <div className={styles.contextZone}>
        <button type="button" className={styles.mobileMenuButton} onClick={onOpenMenu} aria-label="Menyuni ochish"><Menu size={20} /></button>
        <div className={styles.pageContext}><strong>{currentSection?.label || "Qulay"}</strong><span>{currentPage?.label || "Boshqaruv markazi"}</span></div>
      </div>

      <div className={styles.searchZone}>
        <Search size={18} />
        <input ref={searchRef} type="search" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Sahifa, mahsulot, mijoz, buyurtma, xodim yoki reys qidiring..." />
        {searchValue ? <button type="button" onClick={() => setSearchValue("")}><X size={15} /></button> : <kbd>Ctrl K</kbd>}
        {searchValue ? <div className={styles.searchResults}>{results.length ? results.map((result, index) => <button type="button" key={`${result.type}-${result.title}-${index}`} onClick={() => go(result.to)}><span>{result.type}</span><div><strong>{result.title}</strong><small>{result.subtitle}</small></div></button>) : <div>Natija topilmadi</div>}</div> : null}
      </div>

      <div className={styles.actionZone}>
        <div className={styles.menuWrap}>
          <button type="button" className={styles.createButton} onClick={() => setOpenMenu(openMenu === "create" ? "" : "create")}><Plus size={16} /><span>Yangi</span><ChevronDown size={14} /></button>
          {openMenu === "create" ? <div className={`${styles.popover} ${styles.createMenu}`}><div className={styles.menuTitle}>Tezkor yaratish</div>{availableCreateActions.map((item) => <button key={item.to} type="button" onClick={() => go(item.to)}>{item.label}</button>)}</div> : null}
        </div>

        <div className={styles.menuWrap}>
          <button type="button" className={styles.currencyWidget} onClick={() => setOpenMenu(openMenu === "currency" ? "" : "currency")}>
            <div><b>USD</b><strong>{formatExchangeRateValue(rates.USD)} <span className={styles.currencyUnit}>so‘m</span></strong></div><i />
            <div><b>EUR</b><strong>{formatExchangeRateValue(rates.EUR)} <span className={styles.currencyUnit}>so‘m</span></strong></div>
          </button>
          {openMenu === "currency" ? <div className={`${styles.popover} ${styles.currencyMenu}`}><div className={styles.currencyHead}><div><strong>Valyuta kurslari</strong><span>{db.currencyRates?.source || "Google Finance"}</span></div><button type="button" onClick={refreshRates}><RefreshCw size={15} className={refreshing ? styles.spin : ""} /></button></div>{["UZS", "USD", "EUR", "RUB", "GBP", "CNY", "AED"].map((code) => <button key={code} type="button" className={styles.rateRow} onClick={() => { updateLocalDb((draft) => { draft.settings.company.currency = code; }); setOpenMenu(""); }}><span><b>{code}</b><small>{code === "UZS" ? "O‘zbekiston so‘mi" : `1 ${code}`}</small></span><strong>{code === "UZS" ? "1 so‘m" : `${formatExchangeRateValue(rates[code])} so‘m`}</strong>{db.settings.company.currency === code ? <Check size={15} /> : null}</button>)}</div> : null}
        </div>

        <div className={styles.utilityGroup}>
          <button type="button" onClick={toggleTheme} aria-label="Ko‘rinish rejimi">{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>
          <div className={styles.menuWrap}><button type="button" onClick={() => setOpenMenu(openMenu === "language" ? "" : "language")} aria-label="Til"><Languages size={17} /><span>{language.toUpperCase()}</span></button>{openMenu === "language" ? <div className={`${styles.popover} ${styles.smallMenu}`}>{languageOptions.map((code) => <button type="button" key={code} onClick={() => { updateLocalDb((draft) => { draft.settings.locale.language = code; draft.settings.company.language = code; }); setOpenMenu(""); }}><span>{getLanguageLabel(code, language)}</span>{language === code ? <Check size={14} /> : null}</button>)}</div> : null}</div>
          <button type="button" onClick={toggleFullscreen} aria-label="To‘liq ekran"><Maximize2 size={17} /></button>
          <button type="button" onClick={() => go(contextualHelpPath)} aria-label="Ushbu sahifa haqida"><CircleHelp size={17} /></button>
          <button type="button" onClick={() => setOpenMenu(openMenu === "shortcuts" ? "" : "shortcuts")} aria-label="Klaviatura buyruqlari"><Keyboard size={17} /></button>
        </div>

        <button type="button" className={styles.notificationButton} onClick={() => go("/notifications")}><Bell size={18} />{notificationCount ? <span>{Math.min(notificationCount, 99)}</span> : null}</button>

        <div className={styles.menuWrap}>
          <button type="button" className={styles.companyButton} onClick={() => setOpenMenu(openMenu === "company" ? "" : "company")}>{db.settings.company.logo ? <img className={styles.companyLogo} src={db.settings.company.logo} alt="" /> : <Building2 size={17} />}<span><b>{company?.name || db.settings.company.name}</b><small>{db.settings.company.branch || "Bosh filial"}</small></span><ChevronDown size={14} /></button>
          {openMenu === "company" ? <div className={`${styles.popover} ${styles.companyMenu}`}><div><strong>{company?.name || db.settings.company.name}</strong><span>{db.settings.company.branch || "Bosh filial"}</span></div><button type="button" onClick={() => go("/settings/general")}>Kompaniya sozlamalari</button></div> : null}
        </div>

        <div className={styles.menuWrap}>
          <button type="button" className={styles.profileButton} onClick={() => setOpenMenu(openMenu === "profile" ? "" : "profile")}><span className={styles.avatar}><UserRound size={17} /></span><span className={styles.profileCopy}><strong>{user?.name || "Foydalanuvchi"}</strong><small>{user?.title || "Qulay"}</small></span><ChevronDown size={14} /></button>
          {openMenu === "profile" ? <div className={`${styles.popover} ${styles.profileMenu}`}><div className={styles.profileCard}><span className={styles.avatar}><UserRound size={17} /></span><div><strong>{user?.name}</strong><small>{user?.phone}</small></div></div><button type="button" onClick={() => go("/change-password")}>Parolni o‘zgartirish</button><button type="button" onClick={() => go("/settings/appearance")}>Mening sozlamalarim</button><button type="button" onClick={() => { logout(); navigate("/login", { replace: true }); }}><LogOut size={15} /> Chiqish</button></div> : null}
        </div>

        <div className={`${styles.menuWrap} ${styles.mobileGlobalMenuWrap}`}>
          <button type="button" className={styles.mobileMoreButton} onClick={() => setOpenMenu(openMenu === "mobile-global" ? "" : "mobile-global")} aria-label="Global amallar"><MoreHorizontal size={20} /></button>
          {openMenu === "mobile-global" ? <div className={`${styles.popover} ${styles.mobileGlobalMenu}`}>
            <div className={styles.mobileRates}><span>USD <strong>{formatExchangeRateValue(rates.USD)}</strong></span><span>EUR <strong>{formatExchangeRateValue(rates.EUR)}</strong></span></div>
            <button type="button" onClick={refreshRates}><RefreshCw size={16} /> Valyuta kurslarini yangilash</button>
            <button type="button" onClick={toggleTheme}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />} {theme === "dark" ? "Light rejim" : "Dark rejim"}</button>
            <button type="button" onClick={() => { const next = languageOptions[(languageOptions.indexOf(language) + 1) % languageOptions.length]; updateLocalDb((draft) => { draft.settings.locale.language = next; draft.settings.company.language = next; }); }}><Languages size={16} /> Til: {language.toUpperCase()}</button>
            <button type="button" onClick={toggleFullscreen}><Maximize2 size={16} /> To‘liq ekran</button>
            <button type="button" onClick={() => go(contextualHelpPath)}><CircleHelp size={16} /> Yordam</button>
            <button type="button" onClick={() => setOpenMenu("shortcuts")}><Keyboard size={16} /> Klaviatura buyruqlari</button>
            <button type="button" onClick={() => go("/notifications")}><Bell size={16} /> Bildirishnomalar {notificationCount ? `(${Math.min(notificationCount, 99)})` : ""}</button>
            <button type="button" onClick={() => go("/settings/general")}><Building2 size={16} /> {company?.name || db.settings.company.name}</button>
            <button type="button" onClick={() => go("/settings/appearance")}><UserRound size={16} /> {user?.name || "Profil"}</button>
            <button type="button" onClick={() => { logout(); navigate("/login", { replace: true }); }}><LogOut size={16} /> Chiqish</button>
          </div> : null}
        </div>

        {openMenu === "shortcuts" ? <div className={`${styles.popover} ${styles.shortcutMenu}`}>{availableShortcutGroups.map((group) => <section key={group.label}><strong>{group.label}</strong>{group.items.map((item) => <button type="button" key={`${group.label}-${item.label}`} onClick={() => { if (item.action === "search") searchRef.current?.focus(); else if (item.to) go(item.to); setOpenMenu(""); }}><span>{item.label}</span><kbd>{item.keys}</kbd></button>)}</section>)}</div> : null}
      </div>
    </header>
  );
}

export default Topbar;
