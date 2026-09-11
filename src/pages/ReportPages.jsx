import { ArrowUpRight, BarChart3, Boxes, CircleDollarSign, PackageSearch, ShoppingBag, Truck, WalletCards } from "lucide-react";
import { NavLink } from "react-router-dom";

import SmartTablePage from "../components/prototype/SmartTablePage";
import { Metric, PageShell, SectionCard, StatusPill } from "../components/prototype/PrototypeUI";
import { getCustomerDebtRow, getFinanceSummary } from "../services/financeSelectors";
import { usePlatformFeatureFlag } from "../hooks/usePlatformSettings";
import { useLocalDb } from "../services/localDb";
import { getOperationalAgents } from "../services/employeeSelectors";
import { formatMoney, getName } from "../utils/formatters";
import { getLabel } from "../utils/labels";

function topProducts(db) {
  const totals = new Map();
  db.sales.forEach((sale) => sale.items?.forEach((item) => {
    const current = totals.get(item.productId) || { quantity: 0, amount: 0 };
    current.quantity += Number(item.quantity || 0);
    current.amount += Number(item.quantity || 0) * Number(item.price || 0);
    totals.set(item.productId, current);
  }));
  return [...totals.entries()]
    .map(([productId, value]) => ({ id: productId, product: getName(db.products, productId), ...value }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
}

export function ReportsOverviewPage() {
  const db = useLocalDb();
  const debtAgingEnabled = usePlatformFeatureFlag("debtAging", true);
  const sales = db.sales.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const finance = getFinanceSummary(db);
  const debt = finance.totalDebt;
  const stock = db.balances.reduce((sum, item) => sum + Number(item.onHand || 0), 0);
  const reserved = db.balances.reduce((sum, item) => sum + Number(item.reserved || 0), 0);
  const delivered = db.deliveries.filter((item) => item.status === "DELIVERED").length;
  const failed = db.deliveries.filter((item) => item.status === "FAILED").length;
  const successRate = delivered + failed ? Math.round((delivered / (delivered + failed)) * 100) : 100;

  return (
    <PageShell title="Umumiy hisobot" description="Savdo, ombor, qarzdorlik va yetkazib berish bo‘yicha yagona qisqa tahlil." eyebrow="Hisobotlar">
      <div className="qp-metrics">
        <Metric label="Jami sotuv" value={formatMoney(sales)} icon={<WalletCards size={16} />} />
        <Metric label="Jami qarz" value={formatMoney(debt)} icon={<CircleDollarSign size={16} />} />
        <Metric label="Ombordagi birliklar" value={stock} hint={`${reserved} birlik band qilingan`} icon={<Boxes size={16} />} />
        <Metric label="Yetkazish muvaffaqiyati" value={`${successRate}%`} icon={<Truck size={16} />} />
      </div>
      <div className="qp-grid-2">
        <SectionCard title="Eng ko‘p sotilgan mahsulotlar" description="Haqiqiy sotuvlar bo‘yicha">
          <div className="qp-ranking-list">
            {topProducts(db).map((item, index) => (
              <div className="qp-ranking-row" key={item.id}><span>{index + 1}</span><div><strong>{item.product}</strong><small>{item.quantity} birlik</small></div><b>{formatMoney(item.amount)}</b></div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Operatsion holat" description="Hozir e’tibor berish kerak bo‘lgan oqimlar">
          <div className="qp-alert-list">
            <NavLink className="qp-alert-row qp-report-drill" to="/orders"><div><strong>{db.orders.filter((item) => item.status === "CONFIRMED").length} ta tasdiqlangan buyurtma</strong><span>Tayyorlash va yetkazish oqimiga o‘tish</span></div><span><ShoppingBag size={16} /><ArrowUpRight size={13} /></span></NavLink>
            <NavLink className="qp-alert-row qp-report-drill" to="/inventory"><div><strong>{db.balances.filter((balance) => { const product = db.products.find((item) => item.id === balance.productId); return product && balance.onHand - balance.reserved <= Number(product.minStock || 0); }).length} ta kam qoldiq</strong><span>Ombor qoldiqlarini tekshirish</span></div><span><PackageSearch size={16} /><ArrowUpRight size={13} /></span></NavLink>
            <NavLink className="qp-alert-row qp-report-drill" to="/debt"><div><strong>{finance.debtorCount} ta qarzdor mijoz</strong><span>{debtAgingEnabled ? `${formatMoney(finance.totalOverdue)} muddati o‘tgan qarz` : "Moliya nazoratiga o‘tish"}</span></div><span><BarChart3 size={16} /><ArrowUpRight size={13} /></span></NavLink>
          </div>
        </SectionCard>
      </div>
      {debtAgingEnabled ? <SectionCard title="Qarzdorlik aging" description="Muddati o‘tgan qarzlarni yoshiga qarab tezkor kuzatish."><div className="qp-metrics"><Metric label="0–30 kun" value={formatMoney(finance.aging.d0_30)} /><Metric label="31–60 kun" value={formatMoney(finance.aging.d31_60)} /><Metric label="61–90 kun" value={formatMoney(finance.aging.d61_90)} /><Metric label="90+ kun" value={formatMoney(finance.aging.d90_plus)} /></div></SectionCard> : null}
    </PageShell>
  );
}

export function SalesReportPage() {
  const db = useLocalDb();
  const total = db.sales.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const pos = db.sales.filter((item) => item.channel === "POS");
  const delivery = db.sales.filter((item) => item.channel === "DELIVERY");
  const average = db.sales.length ? Math.round(total / db.sales.length) : 0;
  const rows = topProducts(db);
  return (
    <PageShell title="Savdo hisoboti" description="Haqiqatan amalga oshgan sotuvlar, savdo kanallari va mahsulot natijalari." eyebrow="Hisobotlar">
      <div className="qp-metrics">
        <Metric label="Savdo summasi" value={formatMoney(total)} icon={<WalletCards size={16} />} />
        <Metric label="Sotuvlar soni" value={db.sales.length} icon={<ShoppingBag size={16} />} />
        <Metric label="O‘rtacha chek" value={formatMoney(average)} icon={<BarChart3 size={16} />} />
        <Metric label="Tezkor kassa / yetkazish" value={`${pos.length} / ${delivery.length}`} icon={<Truck size={16} />} />
      </div>
      <SectionCard title="Mahsulotlar bo‘yicha natija">
        <div className="qp-table-wrap"><table className="qp-table"><thead><tr><th>Mahsulot</th><th>Sotilgan birlik</th><th>Hisoblangan summa</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.product}</strong></td><td>{row.quantity}</td><td><strong>{formatMoney(row.amount)}</strong></td></tr>)}</tbody></table></div>
      </SectionCard>
    </PageShell>
  );
}

export function InventoryReportPage() {
  const db = useLocalDb();
  const rows = db.warehouses.map((warehouse) => {
    const balances = db.balances.filter((item) => item.warehouseId === warehouse.id);
    return {
      id: warehouse.id,
      name: warehouse.name,
      positions: balances.filter((item) => item.onHand > 0).length,
      onHand: balances.reduce((sum, item) => sum + Number(item.onHand || 0), 0),
      reserved: balances.reduce((sum, item) => sum + Number(item.reserved || 0), 0),
      available: balances.reduce((sum, item) => sum + Number(item.onHand || 0) - Number(item.reserved || 0), 0),
    };
  });
  const onHand = rows.reduce((sum, item) => sum + item.onHand, 0);
  const reserved = rows.reduce((sum, item) => sum + item.reserved, 0);
  const low = db.balances.filter((balance) => { const product = db.products.find((item) => item.id === balance.productId); return product && balance.onHand - balance.reserved <= Number(product.minStock || 0); }).length;
  return <SmartTablePage title="Ombor hisoboti" description="Omborlar kesimida haqiqiy qoldiq, band qilingan va sotish mumkin bo‘lgan birliklar." eyebrow="Hisobotlar" rows={rows} searchFields={["name"]} extraSummary={[{ label: "Jami qoldiq", value: onHand, hint: `${reserved} band qilingan` }, { label: "Kam qoldiq", value: low, hint: "E’tibor talab qiladi" }]} columns={[{ key: "name", label: "Ombor", render: (row) => <strong>{row.name}</strong> }, { key: "positions", label: "Pozitsiyalar" }, { key: "onHand", label: "Haqiqiy qoldiq" }, { key: "reserved", label: "Band qilingan" }, { key: "available", label: "Sotish mumkin" }]} />;
}

export function AgentsReportPage() {
  const db = useLocalDb();
  const rows = getOperationalAgents(db).map((agent) => ({ ...agent, conversion: agent.visitsToday ? Math.round((Number(agent.ordersToday || 0) / agent.visitsToday) * 100) : 0 }));
  const sales = rows.reduce((sum, item) => sum + Number(item.salesToday || 0), 0);
  return <SmartTablePage title="Agentlar hisoboti" description="Tashrif, buyurtma, konversiya va savdo natijalari." eyebrow="Hisobotlar" rows={rows} searchFields={["name", "territory"]} extraSummary={[{ label: "Jami savdo", value: formatMoney(sales), hint: "Agentlar bo‘yicha" }]} columns={[{ key: "name", label: "Agent", render: (row) => <strong>{row.name}</strong> }, { key: "territory", label: "Hudud" }, { key: "visitsToday", label: "Tashrif" }, { key: "ordersToday", label: "Buyurtma" }, { key: "conversion", label: "Konversiya", render: (row) => `${row.conversion}%` }, { key: "salesToday", label: "Savdo", render: (row) => <strong>{formatMoney(row.salesToday)}</strong> }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />;
}

export function DebtReportPage() {
  const db = useLocalDb();
  const rows = db.customers.map((customer) => ({ ...getCustomerDebtRow(db, customer), agent: getName(db.agents, customer.agentId, "—") })).filter((customer) => customer.debt > 0);
  const total = rows.reduce((sum, item) => sum + Number(item.debt || 0), 0);
  const overLimit = rows.filter((item) => item.debtStatus === "OVER_LIMIT").length;
  return <SmartTablePage title="Qarzdorlik hisoboti" description="Ochiq qarz, kredit limiti va riskdagi mijozlar." eyebrow="Hisobotlar" rows={rows} searchFields={["name", "agent", "debtStatus"]} extraSummary={[{ label: "Jami qarz", value: formatMoney(total), hint: `${rows.length} ta mijoz` }, { label: "Limitdan oshgan", value: overLimit, hint: "Yuqori risk" }]} columns={[{ key: "name", label: "Mijoz", render: (row) => <strong>{row.name}</strong> }, { key: "agent", label: "Agent" }, { key: "debt", label: "Qarz", render: (row) => <strong>{formatMoney(row.debt)}</strong> }, { key: "creditLimit", label: "Kredit limiti", render: (row) => formatMoney(row.creditLimit) }, { key: "overdue", label: "Muddati o‘tgan", render: (row) => formatMoney(row.overdue) }, { key: "remainingLimit", label: "Bo‘sh limit", render: (row) => formatMoney(row.remainingLimit) }, { key: "debtStatus", label: "Holat", render: (row) => <StatusPill status={row.debtStatus} /> }]} />;
}

export function DeliveryReportPage() {
  const db = useLocalDb();
  const rows = db.deliveries.map((delivery) => ({
    ...delivery,
    customer: getName(db.customers, delivery.customerId),
    order: db.orders.find((item) => item.id === delivery.orderId)?.number || "—",
    trip: db.deliveryTrips.find((item) => item.id === delivery.tripId)?.number || "—",
    statusLabel: getLabel(delivery.status),
  }));
  const delivered = rows.filter((item) => item.status === "DELIVERED").length;
  const failed = rows.filter((item) => item.status === "FAILED").length;
  const success = delivered + failed ? Math.round((delivered / (delivered + failed)) * 100) : 100;
  return <SmartTablePage title="Yetkazib berish hisoboti" description="Yetkazish holatlari, muvaffaqiyat ko‘rsatkichi va muammoli topshiriqlar." eyebrow="Hisobotlar" rows={rows} searchFields={["customer", "order", "trip", "statusLabel"]} extraSummary={[{ label: "Muvaffaqiyat", value: `${success}%`, hint: `${delivered} ta yakunlangan` }, { label: "Muammoli", value: failed, hint: "Tekshirish kerak" }]} columns={[{ key: "order", label: "Buyurtma", render: (row) => <strong>{row.order}</strong> }, { key: "customer", label: "Mijoz" }, { key: "trip", label: "Reys" }, { key: "total", label: "Summa", render: (row) => formatMoney(row.total) }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />;
}
