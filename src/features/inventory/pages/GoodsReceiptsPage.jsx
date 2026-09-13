import Select from "../../../components/ui/Select";
import { Plus } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { createGoodsReceipt } from "../../../services/prototypeActions";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatMoney, getName, shortDate } from "../../../utils/formatters";

function GoodsReceiptsPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplierId: "", warehouseId: db.warehouses[0]?.id || "", productId: "", quantity: "", cost: "" });
  const rows = db.goodsReceipts.map((item) => ({ ...item, supplier: getName(db.suppliers, item.supplierId), warehouse: getName(db.warehouses, item.warehouseId) }));
  const submit = async (event) => { event.preventDefault(); if (!form.supplierId || !form.warehouseId || !form.productId || Number(form.quantity) <= 0) return; const result = await createGoodsReceipt({ supplierId: form.supplierId, warehouseId: form.warehouseId, items: [{ productId: form.productId, quantity: form.quantity, cost: form.cost }] }); notify(result.message, result.ok ? "success" : "danger"); if (result.ok) { setOpen(false); setForm({ supplierId: "", warehouseId: db.warehouses[0]?.id || "", productId: "", quantity: "", cost: "" }); } };
  return <><SmartTablePage title="Mahsulot kirimi" description="Yetkazib beruvchidan kelgan mahsulot qabul qilingandan keyin qoldiq oshadi." eyebrow="Ombor" rows={rows} searchFields={["number", "supplier", "warehouse"]} actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Yangi kirim</PrimaryButton>} columns={[{ key: "number", label: "Hujjat", render: (row) => <strong>{row.number}</strong> }, { key: "date", label: "Sana", render: (row) => shortDate(row.date) }, { key: "supplier", label: "Yetkazib beruvchi" }, { key: "warehouse", label: "Ombor" }, { key: "total", label: "Summa", render: (row) => formatMoney(row.total) }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} /><Modal open={open} title="Yangi kirim" onClose={() => setOpen(false)} wide><form onSubmit={submit}><div className="qp-form-grid"><Field label="Yetkazib beruvchi"><Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}><option value="">Tanlang</option>{db.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Ombor"><Select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>{db.warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Mahsulot"><Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}><option value="">Tanlang</option>{db.products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field><Field label="Miqdor"><input className="qp-input" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field><Field label="Tannarx"><input className="qp-input" type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field></div><div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Qabul qilish</PrimaryButton></div></form></Modal></>;
}
export default GoodsReceiptsPage;
