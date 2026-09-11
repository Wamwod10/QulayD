import {
  AlertTriangle,
  Bot,
  Boxes,
  CircleDollarSign,
  PackageCheck,
  ShoppingBag,
  Truck,
  UserRoundCheck,
  WalletCards,
  CheckCircle2,
  Circle,
  ArrowRight,
  ClipboardCheck,
  PlusCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Metric, PageShell, QuickLink, SectionCard } from "../../../components/prototype/PrototypeUI";
import { getFinanceSummary } from "../../../services/financeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { getOperationalAgents } from "../../../services/employeeSelectors";
import { formatMoney, formatNumber } from "../../../utils/formatters";
import { useModuleAccess } from "../../../hooks/useModuleAccess";
import { useAuth } from "../../../hooks/useAuth";

function DashboardPage() {
  const db = useLocalDb();
  const { isEnabled } = useModuleAccess();
  const { user } = useAuth();
  const canConfigure = user?.roles?.some((role) => ["OWNER", "ADMIN"].includes(role));
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = db.sales.filter((item) => item.date === today);
  const todayOrders = db.orders.filter((item) => item.date === today);
  const todayPayments = db.payments.filter((item) => item.date === today && item.status === "CONFIRMED");
  const deliveredToday = db.deliveries.filter((item) => item.status === "DELIVERED").length;
  const activeDelivery = db.deliveries.filter((item) => ["PLANNED", "OUT_FOR_DELIVERY"].includes(item.status)).length;
  const failedDelivery = db.deliveries.filter((item) => item.status === "FAILED").length;
  const confirmedOrders = db.orders.filter((item) => item.status === "CONFIRMED").length;
  const pickingOrders = db.orders.filter((item) => ["RESERVED", "PICKING", "PICKED", "PACKING", "PARTIAL"].includes(item.fulfillmentStatus)).length;
  const soldUnits = todaySales.reduce((sum, sale) => sum + (sale.items || []).reduce((inner, item) => inner + Number(item.quantity || 0), 0), 0);
  const todaySalesTotal = todaySales.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const todayPaymentTotal = todayPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const finance = getFinanceSummary(db);
  const totalDebt = finance.totalDebt;
  const reservedUnits = db.balances.reduce((sum, item) => sum + Number(item.reserved || 0), 0);
  const activeCustomers = db.customers.filter((item) => item.status === "ACTIVE").length;
  const lowStock = db.balances.filter((balance) => {
    const product = db.products.find((item) => item.id === balance.productId);
    return product && balance.onHand - balance.reserved <= Number(product.minStock || 0);
  }).length;
  const debtCustomers = finance.debtorCount;
  const operationalAgents = getOperationalAgents(db);
  const agentBehind = operationalAgents.filter((agent) => Number(agent.visitsToday || 0) < Number(agent.plannedVisitsToday || agent.visitsToday || 0)).length;
  const approvalRequests = db.orders.filter((item) => item.approvalStatus === "PENDING").length
    + (db.approvals || []).filter((item) => item.status === "PENDING").length;
  const issueCount = lowStock + failedDelivery + agentBehind;

  const facts = [
    isEnabled("sales") ? { label: "Sotilgan mahsulot", value: `${formatNumber(soldUnits)} dona`, hint: "Bugungi haqiqiy sotuv", icon: <ShoppingBag size={16} /> } : null,
    isEnabled("partners") ? { label: "Faol mijozlar", value: `${activeCustomers} ta`, hint: "Faol hamkorlar", icon: <UserRoundCheck size={16} /> } : null,
    isEnabled("sales") ? { label: "Tasdiqlangan buyurtma", value: `${confirmedOrders} ta`, hint: `${isEnabled("fulfillment") ? pickingOrders : 0} ta tayyorlash oqimida`, icon: <PackageCheck size={16} /> } : null,
    isEnabled("inventory") ? { label: "Band qilingan mahsulot", value: `${formatNumber(reservedUnits)} dona`, hint: "Buyurtmalar uchun band", icon: <Boxes size={16} /> } : null,
    isEnabled("finance") ? { label: "Bugungi tushum", value: formatMoney(todayPaymentTotal), hint: `${todayPayments.length} ta tasdiqlangan to‘lov`, icon: <CircleDollarSign size={16} /> } : null,
    isEnabled("delivery") ? { label: "Yetkazilgan", value: `${deliveredToday} ta`, hint: `${failedDelivery} ta muammoli`, icon: <Truck size={16} /> } : null,
  ].filter(Boolean);

  const setupSteps = [
    { label: "Kompaniya ma’lumotlari", done: Boolean(db.settings?.company?.name), to: "/settings/general", help: "first-setup" },
    { label: "Asosiy ombor", done: (db.warehouses || []).length > 0, to: "/warehouses", help: "first-setup" },
    { label: "Mahsulotlar", done: (db.products || []).length > 0, to: "/inventory/products", help: "first-setup" },
    { label: "Xodim", done: (db.users || []).some((item) => !(item.roles || []).includes("OWNER") && item.primaryRole !== "OWNER"), to: "/users", help: "first-employee" },
    { label: "Mijoz", done: (db.customers || []).length > 0, to: "/customers", help: "first-order" },
    { label: "Birinchi buyurtma", done: (db.orders || []).length > 0, to: "/orders/new", help: "first-order" },
  ];
  const setupDone = setupSteps.filter((item) => item.done).length;

  const attention = [
    isEnabled("inventory") && lowStock ? { to: "/inventory", value: `${lowStock} ta`, title: "Kam qoldiq", text: "Minimal qoldiq chegarasiga yetgan pozitsiyalar", tone: "warning" } : null,
    isEnabled("finance") && debtCustomers ? { to: "/debt", value: `${debtCustomers} ta`, title: "Qarzdor mijoz", text: `${formatMoney(totalDebt)} umumiy qarzdorlik`, tone: "danger" } : null,
    isEnabled("delivery") && failedDelivery ? { to: "/deliveries", value: `${failedDelivery} ta`, title: "Muammoli yetkazish", text: "Qayta rejalash yoki sababini tekshirish kerak", tone: "danger" } : null,
    isEnabled("agents") && agentBehind ? { to: "/agents/today", value: `${agentBehind} ta`, title: "Agent rejasidan ortda", text: "Bugungi tashrif rejasi bajarilishi past", tone: "warning" } : null,
  ].filter(Boolean);

  return (
    <PageShell title="Bosh sahifa" description="Rahbar uchun eng kerakli aniq sonlar, muhim holatlar va kelajakdagi Qulay AI boshqaruv markazi." eyebrow="Qulay boshqaruv markazi">
      {canConfigure && setupDone < setupSteps.length ? <section className="qp-onboarding-card"><div className="qp-onboarding-head"><div><span>Yangi foydalanuvchi uchun</span><h2>Qulay’ni ishga tayyorlang</h2><p>Asosiy sozlamalarni bir marta tugating — keyingi biznes jarayonlari ancha tushunarli ishlaydi.</p></div><b>{setupDone}/{setupSteps.length}</b></div><div className="qp-onboarding-progress"><i style={{ width: `${Math.round((setupDone / setupSteps.length) * 100)}%` }}/></div><div className="qp-onboarding-steps">{setupSteps.map((step) => <div className={step.done ? "done" : ""} key={step.label}>{step.done ? <CheckCircle2 size={17}/> : <Circle size={17}/>}<span>{step.label}</span>{!step.done ? <><Link to={step.to}>Bajarish <ArrowRight size={14}/></Link><Link className="help" to={`/help/${step.help}`}>Qanday ishlaydi?</Link></> : <small>Tayyor</small>}</div>)}</div></section> : null}
      <div className="qp-metrics qp-dashboard-metrics">
        {isEnabled("sales") ? <Metric label="Bugungi savdo" value={formatMoney(todaySalesTotal)} hint={`${todaySales.length} ta haqiqiy sotuv`} icon={<WalletCards size={16} />} /> : null}
        {isEnabled("finance") ? <Metric label="Tushum" value={formatMoney(todayPaymentTotal)} hint={`${todayPayments.length} ta tasdiqlangan to‘lov`} icon={<CircleDollarSign size={16} />} /> : null}
        {isEnabled("sales") ? <Metric label="Bugungi buyurtmalar" value={todayOrders.length} hint={`${confirmedOrders} ta tasdiqlangan`} icon={<ShoppingBag size={16} />} /> : null}
        {isEnabled("finance") ? <Metric label="Umumiy qarzdorlik" value={formatMoney(totalDebt)} hint={`${debtCustomers} ta mijoz`} icon={<CircleDollarSign size={16} />} /> : null}
        {isEnabled("delivery") ? <Metric label="Yetkazilmoqda" value={activeDelivery} hint={`${deliveredToday} ta yakunlangan`} icon={<Truck size={16} />} /> : null}
        {canConfigure ? <Metric label="Muammolar" value={issueCount} hint="Tezkor e’tibor talab qiladi" icon={<AlertTriangle size={16} />} /> : null}
        {canConfigure ? <Metric label="Tasdiq so‘rovlari" value={approvalRequests} hint="Owner/Admin qarorini kutmoqda" icon={<ClipboardCheck size={16} />} /> : null}
        {isEnabled("inventory") ? <Metric label="Ombor holati" value={lowStock ? `${lowStock} ta kam qoldiq` : "Barqaror"} hint={`${formatNumber(reservedUnits)} dona band qilingan`} icon={<Boxes size={16} />} /> : null}
      </div>

      <SectionCard className="qp-dashboard-mobile-actions" title="Tezkor actionlar" description="Kundalik ishni bir bosishda boshlang.">
        <div className="qp-dashboard-quick-links">
          {isEnabled("sales") ? <QuickLink to="/orders/new" title="Yangi buyurtma" description="Savdo buyurtmasini yarating" icon={<PlusCircle size={18} />} /> : null}
          {isEnabled("inventory") ? <QuickLink to="/inventory" title="Omborni tekshirish" description="Qoldiq va muammolar" icon={<Boxes size={18} />} /> : null}
          {isEnabled("finance") ? <QuickLink to="/payments" title="To‘lov qabul qilish" description="Mijoz to‘lovini kiriting" icon={<CircleDollarSign size={18} />} /> : null}
          {canConfigure ? <QuickLink to="/operations" title="Approval va nazorat" description={`${approvalRequests} ta so‘rov kutilmoqda`} icon={<ClipboardCheck size={18} />} /> : null}
        </div>
      </SectionCard>

      <div className="qp-dashboard-v4-grid">
        <SectionCard title="Bugungi holat" description="Grafik o‘rniga tez qaror qilish uchun aniq operatsion sonlar.">
          <div className="qp-dashboard-facts">
            {facts.map((fact) => <div className="qp-dashboard-fact" key={fact.label}><span className="qp-dashboard-fact-icon">{fact.icon}</span><div><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.hint}</small></div></div>)}
          </div>
        </SectionCard>

        <SectionCard title="E’tibor talab qiladi" description="Faqat real muammo yoki nazorat talab qiladigan holatlar.">
          <div className="qp-dashboard-attention">
            {attention.length ? attention.map((item) => <Link to={item.to} className={`qp-dashboard-attention-row ${item.tone}`} key={item.title}><span className="qp-dashboard-attention-icon"><AlertTriangle size={16} /></span><div><strong>{item.title}</strong><small>{item.text}</small></div><b>{item.value}</b></Link>) : <div className="qp-empty"><strong>Hammasi nazoratda</strong><span>Hozir kritik signal yo‘q.</span></div>}
          </div>
        </SectionCard>
      </div>

      <section className="qp-card qp-ai-card qp-dashboard-ai qp-ai-premium">
        <div className="qp-ai-orb"><Bot size={23} /></div>
        <div className="qp-eyebrow">Kelajakdagi asosiy boshqaruv qatlami</div>
        <h2>Qulay AI</h2>
        <p>Bu maydon ataylab bo‘sh va markaziy saqlanadi. AI keyinchalik butun platformadagi ma’lumotlarni tushuntiradi, muammolarni oldindan ko‘rsatadi va kerakli amallarni taklif qiladi.</p>
        <div className="qp-ai-chip-row"><span className="qp-ai-chip">Bugun nima muhim?</span><span className="qp-ai-chip">Qaysi mahsulot tez kamaymoqda?</span><span className="qp-ai-chip">Qarzdorlikdagi risklar</span><span className="qp-ai-chip">Ertangi ish rejasi</span></div>
      </section>
    </PageShell>
  );
}

export default DashboardPage;
