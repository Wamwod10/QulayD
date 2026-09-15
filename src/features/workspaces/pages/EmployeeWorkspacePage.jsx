import {
  Bell, Boxes, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardList, MapPin, PackageCheck,
  Route, ScanLine, ShoppingBag, Target, Truck, UserRound, Users, Warehouse,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { EMPLOYEE_WORKSPACES } from "../../../config/employeeWorkspaces";
import { getRouteModule, getRoutePermission } from "../../../app/navigationConfig";
import { useAuth } from "../../../hooks/useAuth";
import { useModuleAccess } from "../../../hooks/useModuleAccess";
import { usePermissions } from "../../../hooks/usePermissions";
import { useLocalDb } from "../../../services/localDb";
import { getDisplayValue } from "../../../utils/displayValue";
import { formatMoney } from "../../../utils/formatters";
import { PageShell, StatusPill } from "../../../components/prototype/PrototypeUI";

const configs = {
  agent_workspace: {
    icon: Route,
    eyebrow: "Agent",
    headline: "Bugungi ishlaringiz",
    actions: [
      ["Bugungi marshrut", "/routes/today", Route], ["Mijozlarim", "/customers", Users],
      ["Tashriflar", "/visits", MapPin], ["Yangi buyurtma", "/orders/new", ShoppingBag],
      ["To‘lovlar", "/payments", CircleDollarSign],
    ],
  },
  warehouse_workspace: {
    icon: Warehouse,
    eyebrow: "Omborchi",
    headline: "Ombor vazifalari",
    actions: [
      ["Qoldiqlar", "/inventory", Boxes], ["Mahsulot kirimi", "/inventory/receipts", PackageCheck],
      ["Transferlar", "/inventory/transfers", Truck], ["Inventarizatsiya", "/inventory/counts", ClipboardList],
    ],
  },
  fulfillment_workspace: {
    icon: ClipboardList,
    eyebrow: "Tayyorlash",
    headline: "Yig‘ish va qadoqlash",
    actions: [
      ["Yig‘ish varaqalari", "/fulfillment/pick-lists", ClipboardList], ["Yig‘ish", "/fulfillment/picking", Boxes],
      ["Qadoqlash", "/fulfillment/packing", PackageCheck], ["Tayyor buyurtmalar", "/fulfillment/ready", CheckCircle2],
    ],
  },
  driver_workspace: {
    icon: Truck,
    eyebrow: "Haydovchi",
    headline: "Bugungi yetkazib berishlar",
    actions: [
      ["Bugungi reys", "/deliveries", Truck], ["Topshiriqlar", "/deliveries/assignments", ClipboardList],
      ["Navigatsiya", "/deliveries", MapPin],
    ],
  },
  sales_operator_workspace: {
    icon: ShoppingBag,
    eyebrow: "Sotuv operatori",
    headline: "Buyurtma markazi",
    actions: [
      ["Yangi buyurtma", "/orders/new", ShoppingBag], ["Buyurtmalar", "/orders", ClipboardList],
      ["Mijozlar", "/customers", Users], ["Mahsulotlar", "/inventory/products", Boxes],
    ],
  },
  cashier_workspace: {
    icon: CircleDollarSign,
    eyebrow: "Kassir / Inkassator",
    headline: "To‘lov va kassa",
    actions: [
      ["Tezkor kassa", "/sales/pos", ScanLine], ["To‘lovlar", "/payments", CircleDollarSign],
      ["Qarzdorlik", "/debt", UserRound], ["Hisob-fakturalar", "/invoices", ClipboardList],
    ],
  },
};

function belongsToUser(row, user) {
  if (!row || !user) return false;
  const ids = [row.employeeId, row.agentId, row.driverId, row.pickerEmployeeId, row.createdByEmployeeId, row.cashierId, row.userId].filter(Boolean);
  const userIds = [user.id, user.employeeId].filter(Boolean);
  return ids.length ? ids.some((id) => userIds.includes(id)) : false;
}

function countScoped(rows, user, manager) {
  const list = Array.isArray(rows) ? rows : [];
  return manager ? list.length : list.filter((row) => belongsToUser(row, user)).length;
}

function EmployeeWorkspacePage({ workspaceKey }) {
  const db = useLocalDb();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { isEnabled } = useModuleAccess();
  const workspace = EMPLOYEE_WORKSPACES[workspaceKey];
  const config = configs[workspaceKey];
  const isManager = Boolean(user?.roles?.some((role) => ["OWNER", "ADMIN"].includes(role)));
  const Icon = config.icon;
  const visibleActions = config.actions.filter(([, to]) => {
    const moduleKey = getRouteModule(to);
    const permission = getRoutePermission(to);
    return (!moduleKey || isEnabled(moduleKey)) && (!permission || can(permission));
  });

  const metrics = {
    agent_workspace: [
      ["Tashrif", countScoped(db.visits, user, isManager), "Bugungi va rejalashtirilgan"],
      ["Buyurtma", countScoped(db.orders, user, isManager), "Sizga tegishli"],
      ["Mijoz", db.customers?.length || 0, "Ishlash mumkin"],
      ["To‘lov", countScoped(db.payments, user, isManager), "Qabul qilingan"],
    ],
    warehouse_workspace: [
      ["Mahsulot", db.products?.length || 0, "Katalog"],
      ["Qoldiq", db.balances?.length || 0, "Pozitsiya"],
      ["Kirim", db.goodsReceipts?.length || 0, "Hujjat"],
      ["Transfer", db.transfers?.length || 0, "Jarayon"],
    ],
    fulfillment_workspace: [
      ["Pick list", countScoped(db.pickLists, user, isManager), "Ish navbati"],
      ["Qadoqlash", db.packing?.length || 0, "Jarayon"],
      ["Tayyor", (db.pickLists || []).filter((row) => row.status === "READY").length, "Yetkazishga tayyor"],
      ["Buyurtma", db.orders?.length || 0, "Manba"],
    ],
    driver_workspace: [
      ["Topshiriq", countScoped(db.deliveries, user, isManager), "Sizga biriktirilgan"],
      ["Reys", countScoped(db.deliveryTrips, user, isManager), "Bugungi"],
      ["Yetkazildi", (db.deliveries || []).filter((row) => row.status === "DELIVERED").length, "Yakunlangan"],
      ["Muammoli", (db.deliveries || []).filter((row) => ["FAILED", "PARTIALLY_DELIVERED"].includes(row.status)).length, "E’tibor kerak"],
    ],
    sales_operator_workspace: [
      ["Buyurtma", countScoped(db.orders, user, isManager), "Yaratilgan"],
      ["Mijoz", db.customers?.length || 0, "Baza"],
      ["Mahsulot", db.products?.length || 0, "Katalog"],
      ["Savdo", (db.sales || []).reduce((sum, row) => sum + Number(row.total || 0), 0), "so‘m"],
    ],
    cashier_workspace: [
      ["To‘lov", countScoped(db.payments, user, isManager), "Operatsiya"],
      ["Qarzdor", db.debts?.length || 0, "Mijoz"],
      ["Invoice", db.invoices?.length || 0, "Hujjat"],
      ["Tushum", (db.payments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0), "so‘m"],
    ],
  }[workspaceKey] || [];

  const sourceRows = ({
    agent_workspace: db.visits,
    warehouse_workspace: db.movements,
    fulfillment_workspace: db.pickLists,
    driver_workspace: db.deliveries,
    sales_operator_workspace: db.orders,
    cashier_workspace: db.payments,
  }[workspaceKey] || []).filter((row) => isManager || belongsToUser(row, user));
  const recentRows = sourceRows.slice(0, 6);
  const completedStatuses = new Set(["COMPLETED", "DONE", "DELIVERED", "PAID", "CLOSED", "FULFILLED", "VISITED"]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const datedRows = sourceRows.filter((row) => {
    const raw = row.scheduledAt || row.plannedAt || row.deliveryDate || row.date || row.createdAt;
    if (!raw) return false;
    const parsed = new Date(raw);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === todayKey;
  });
  const planRows = datedRows.length ? datedRows : sourceRows.slice(0, 12);
  const completedPlan = planRows.filter((row) => completedStatuses.has(String(row.status || "").toUpperCase())).length;
  const planPercent = planRows.length ? Math.round((completedPlan / planRows.length) * 100) : 0;
  const unreadNotifications = (db.workflowNotifications || db.notifications || []).filter((item) => (!item.userId || [user?.id, user?.employeeId].includes(item.userId)) && !item.read && !item.readAt).length;
  const todayLabel = new Intl.DateTimeFormat("uz-UZ", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <PageShell
      eyebrow={config.eyebrow}
      title={workspace.label}
      description={isManager ? `${workspace.description} Owner preview rejimi.` : workspace.description}
      actions={<span className="qp-workspace-badge"><Icon size={15}/> {isManager ? "Preview" : "Mening ish joyim"}</span>}
    >
      <section className="qp-mobile-workspace-overview">
        <div className="qp-mobile-workspace-greeting">
          <span className="qp-mobile-workspace-avatar">{(user?.name || "Q").slice(0, 1).toUpperCase()}</span>
          <div><small>{todayLabel}</small><strong>Salom, {(user?.name || "Xodim").split(" ")[0]}!</strong><span>{config.eyebrow}</span></div>
          <button type="button" className="qp-mobile-workspace-bell" aria-label={`Bildirishnomalar${unreadNotifications ? `, ${unreadNotifications} ta yangi` : ""}`} onClick={() => navigate("/notifications")}><Bell size={19}/>{unreadNotifications ? <b>{Math.min(unreadNotifications, 99)}</b> : null}</button>
        </div>
        <div className="qp-mobile-workspace-plan">
          <div className="qp-mobile-workspace-plan-head"><span><Target size={18}/><strong>Bugungi reja</strong></span><b>{completedPlan} / {planRows.length}</b></div>
          <div className="qp-mobile-workspace-progress"><i style={{ width: `${planPercent}%` }}/></div>
          <div className="qp-mobile-workspace-plan-foot"><span>{planRows.length ? `${planPercent}% bajarildi` : "Bugun uchun vazifa yo‘q"}</span><small><CalendarDays size={13}/> {todayLabel}</small></div>
        </div>
      </section>

      <section className="qp-employee-workspace-hero">
        <div><Icon size={24}/><span><small>{config.eyebrow}</small><strong>{config.headline}</strong><p>{user?.name || "Xodim"} uchun faqat kundalik ishga kerakli amallar.</p></span></div>
      </section>

      <section className="qp-role-kpis">
        {metrics.map(([label, value, hint]) => <div key={label}><Icon size={18}/><span>{label}</span><strong>{typeof value === "number" && hint === "so‘m" ? formatMoney(value) : value}</strong><small>{hint}</small></div>)}
      </section>

      <div className="qp-workspace-quick-grid">
        {visibleActions.map(([label, to, ActionIcon], index) => (
          <Link key={to} to={to} className={`qp-button qp-workspace-action ${index === 0 ? "qp-button-primary" : "qp-button-secondary"}`}><span><ActionIcon size={18}/><b>{label}</b></span><ChevronRight className="qp-workspace-action-arrow" size={16}/></Link>
        ))}
      </div>

      <section className="qp-role-card qp-workspace-recent">
        <div className="qp-role-card-head"><div><span>Oxirgi faoliyat</span><h2>Sizga tegishli ishlar</h2></div><b>{recentRows.length}</b></div>
        <div className="qp-role-list">
          {recentRows.length ? recentRows.map((row) => <div className="qp-workspace-row" key={row.id}><div><strong>{getDisplayValue(row.number || row.name || row.customerName || row.title, `#${String(row.id).slice(0, 8)}`)}</strong><span>{getDisplayValue(row.customer || row.note || row.description, "Operatsiya")}</span></div>{row.status ? <StatusPill status={row.status}/> : null}</div>) : <div className="qp-role-empty">Hozircha sizga biriktirilgan yangi vazifa yo‘q.</div>}
        </div>
      </section>
    </PageShell>
  );
}

export default EmployeeWorkspacePage;
