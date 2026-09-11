import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { formatMoney, getName, shortDate } from "../../../utils/formatters";
import { getLabel } from "../../../utils/labels";

function SalesPage() {
  const db = useLocalDb();
  const rows = db.sales.map((item) => ({ ...item, customer: item.customerId ? getName(db.customers, item.customerId) : "Anonim mijoz", warehouse: getName(db.warehouses, item.warehouseId), channelLabel: getLabel(item.channel) }));
  return <SmartTablePage title="Sotuvlar" description="Faqat haqiqatan amalga oshgan savdolar. Buyurtma yaratishning o‘zi sotuv hisoblanmaydi." eyebrow="Savdo" rows={rows} searchFields={["number", "customer", "channelLabel", "paymentStatus"]} columns={[{ key: "number", label: "Sotuv", render: (row) => <strong>{row.number}</strong> }, { key: "date", label: "Sana", render: (row) => shortDate(row.date) }, { key: "channelLabel", label: "Savdo kanali" }, { key: "customer", label: "Mijoz" }, { key: "warehouse", label: "Ombor" }, { key: "total", label: "Summa", render: (row) => <strong>{formatMoney(row.total)}</strong> }, { key: "paymentStatus", label: "To‘lov", render: (row) => <StatusPill status={row.paymentStatus} /> }]} />;
}
export default SalesPage;
