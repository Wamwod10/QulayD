import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { getName } from "../../../utils/formatters";

function InventoryPage() {
  const db = useLocalDb();
  const rows = db.balances.map((balance) => {
    const product = db.products.find((item) => item.id === balance.productId);
    const available = balance.onHand - balance.reserved;
    return { ...balance, productName: product?.name || "—", sku: product?.sku || "—", warehouse: getName(db.warehouses, balance.warehouseId), available, minStock: product?.minStock || 0, stockStatus: available <= 0 ? "OUT_OF_STOCK" : available <= (product?.minStock || 0) ? "LOW_STOCK" : "OK" };
  });
  return <SmartTablePage title="Ombor qoldiqlari" description="Haqiqiy qoldiq, band qilingan va hozir sotish mumkin bo‘lgan miqdor." eyebrow="Ombor" rows={rows} searchFields={["productName", "sku", "warehouse"]} columns={[{ key: "productName", label: "Mahsulot", render: (row) => <div><strong>{row.productName}</strong><div className="qp-muted">SKU {row.sku}</div></div> }, { key: "warehouse", label: "Ombor" }, { key: "onHand", label: "Haqiqiy qoldiq" }, { key: "reserved", label: "Band qilingan" }, { key: "available", label: "Sotish mumkin", render: (row) => <strong>{row.available}</strong> }, { key: "stockStatus", label: "Holat", render: (row) => <StatusPill status={row.stockStatus} /> }]} />;
}
export default InventoryPage;
