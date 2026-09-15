import Select from "../../../components/ui/Select";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { createGoodsReceipt } from "../../../services/prototypeActions";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatMoney, getName, shortDate } from "../../../utils/formatters";

const blankForm = (warehouseId = "") => ({ supplierId: "", warehouseId, productId: "", variantId: "", packageId: "", quantity: "", cost: "",
  lotNumber: "", manufacturedAt: "", expiresAt: "", serialNumbers: "" });

function GoodsReceiptsPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => blankForm(db.warehouses[0]?.id || ""));
  const rows = db.goodsReceipts.map((item) => ({ ...item, supplier: getName(db.suppliers, item.supplierId), warehouse: getName(db.warehouses, item.warehouseId) }));
  const product = db.products.find((item) => item.id === form.productId);
  const variants = useMemo(() => (product?.variants || []).filter((item) => item.status !== "INACTIVE"), [product]);
  const packages = useMemo(() => (product?.packages || []).filter((item) => item.status !== "INACTIVE" && (!item.variantId || item.variantId === form.variantId)), [product, form.variantId]);
  const selectedPackage = packages.find((item) => item.id === form.packageId);
  const conversionToBase = Number(selectedPackage?.conversionToBase || 1);
  const baseQuantity = Math.round((Number(form.quantity) || 0) * conversionToBase * 1000) / 1000;
  const serialCount = form.serialNumbers.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean).length;

  const setProduct = (productId) => setForm((current) => ({ ...current, productId, variantId: "", packageId: "", lotNumber: "", manufacturedAt: "", expiresAt: "", serialNumbers: "" }));
  const setVariant = (variantId) => setForm((current) => ({ ...current, variantId, packageId: "" }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.supplierId || !form.warehouseId || !form.productId || Number(form.quantity) <= 0) return notify("Yetkazib beruvchi, ombor, mahsulot va miqdorni kiriting", "warning");
    if (variants.length && !form.variantId) return notify("Variantli mahsulot uchun variantni tanlang", "warning");
    if ((product?.trackLot || product?.trackExpiry) && !form.lotNumber.trim()) return notify("Lot/expiry kuzatuvi uchun lot/partiya raqami majburiy", "warning");
    if (product?.trackExpiry && !form.expiresAt) return notify("Bu mahsulot uchun yaroqlilik muddati majburiy", "warning");
    if (product?.trackSerial && (!Number.isInteger(baseQuantity) || serialCount !== baseQuantity)) return notify(`Serial/IMEI soni base miqdorga teng bo‘lishi kerak (${baseQuantity})`, "warning");
    const result = await createGoodsReceipt({ supplierId: form.supplierId, warehouseId: form.warehouseId, items: [{ ...form, quantity: Number(form.quantity), unitCost: Number(form.cost || 0) }] });
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) { setOpen(false); setForm(blankForm(db.warehouses[0]?.id || "")); }
  };

  return <>
    <SmartTablePage title="Mahsulot kirimi" description="Yetkazib beruvchidan kelgan mahsulot qabul qilinganda qoldiq base unitda oshadi; variant, qadoq, lot, expiry va serial kuzatuvi saqlanadi." eyebrow="Ombor" rows={rows}
      searchFields={["number", "supplier", "warehouse"]} actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Yangi kirim</PrimaryButton>}
      columns={[{ key: "number", label: "Hujjat", render: (row) => <strong>{row.number}</strong> }, { key: "date", label: "Sana", render: (row) => shortDate(row.date || row.createdAt) },
        { key: "supplier", label: "Yetkazib beruvchi" }, { key: "warehouse", label: "Ombor" }, { key: "total", label: "Summa", render: (row) => formatMoney(row.total) },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> }]} />
    <Modal open={open} title="Yangi kirim" description="Mahsulotning tracking sozlamalariga mos kirim yaratiladi va darhol tasdiqlanadi." onClose={() => setOpen(false)} wide>
      <form onSubmit={submit}>
        <div className="qp-form-grid">
          <Field label="Yetkazib beruvchi"><Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}><option value="">Tanlang</option>{db.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Ombor"><Select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>{db.warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Mahsulot"><Select value={form.productId} onChange={(e) => setProduct(e.target.value)}><option value="">Tanlang</option>{db.products.filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
          {variants.length ? <Field label="Variant"><Select value={form.variantId} onChange={(e) => setVariant(e.target.value)}><option value="">Variantni tanlang</option>{variants.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>)}</Select></Field> : null}
          {packages.length ? <Field label="Qadoq"><Select value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}><option value="">Base unit</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name} · 1 = {Number(item.conversionToBase)} base</option>)}</Select></Field> : null}
          <Field label="Miqdor" hint={form.packageId ? `${baseQuantity} base unit kirim bo‘ladi` : undefined}><input className="qp-input" type="number" min="0.001" step="0.001" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
          <Field label={form.packageId ? "Qadoq tannarxi" : "Tannarx"}><input className="qp-input" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
          {product?.trackLot || product?.trackExpiry ? <Field label="Lot / partiya"><input className="qp-input" value={form.lotNumber} onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} required /></Field> : null}
          {product?.trackExpiry || product?.trackLot ? <Field label="Ishlab chiqarilgan sana"><input className="qp-input" type="date" value={form.manufacturedAt} onChange={(e) => setForm({ ...form, manufacturedAt: e.target.value })} /></Field> : null}
          {product?.trackExpiry ? <Field label="Yaroqlilik muddati"><input className="qp-input" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} required /></Field> : null}
          {product?.trackSerial ? <Field label="Serial / IMEI" hint={`Har qatorga bitta. Hozir ${serialCount}/${baseQuantity || 0}.`}><textarea className="qp-input" rows="5" placeholder="356938035643809\n356938035643817" value={form.serialNumbers} onChange={(e) => setForm({ ...form, serialNumbers: e.target.value })} /></Field> : null}
        </div>
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Qabul qilish</PrimaryButton></div>
      </form>
    </Modal>
  </>;
}
export default GoodsReceiptsPage;
