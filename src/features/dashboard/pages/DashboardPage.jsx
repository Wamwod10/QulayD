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
} from "lucide-react";
import { Link } from "react-router-dom";

import { Metric, PageShell, SectionCard } from "../../../components/prototype/PrototypeUI";
import { getFinanceSummary } from "../../../services/financeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { getOperationalAgents } from "../../../services/employeeSelectors";
import { formatMoney, formatNumber } from "../../../utils/formatters";

function DashboardPage() {
  const db = useLocalDb();
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

  const facts = [
    { label: "Sotilgan mahsulot", value: `${formatNumber(soldUnits)} dona`, hint: "Bugungi haqiqiy sotuv", icon: <ShoppingBag size={16} /> },
    { label: "Faol mijozlar", value: `${activeCustomers} ta`, hint: `${debtCustomers} ta qarzdor`, icon: <UserRoundCheck size={16} /> },
    { label: "Tasdiqlangan buyurtma", value: `${confirmedOrders} ta`, hint: `${pickingOrders} ta tayyorlash oqimida`, icon: <PackageCheck size={16} /> },
    { label: "Band qilingan mahsulot", value: `${formatNumber(reservedUnits)} dona`, hint: "Buyurtmalar uchun band", icon: <Boxes size={16} /> },
    { label: "Bugungi tushum", value: formatMoney(todayPaymentTotal), hint: `${todayPayments.length} ta tasdiqlangan to‘lov`, icon: <CircleDollarSign size={16} /> },
    { label: "Yetkazilgan", value: `${deliveredToday} ta`, hint: `${failedDelivery} ta muammoli`, icon: <Truck size={16} /> },
  ];

  const setupSteps = [
    { label: "Kompaniya ma’lumotlari", done: Boolean(db.settings?.company?.name), to: "/settings/general", help: "first-setup" },
    { label: "Asosiy ombor", done: (db.warehouses || []).length > 0, to: "/warehouses", help: "first-setup" },
    { label: "Mahsulotlar", done: (db.products || []).length > 0, to: "/products", help: "first-setup" },
    { label: "Xodim", done: (db.users || []).some((item) => !(item.roles || []).includes("OWNER") && item.primaryRole !== "OWNER"), to: "/users", help: "first-employee" },
    { label: "Mijoz", done: (db.customers || []).length > 0, to: "/customers", help: "first-order" },
    { label: "Birinchi buyurtma", done: (db.orders || []).length > 0, to: "/orders/new", help: "first-order" },
  ];
  const setupDone = setupSteps.filter((item) => item.done).length;

  const attention = [
    lowStock ? { to: "/inventory", value: `${lowStock} ta`, title: "Kam qoldiq", text: "Minimal qoldiq chegarasiga yetgan pozitsiyalar", tone: "warning" } : null,
    debtCustomers ? { to: "/debt", value: `${debtCustomers} ta`, title: "Qarzdor mijoz", text: `${formatMoney(totalDebt)} umumiy qarzdorlik`, tone: "danger" } : null,
    failedDelivery ? { to: "/deliveries", value: `${failedDelivery} ta`, title: "Muammoli yetkazish", text: "Qayta rejalash yoki sababini tekshirish kerak", tone: "danger" } : null,
    agentBehind ? { to: "/agents/today", value: `${agentBehind} ta`, title: "Agent rejasidan ortda", text: "Bugungi tashrif rejasi bajarilishi past", tone: "warning" } : null,
  ].filter(Boolean);

  return (
    <PageShell title="Bosh sahifa" description="Rahbar uchun eng kerakli aniq sonlar, muhim holatlar va kelajakdagi Qulay AI boshqaruv markazi." eyebrow="Qulay boshqaruv markazi">
      {setupDone < setupSteps.length ? <section className="qp-onboarding-card"><div className="qp-onboarding-head"><div><span>Yangi foydalanuvchi uchun</span><h2>Qulay’ni ishga tayyorlang</h2><p>Asosiy sozlamalarni bir marta tugating — keyingi biznes jarayonlari ancha tushunarli ishlaydi.</p></div><b>{setupDone}/{setupSteps.length}</b></div><div className="qp-onboarding-progress"><i style={{ width: `${Math.round((setupDone / setupSteps.length) * 100)}%` }}/></div><div className="qp-onboarding-steps">{setupSteps.map((step) => <div className={step.done ? "done" : ""} key={step.label}>{step.done ? <CheckCircle2 size={17}/> : <Circle size={17}/>}<span>{step.label}</span>{!step.done ? <><Link to={step.to}>Bajarish <ArrowRight size={14}/></Link><Link className="help" to={`/help/${step.help}`}>Qanday ishlaydi?</Link></> : <small>Tayyor</small>}</div>)}</div></section> : null}
      <div className="qp-metrics qp-dashboard-metrics">
        <Metric label="Bugungi savdo" value={formatMoney(todaySalesTotal)} hint={`${todaySales.length} ta haqiqiy sotuv`} icon={<WalletCards size={16} />} />
        <Metric label="Bugungi buyurtmalar" value={todayOrders.length} hint={`${confirmedOrders} ta tasdiqlangan`} icon={<ShoppingBag size={16} />} />
        <Metric label="Umumiy qarzdorlik" value={formatMoney(totalDebt)} hint={`${debtCustomers} ta mijoz`} icon={<CircleDollarSign size={16} />} />
        <Metric label="Yetkazilmoqda" value={activeDelivery} hint={`${deliveredToday} ta yakunlangan`} icon={<Truck size={16} />} />
      </div>

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
