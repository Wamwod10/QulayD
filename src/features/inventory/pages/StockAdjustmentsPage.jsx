import Select from "../../../components/ui/Select";
import { CheckCircle2, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { approveStockAdjustment, createStockAdjustment } from "../../../services/prototypeActions";
import { getName } from "../../../utils/formatters";

const emptyTracking = { productId: "", variantId: "", packageId: "", batchId: "", quantity: "", unitCost: "", serialIds: [], serialNumbers: "", lotNumber: "", manufacturedAt: "", expiresAt: "" };

function StockAdjustmentsPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ warehouseId: db.warehouses[0]?.id || "", reason: "Yo‘qotish / topilma", ...emptyTracking });
  const selectedProduct = db.products.find((item) => item.id === form.productId);
  const variants = (selectedProduct?.variants || []).filter((item) => item.status === "ACTIVE");
  const packages = (selectedProduct?.packages || []).filter((item) => item.status === "ACTIVE" && (!item.variantId || item.variantId === form.variantId));
  const selectedPackage = packages.find((item) => item.id === form.packageId);
  const conversionToBase = Number(selectedPackage?.conversionToBase || 1);
  const baseQuantity = Number(form.quantity || 0) * conversionToBase;
  const outgoing = baseQuantity < 0;
  const absoluteBase = Math.abs(baseQuantity);
  const batches = useMemo(() => (selectedProduct?.batches || []).filter((item) => item.warehouseId === form.warehouseId
    && (item.variantId || "") === (form.variantId || "") && Number(item.quantity || 0) - Number(item.reserved || 0) > 0),
  [form.variantId, form.warehouseId, selectedProduct]);
  const serials = useMemo(() => (selectedProduct?.serials || []).filter((item) => item.warehouseId === form.warehouseId
    && item.status === "AVAILABLE" && (item.variantId || "") === (form.variantId || "") && (!form.batchId || item.batchId === form.batchId)),
  [form.batchId, form.variantId, form.warehouseId, selectedProduct]);

  const rows = db.adjustments.map((item) => ({ ...item, product: getName(db.products, item.productId), warehouse: getName(db.warehouses, item.warehouseId) }));
  const patchForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const changeProduct = (productId) => patchForm({ productId, variantId: "", packageId: "", batchId: "", serialIds: [], serialNumbers: "", lotNumber: "", manufacturedAt: "", expiresAt: "" });
  const changeVariant = (variantId) => patchForm({ variantId, packageId: "", batchId: "", serialIds: [] });
  const toggleSerial = (id) => setForm((current) => ({ ...current, serialIds: current.serialIds.includes(id)
    ? current.serialIds.filter((value) => value !== id) : [...current.serialIds, id] }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.productId || !Number(form.quantity)) { notify("Mahsulot va miqdorni kiriting", "warning"); return; }
    if (variants.length && !form.variantId) { notify("Variantni tanlang", "warning"); return; }
    if ((selectedProduct?.trackLot || selectedProduct?.trackExpiry) && outgoing && !form.batchId) { notify("Chiqim uchun partiya / lotni tanlang", "warning"); return; }
    if ((selectedProduct?.trackLot || selectedProduct?.trackExpiry) && !outgoing && !form.lotNumber.trim()) { notify("Kirim uchun lot/partiya raqamini kiriting", "warning"); return; }
    if (selectedProduct?.trackExpiry && !outgoing && !form.expiresAt) { notify("Yaroqlilik muddatini kiriting", "warning"); return; }
    if (selectedProduct?.trackSerial) {
      if (!Number.isInteger(absoluteBase)) { notify("Serial mahsulot base miqdori butun son bo‘lishi kerak", "warning"); return; }
      if (outgoing && form.serialIds.length !== absoluteBase) { notify(`Chiqim uchun ${absoluteBase} ta serial / IMEI tanlang`, "warning"); return; }
      const entered = form.serialNumbers.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean);
      if (!outgoing && entered.length !== absoluteBase) { notify(`Kirim uchun ${absoluteBase} ta yangi serial / IMEI kiriting`, "warning"); return; }
    }
    const result = await createStockAdjustment(form);
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) { setOpen(false); setForm((current) => ({ warehouseId: current.warehouseId, reason: current.reason, ...emptyTracking })); }
  };

  const approve = async (id) => { const result = await approveStockAdjustment(id); notify(result.message, result.ok ? "success" : "danger"); };

  return <>
    <SmartTablePage
      title="Qoldiq tuzatish"
      description="Sinish, yo‘qotish va topilma canonical qoldiq bilan birga variant, lot va serial trackingni ham yangilaydi."
      eyebrow="Ombor" rows={rows} searchFields={["number", "product", "warehouse", "reason", "status"]}
      actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Tuzatish</PrimaryButton>}
      columns={[
        { key: "number", label: "Hujjat", render: (row) => <strong>{row.number}</strong> }, { key: "product", label: "Mahsulot" },
        { key: "warehouse", label: "Ombor" }, { key: "quantity", label: "Miqdor" }, { key: "reason", label: "Sabab" },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
        { key: "actions", label: "Amal", sortable: false, render: (row) => ["PENDING", "PENDING_APPROVAL"].includes(row.status)
          ? <PrimaryButton onClick={() => approve(row.id)}><CheckCircle2 size={14} /> Tasdiqlash</PrimaryButton> : <span className="qp-muted">Yakunlangan</span> },
      ]}
    />

    <Modal open={open} title="Qoldiq tuzatish" description="Tracked mahsulotda kirim uchun yangi tracking ma’lumoti, chiqim uchun esa mavjud lot/serial tanlanadi." onClose={() => setOpen(false)}>
      <form onSubmit={submit}>
        <div className="qp-form-grid">
          <Field label="Ombor"><Select value={form.warehouseId} onChange={(event) => patchForm({ warehouseId: event.target.value, batchId: "", serialIds: [] })}>{db.warehouses.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Mahsulot"><Select value={form.productId} onChange={(event) => changeProduct(event.target.value)}><option value="">Tanlang</option>{db.products.filter((item) => item.status === "ACTIVE").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
          {variants.length ? <Field label="Variant"><Select value={form.variantId} onChange={(event) => changeVariant(event.target.value)}><option value="">Tanlang</option>{variants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field> : null}
          {packages.length ? <Field label="Qadoq / birlik"><Select value={form.packageId} onChange={(event) => patchForm({ packageId: event.target.value, serialIds: [], serialNumbers: "" })}><option value="">Base birlik</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name} · 1 = {Number(item.conversionToBase)} base</option>)}</Select></Field> : null}
          <Field label="Miqdor (+/-)" hint={conversionToBase !== 1 ? `${baseQuantity || 0} base birlik` : undefined}><input className="qp-input" type="number" step="0.001" value={form.quantity} onChange={(event) => patchForm({ quantity: event.target.value, serialIds: [], serialNumbers: "" })} /></Field>
          <Field label="Sabab"><input className="qp-input" value={form.reason} onChange={(event) => patchForm({ reason: event.target.value })} /></Field>
          {Number(form.quantity) > 0 ? <Field label="Tannarx (ixtiyoriy)"><input className="qp-input" type="number" min="0" step="0.01" value={form.unitCost} onChange={(event) => patchForm({ unitCost: event.target.value })}/></Field> : null}

          {(selectedProduct?.trackLot || selectedProduct?.trackExpiry) && outgoing ? <Field label="Partiya / lot"><Select value={form.batchId} onChange={(event) => patchForm({ batchId: event.target.value, serialIds: [] })}><option value="">Tanlang</option>{batches.map((item) => <option key={item.id} value={item.id}>{item.lotNumber} · {Number(item.quantity) - Number(item.reserved || 0)} mavjud</option>)}</Select></Field> : null}
          {(selectedProduct?.trackLot || selectedProduct?.trackExpiry) && !outgoing && Number(form.quantity) > 0 ? <>
            <Field label="Lot / partiya raqami"><input className="qp-input" value={form.lotNumber} onChange={(event) => patchForm({ lotNumber: event.target.value })}/></Field>
            <Field label="Ishlab chiqarilgan sana"><input className="qp-input" type="date" value={form.manufacturedAt} onChange={(event) => patchForm({ manufacturedAt: event.target.value })}/></Field>
            <Field label="Yaroqlilik muddati"><input className="qp-input" type="date" value={form.expiresAt} onChange={(event) => patchForm({ expiresAt: event.target.value })}/></Field>
          </> : null}
          {selectedProduct?.trackSerial && outgoing ? <div className="qp-form-span-full"><Field label={`Serial / IMEI (${form.serialIds.length}/${Number.isFinite(absoluteBase) ? absoluteBase : 0})`}><div className="qp-selector-serials">{serials.map((item) => <label key={item.id}><input type="checkbox" checked={form.serialIds.includes(item.id)} onChange={() => toggleSerial(item.id)} /><span>{item.imei || item.serial}</span></label>)}</div></Field></div> : null}
          {selectedProduct?.trackSerial && !outgoing && Number(form.quantity) > 0 ? <div className="qp-form-span-full"><Field label={`Yangi Serial / IMEI (${Number.isFinite(absoluteBase) ? absoluteBase : 0} dona)`}><textarea className="qp-input" rows="5" value={form.serialNumbers} onChange={(event) => patchForm({ serialNumbers: event.target.value })} placeholder="Har qatorda bitta serial yoki IMEI" /></Field></div> : null}
        </div>
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{db.settings.inventory.requireAdjustmentApproval ? "Tasdiqqa yuborish" : "Tasdiqlash"}</PrimaryButton></div>
      </form>
    </Modal>
  </>;
}

export default StockAdjustmentsPage;
