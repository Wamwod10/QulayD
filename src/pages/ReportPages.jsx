import { ArrowUpRight, BarChart3, Boxes, CircleDollarSign, PackageSearch, ShoppingBag, Truck, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

import SmartTablePage from "../components/prototype/SmartTablePage";
import { Metric, PageShell, SectionCard, StatusPill } from "../components/prototype/PrototypeUI";
import { usePlatformFeatureFlag } from "../hooks/usePlatformSettings";
import { apiRequest } from "../services/authService";
import { formatMoney } from "../utils/formatters";

function useReport(name) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let active = true;
    apiRequest({ url: `/reports/${name}` }).then((result) => { if (active) setData(result); }).catch(() => { if (active) setData(null); });
    return () => { active = false; };
  }, [name]);
  return data;
}

const num = (value) => Number(value || 0);

function salesProductRows(report) {
  return (report?.topProducts || []).map((row) => ({
    id: row.productId,
    product: row.product?.name || "Mahsulot",
    quantity: num(row._sum?.quantity),
    amount: num(row._sum?.total),
  }));
}

export function ReportsOverviewPage() {
  const salesReport = useReport("sales");
  const inventoryReport = useReport("inventory");
  const debtReport = useReport("debt");
  const deliveryReport = useReport("delivery");
  const debtAgingEnabled = usePlatformFeatureFlag("debtAging", true);
  const sales = num(salesReport?.summary?._sum?.total);
  const debt = num(debtReport?.summary?.totalDebt);
  const stock = num(inventoryReport?.summary?.onHand);
  const reserved = num(inventoryReport?.summary?.reserved);
  const successRate = num(deliveryReport?.summary?.successRate || 100);
  const aging = debtReport?.summary?.aging || { d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };

  return (
    <PageShell title="Umumiy hisobot" description="Savdo, ombor, qarzdorlik va yetkazib berish bo‘yicha yagona qisqa tahlil." eyebrow="Hisobotlar">
      <div className="qp-metrics">
        <Metric label="Jami sotuv" value={formatMoney(sales)} icon={<WalletCards size={16} />} />
        <Metric label="Jami qarz" value={formatMoney(debt)} icon={<CircleDollarSign size={16} />} />
        <Metric label="Ombordagi birliklar" value={stock} hint={`${reserved} birlik band qilingan`} icon={<Boxes size={16} />} />
        <Metric label="Yetkazish muvaffaqiyati" value={`${successRate}%`} icon={<Truck size={16} />} />
      </div>
      <div className="qp-grid-2">
        <SectionCard title="Eng ko‘p sotilgan mahsulotlar" description="Backenddagi yakunlangan sotuvlar bo‘yicha">
          <div className="qp-ranking-list">
            {salesProductRows(salesReport).slice(0, 6).map((item, index) => (
              <div className="qp-ranking-row" key={item.id}><span>{index + 1}</span><div><strong>{item.product}</strong><small>{item.quantity} birlik</small></div><b>{formatMoney(item.amount)}</b></div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Operatsion holat" description="Hozir e’tibor berish kerak bo‘lgan oqimlar">
          <div className="qp-alert-list">
            <NavLink className="qp-alert-row qp-report-drill" to="/orders"><div><strong>{num(salesReport?.summary?.operational?.confirmedOrders)} ta tasdiqlangan buyurtma</strong><span>Tayyorlash va yetkazish oqimiga o‘tish</span></div><span><ShoppingBag size={16} /><ArrowUpRight size={13} /></span></NavLink>
            <NavLink className="qp-alert-row qp-report-drill" to="/inventory"><div><strong>{num(inventoryReport?.summary?.lowStock)} ta kam qoldiq</strong><span>Ombor qoldiqlarini tekshirish</span></div><span><PackageSearch size={16} /><ArrowUpRight size={13} /></span></NavLink>
            <NavLink className="qp-alert-row qp-report-drill" to="/debt"><div><strong>{num(debtReport?.summary?.debtorCount)} ta qarzdor mijoz</strong><span>{debtAgingEnabled ? `${formatMoney(debtReport?.summary?.totalOverdue)} muddati o‘tgan qarz` : "Moliya nazoratiga o‘tish"}</span></div><span><BarChart3 size={16} /><ArrowUpRight size={13} /></span></NavLink>
          </div>
        </SectionCard>
      </div>
      {debtAgingEnabled ? <SectionCard title="Qarzdorlik aging" description="Ochiq qarzlarni yoshiga qarab backend transactional ma’lumotidan kuzatish."><div className="qp-metrics"><Metric label="0–30 kun" value={formatMoney(aging.d0_30)} /><Metric label="31–60 kun" value={formatMoney(aging.d31_60)} /><Metric label="61–90 kun" value={formatMoney(aging.d61_90)} /><Metric label="90+ kun" value={formatMoney(aging.d90_plus)} /></div></SectionCard> : null}
    </PageShell>
  );
}

export function SalesReportPage() {
  const report = useReport("sales");
  const total = num(report?.summary?._sum?.total);
  const count = num(report?.summary?._count);
  const average = num(report?.summary?._avg?.total);
  const channel = new Map((report?.byChannel || []).map((row) => [row.channel, num(row._count)]));
  const rows = salesProductRows(report);
  return (
    <PageShell title="Savdo hisoboti" description="Backendda yakunlangan sotuvlar, savdo kanallari va mahsulot natijalari." eyebrow="Hisobotlar">
      <div className="qp-metrics">
        <Metric label="Savdo summasi" value={formatMoney(total)} icon={<WalletCards size={16} />} />
        <Metric label="Sotuvlar soni" value={count} icon={<ShoppingBag size={16} />} />
        <Metric label="O‘rtacha chek" value={formatMoney(average)} icon={<BarChart3 size={16} />} />
        <Metric label="Tezkor kassa / yetkazish" value={`${channel.get("POS") || 0} / ${channel.get("DELIVERY") || 0}`} icon={<Truck size={16} />} />
      </div>
      <SectionCard title="Mahsulotlar bo‘yicha natija">
        <div className="qp-table-wrap"><table className="qp-table"><thead><tr><th>Mahsulot</th><th>Sotilgan birlik</th><th>Hisoblangan summa</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.product}</strong></td><td>{row.quantity}</td><td><strong>{formatMoney(row.amount)}</strong></td></tr>)}</tbody></table></div>
      </SectionCard>
    </PageShell>
  );
}

