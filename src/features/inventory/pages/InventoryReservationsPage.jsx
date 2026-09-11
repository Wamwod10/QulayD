import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { getName } from "../../../utils/formatters";

function InventoryReservationsPage() {
  const db = useLocalDb();
  const rows = db.reservations.map((item) => ({ ...item, product: getName(db.products, item.productId), warehouse: getName(db.warehouses, item.warehouseId), order: db.orders.find((order) => order.id === item.orderId)?.number || "—" }));
  return <SmartTablePage title="Band qilingan mahsulotlar" description="Buyurtmalar uchun vaqtincha band qilingan mahsulotlar." eyebrow="Ombor" rows={rows} searchFields={["product", "warehouse", "order", "status"]} columns={[{ key: "order", label: "Buyurtma", render: (row) => <strong>{row.order}</strong> }, { key: "product", label: "Mahsulot" }, { key: "warehouse", label: "Ombor" }, { key: "quantity", label: "Miqdor" }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />;
}
export default InventoryReservationsPage;
