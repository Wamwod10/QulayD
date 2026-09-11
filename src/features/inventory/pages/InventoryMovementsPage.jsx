import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { useLocalDb } from "../../../services/localDb";
import { formatDateTime, getName } from "../../../utils/formatters";
import { getMovementSourceLabel, getMovementTypeLabel } from "../../../utils/labels";

function InventoryMovementsPage() {
  const db = useLocalDb();
  const rows = db.movements.map((item) => ({ ...item, product: getName(db.products, item.productId), warehouse: getName(db.warehouses, item.warehouseId), typeLabel: getMovementTypeLabel(item.type), source: getMovementSourceLabel(item.type, item.reference) }));
  return <SmartTablePage title="Ombor harakatlari" description="Qoldiqni o‘zgartirgan barcha kirim va chiqimlarning yagona tarixi." eyebrow="Ombor" rows={rows} searchFields={["typeLabel", "product", "warehouse", "reference"]} columns={[{ key: "date", label: "Sana", render: (row) => formatDateTime(row.date) }, { key: "typeLabel", label: "Turi", render: (row) => <strong>{row.typeLabel}</strong> }, { key: "product", label: "Mahsulot" }, { key: "warehouse", label: "Ombor" }, { key: "quantity", label: "Miqdor", render: (row) => <strong className={row.quantity >= 0 ? "qp-value-positive" : "qp-value-negative"}>{row.quantity > 0 ? `+${row.quantity}` : row.quantity}</strong> }, { key: "source", label: "Sabab / Amal", render: (row) => <div><strong>{row.source.action}</strong>{row.source.reference ? <div className="qp-muted">{row.source.reference}</div> : null}</div> }]} />;
}
export default InventoryMovementsPage;