export function InventoryReportPage() {
  const report = useReport("inventory");
  const grouped = new Map();
  for (const stock of report?.stocks || []) {
    const id = stock.warehouseId; const current = grouped.get(id) || { id, name: stock.warehouse?.name || "Ombor", positions: 0, onHand: 0, reserved: 0, available: 0 };
    const onHand = num(stock.onHand); const reserved = num(stock.reserved);
    if (onHand > 0) current.positions += 1; current.onHand += onHand; current.reserved += reserved; current.available += onHand - reserved; grouped.set(id, current);
  }
  const rows = [...grouped.values()];
  return <SmartTablePage title="Ombor hisoboti" description="Backend qoldig‘i bo‘yicha omborlar kesimida haqiqiy, band va sotish mumkin bo‘lgan birliklar." eyebrow="Hisobotlar" rows={rows} searchFields={["name"]} extraSummary={[{ label: "Jami qoldiq", value: num(report?.summary?.onHand), hint: `${num(report?.summary?.reserved)} band qilingan` }, { label: "Kam qoldiq", value: num(report?.summary?.lowStock), hint: "E’tibor talab qiladi" }]} columns={[{ key: "name", label: "Ombor", render: (row) => <strong>{row.name}</strong> }, { key: "positions", label: "Pozitsiyalar" }, { key: "onHand", label: "Haqiqiy qoldiq" }, { key: "reserved", label: "Band qilingan" }, { key: "available", label: "Sotish mumkin" }]} />;
}

export function AgentsReportPage() {
  const report = useReport("agents");
  const rows = report?.rows || [];
  return <SmartTablePage title="Agentlar hisoboti" description="Backenddagi tashrif, buyurtma, konversiya va yakunlangan savdo natijalari." eyebrow="Hisobotlar" rows={rows} searchFields={["name", "territory"]} extraSummary={[{ label: "Jami savdo", value: formatMoney(report?.summary?.sales), hint: "Agentlar bo‘yicha" }]} columns={[{ key: "name", label: "Agent", render: (row) => <strong>{row.name}</strong> }, { key: "territory", label: "Hudud" }, { key: "visits", label: "Tashrif" }, { key: "orders", label: "Buyurtma" }, { key: "conversion", label: "Konversiya", render: (row) => `${num(row.conversion)}%` }, { key: "sales", label: "Savdo", render: (row) => <strong>{formatMoney(row.sales)}</strong> }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />;
}

export function DebtReportPage() {
  const report = useReport("debt");
  const rows = (report?.rows || []).map((row) => ({ ...row, id: row.customerId, name: row.customer?.name || "Mijoz",
    agent: row.agentName || "—" }));
  return <SmartTablePage title="Qarzdorlik hisoboti" description="Backenddagi ochiq qarz, kredit limiti va riskdagi mijozlar." eyebrow="Hisobotlar" rows={rows} searchFields={["name", "agent", "debtStatus"]} extraSummary={[{ label: "Jami qarz", value: formatMoney(report?.summary?.totalDebt), hint: `${num(report?.summary?.debtorCount)} ta mijoz` }, { label: "Muddati o‘tgan", value: formatMoney(report?.summary?.totalOverdue), hint: "Nazorat talab qiladi" }]} columns={[{ key: "name", label: "Mijoz", render: (row) => <strong>{row.name}</strong> }, { key: "agent", label: "Agent" }, { key: "debt", label: "Qarz", render: (row) => <strong>{formatMoney(row.debt)}</strong> }, { key: "creditLimit", label: "Kredit limiti", render: (row) => formatMoney(row.creditLimit) }, { key: "overdue", label: "Muddati o‘tgan", render: (row) => formatMoney(row.overdue) }, { key: "remainingLimit", label: "Bo‘sh limit", render: (row) => formatMoney(row.remainingLimit) }, { key: "debtStatus", label: "Holat", render: (row) => <StatusPill status={row.debtStatus} /> }]} />;
}

export function DeliveryReportPage() {
  const report = useReport("delivery");
  const rows = (report?.rows || []).map((row) => ({ ...row, id: row.id, customer: row.customerName, order: row.orderNumber, trip: row.tripNumber }));
  return <SmartTablePage title="Yetkazib berish hisoboti" description="Backenddagi yetkazish holatlari, muvaffaqiyat ko‘rsatkichi va muammoli topshiriqlar." eyebrow="Hisobotlar" rows={rows} searchFields={["customer", "order", "trip", "status"]} extraSummary={[{ label: "Muvaffaqiyat", value: `${num(report?.summary?.successRate || 100)}%`, hint: `${num(report?.summary?.delivered)} ta yakunlangan` }, { label: "Muammoli", value: num(report?.summary?.failed), hint: `${num(report?.summary?.partial)} ta qisman` }]} columns={[{ key: "order", label: "Buyurtma", render: (row) => <strong>{row.order}</strong> }, { key: "customer", label: "Mijoz" }, { key: "trip", label: "Reys" }, { key: "driverName", label: "Haydovchi" }, { key: "total", label: "Summa", render: (row) => formatMoney(row.total) }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />;
}
