import { AlertTriangle, CircleDollarSign, Megaphone, PackageSearch, ShoppingCart, Truck, WalletCards } from "lucide-react";

import { PageShell, SectionCard } from "../../../components/prototype/PrototypeUI";
import { useAuth } from "../../../hooks/useAuth";
import { usePlatformSettings } from "../../../hooks/usePlatformSettings";
import { getFinanceSummary } from "../../../services/financeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { formatDateTime, formatMoney, getName } from "../../../utils/formatters";
import { useModuleAccess } from "../../../hooks/useModuleAccess";
import { usePermissions } from "../../../hooks/usePermissions";
import { getRouteModule, getRoutePermission } from "../../../app/navigationConfig";

function NotificationsPage() {
  const { user, company } = useAuth();
  const platformSettings = usePlatformSettings();
  const db = useLocalDb();
  const { isEnabled } = useModuleAccess();
  const { can } = usePermissions();
  const settings = db.settings.notifications;
  const broadcastsEnabled = platformSettings?.featureFlags?.platformBroadcasts !== false;
  const broadcasts = broadcastsEnabled ? (platformSettings?.broadcasts || []).filter((item) => {
    if (item.audience === "OWNERS") return user?.roles?.some((role) => ["OWNER", "ADMIN"].includes(role));
    if (item.audience === "TRIAL") return company?.plan === "TRIAL";
    return true;
  }).slice(0, 5) : [];
  const today = new Date().toISOString().slice(0, 10);
  const low = !isEnabled("inventory") || settings.lowStock === false || db.settings.inventory.lowStockAlerts === false ? [] : db.balances
    .map((balance) => ({ ...balance, product: db.products.find((item) => item.id === balance.productId) }))
    .filter((item) => item.product && item.onHand - item.reserved <= item.product.minStock)
    .slice(0, 5);
  const finance = getFinanceSummary(db);
  const debtCustomers = !isEnabled("finance") || settings.overdueDebt === false ? [] : finance.rows.filter((item) => item.overdue > 0);
  const failed = !isEnabled("delivery") || settings.failedDelivery === false ? [] : db.deliveries.filter((item) => item.status === "FAILED");
  const todayOrders = !isEnabled("sales") || settings.newOrder === false ? [] : db.orders.filter((item) => item.date === today);
  const todayPayments = !isEnabled("finance") || settings.payment === false ? [] : db.payments.filter((item) => item.date === today);
  const items = [];
  const userRoles = new Set(user?.roles || [user?.role].filter(Boolean));
  const workflow = (db.workflowNotifications || []).filter((item) => {
    const targetAllowed = !item.actionPath || (isEnabled(getRouteModule(item.actionPath)) && can(getRoutePermission(item.actionPath)));
    if (!targetAllowed) return false;
    if (item.userId) return item.userId === user?.id;
    return !item.role || userRoles.has(item.role);
  }).slice(0, 12);

  low.forEach((item) => items.push({
    key: `low-${item.id}`,
    title: `${item.product.name} — kam qoldiq`,
    description: `${getName(db.warehouses, item.warehouseId)} · mavjud ${item.onHand - item.reserved}`,
    icon: <PackageSearch size={17} />,
  }));
  if (debtCustomers.length) items.push({
    key: "debt",
    title: "Qarzdorlik nazorati",
    description: `${debtCustomers.length} ta mijozda jami ${formatMoney(debtCustomers.reduce((sum, item) => sum + Number(item.overdue || 0), 0))} muddati o‘tgan qarz mavjud`,
    icon: <CircleDollarSign size={17} />,
  });
  if (failed.length) items.push({
    key: "failed",
    title: "Muammoli yetkazib berish",
    description: `${failed.length} ta yetkazib berish yakunlanmagan. Sabablarini Yetkazib berish bo‘limida tekshiring.`,
    icon: <AlertTriangle size={17} />,
  });
  if (todayOrders.length) items.push({
    key: "orders",
    title: "Bugungi buyurtmalar",
    description: `${todayOrders.length} ta buyurtma yaratildi`,
    icon: <ShoppingCart size={17} />,
  });
  if (todayPayments.length) items.push({
    key: "payments",
    title: "Bugungi to‘lovlar",
    description: `${todayPayments.length} ta to‘lov · ${formatMoney(todayPayments.filter((item) => item.status === "CONFIRMED").reduce((sum, item) => sum + Number(item.amount || 0), 0))}`,
    icon: <WalletCards size={17} />,
  });
  const onRoad = isEnabled("delivery") ? db.deliveries.filter((item) => item.status === "OUT_FOR_DELIVERY").length : 0;
  if (onRoad) items.push({
    key: "road",
    title: "Yo‘ldagi yetkazib berishlar",
    description: `${onRoad} ta topshiriq hozir yo‘lda`,
    icon: <Truck size={17} />,
  });

  return (
    <PageShell title="Bildirishnomalar" description="Sozlamalarda yoqilgan muhim operatsion signallar bitta markazda." eyebrow="Tizim">
      <SectionCard>
        {broadcasts.length ? <div className="qp-platform-broadcasts"><div className="qp-card-head"><div><h2>Qulay e’lonlari</h2><p>Platforma administratori yuborgan muhim xabarlar.</p></div></div><div className="qp-alert-list">{broadcasts.map((item) => <div className="qp-alert-row" key={item.id}><div><strong>{item.title}</strong><span>{item.message}</span><small>{formatDateTime(item.createdAt)}</small></div><Megaphone size={17}/></div>)}</div></div> : null}
        {settings.browser === false ? (
          <div className="qp-inline-warning">Interfeys bildirishnomalari Sozlamalarda o‘chirilgan. Bu sahifada ma’lumotlarni ko‘rish davom etadi, lekin yuqori panelda signal chiqmaydi.</div>
        ) : null}
        {workflow.length ? <div className="qp-workflow-notifications">
          <div className="qp-card-head"><div><h2>Mening bildirishnomalarim</h2><p>Sizga biriktirilgan ishlar va jarayonlardan kelgan xabarlar.</p></div><span className="qp-mini-count">{workflow.filter((item) => !item.read).length}</span></div>
          <div className="qp-alert-list">{workflow.map((item) => <div className="qp-alert-row" key={item.id}><div><strong>{item.title}</strong><span>{item.message}</span><small>{formatDateTime(item.createdAt)}</small></div><span className={`qp-status qp-status-${String(item.type || "info").toLowerCase()}`}>{item.read ? "O‘qilgan" : "Yangi"}</span></div>)}</div>
        </div> : null}
        <div className="qp-alert-list">
          {items.length ? items.map((item) => (
            <div className="qp-alert-row" key={item.key}>
              <div><strong>{item.title}</strong><span>{item.description}</span></div>
              {item.icon}
            </div>
          )) : (
            <div className="qp-empty"><strong>Hozircha muhim signal yo‘q</strong><span>Yoqilgan bildirishnoma qoidalari bo‘yicha muammolar topilmadi.</span></div>
          )}
        </div>
      </SectionCard>
    </PageShell>
  );
}

export default NotificationsPage;
