import Select from "../../../components/ui/Select";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { approveTransfer, createTransfer } from "../../../services/prototypeActions";
import { getName } from "../../../utils/formatters";

const blankTracking = { productId: "", variantId: "", packageId: "", batchId: "", quantity: "", serialIds: [] };

function InventoryTransfersPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fromWarehouseId: db.warehouses[0]?.id || "",
    toWarehouseId: db.warehouses[1]?.id || db.warehouses[0]?.id || "",
    ...blankTracking,
  });

  const selectedProduct = db.products.find((item) => item.id === form.productId);
  const variants = (selectedProduct?.variants || []).filter((item) => item.status === "ACTIVE");
  const packages = (selectedProduct?.packages || []).filter((item) => item.status === "ACTIVE" && (!item.variantId || item.variantId === form.variantId));
  const selectedPackage = packages.find((item) => item.id === form.packageId);
  const conversionToBase = Number(selectedPackage?.conversionToBase || 1);
  const requiredBase = Math.max(0, Number(form.quantity || 0) * conversionToBase);
  const batches = useMemo(() => (selectedProduct?.batches || []).filter((item) => item.warehouseId === form.fromWarehouseId
    && (item.variantId || "") === (form.variantId || "") && Number(item.quantity || 0) - Number(item.reserved || 0) > 0),
  [form.fromWarehouseId, form.variantId, selectedProduct]);
  const serials = useMemo(() => (selectedProduct?.serials || []).filter((item) => item.warehouseId === form.fromWarehouseId
    && item.status === "AVAILABLE" && (item.variantId || "") === (form.variantId || "") && (!form.batchId || item.batchId === form.batchId)),
  [form.batchId, form.fromWarehouseId, form.variantId, selectedProduct]);

  const rows = db.transfers.map((item) => ({
    ...item,
    from: getName(db.warehouses, item.fromWarehouseId),
    to: getName(db.warehouses, item.toWarehouseId),
    product: getName(db.products, item.productId),
  }));

  const patchForm = (patch) => setForm((current) => ({ ...current, ...patch }));
  const changeProduct = (productId) => patchForm({ productId, variantId: "", packageId: "", batchId: "", serialIds: [] });
  const changeVariant = (variantId) => patchForm({ variantId, packageId: "", batchId: "", serialIds: [] });
  const toggleSerial = (id) => setForm((current) => ({ ...current, serialIds: current.serialIds.includes(id)
    ? current.serialIds.filter((value) => value !== id) : [...current.serialIds, id] }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.productId || Number(form.quantity) <= 0 || form.fromWarehouseId === form.toWarehouseId) {
      notify("Omborlar, mahsulot va miqdorni to‘g‘ri kiriting", "warning"); return;
    }
    if (variants.length && !form.variantId) { notify("Variantni tanlang", "warning"); return; }
    if ((selectedProduct?.trackLot || selectedProduct?.trackExpiry) && !form.batchId) { notify("Partiya / lotni tanlang", "warning"); return; }
    if (selectedProduct?.trackSerial && (!Number.isInteger(requiredBase) || form.serialIds.length !== requiredBase)) {
      notify(`Transfer uchun ${requiredBase || 0} ta serial / IMEI tanlang`, "warning"); return;
    }
    const result = await createTransfer(form);
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) { setOpen(false); setForm((current) => ({ ...current, ...blankTracking })); }
  };

  const approve = async (id) => {
    const result = await approveTransfer(id);
    notify(result.message, result.ok ? "success" : "danger");
  };

  return <>
    <SmartTablePage
      title="Omborlararo ko‘chirish"
      description="Base qoldiq bilan birga variant, partiya va serial/IMEI kuzatuvi ham manba ombordan qabul qiluvchi omborga ko‘chadi."
      eyebrow="Ombor"
      rows={rows}
      searchFields={["number", "from", "to", "product", "status"]}
      actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Ko‘chirish</PrimaryButton>}
      columns={[
        { key: "number", label: "Hujjat", render: (row) => <strong>{row.number}</strong> },
        { key: "product", label: "Mahsulot" }, { key: "from", label: "Manba" },
        { key: "arrow", label: "", sortable: false, render: () => <ArrowRight size={15} /> },
        { key: "to", label: "Qabul qiluvchi" }, { key: "quantity", label: "Miqdor" },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
        { key: "actions", label: "Amal", sortable: false, render: (row) => ["PENDING", "PENDING_APPROVAL"].includes(row.status)
          ? <PrimaryButton onClick={() => approve(row.id)}><CheckCircle2 size={14} /> Tasdiqlash</PrimaryButton>
          : <span className="qp-muted">Yakunlangan</span> },
      ]}
    />

    <Modal open={open} title="Yangi ko‘chirish" description="Tracked mahsulotlarda variant, lot va serial tanlovi qoldiq bilan birga ko‘chiriladi." onClose={() => setOpen(false)}>
      <form onSubmit={submit}>
        <div className="qp-form-grid">
          <Field label="Qayerdan"><Select value={form.fromWarehouseId} onChange={(event) => patchForm({ fromWarehouseId: event.target.value, batchId: "", serialIds: [] })}>{db.warehouses.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Qayerga"><Select value={form.toWarehouseId} onChange={(event) => patchForm({ toWarehouseId: event.target.value })}>{db.warehouses.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Mahsulot"><Select value={form.productId} onChange={(event) => changeProduct(event.target.value)}><option value="">Tanlang</option>{db.products.filter((item) => item.status === "ACTIVE").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
          {variants.length ? <Field label="Variant"><Select value={form.variantId} onChange={(event) => changeVariant(event.target.value)}><option value="">Tanlang</option>{variants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field> : null}
          {packages.length ? <Field label="Qadoq / birlik"><Select value={form.packageId} onChange={(event) => patchForm({ packageId: event.target.value, serialIds: [] })}><option value="">Base birlik</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name} · 1 = {Number(item.conversionToBase)} base</option>)}</Select></Field> : null}
          <Field label="Miqdor" hint={conversionToBase !== 1 ? `${requiredBase || 0} base birlik` : undefined}><input className="qp-input" type="number" min="0.001" step="0.001" value={form.quantity} onChange={(event) => patchForm({ quantity: event.target.value, serialIds: [] })} /></Field>
          {(selectedProduct?.trackLot || selectedProduct?.trackExpiry) ? <Field label="Partiya / lot"><Select value={form.batchId} onChange={(event) => patchForm({ batchId: event.target.value, serialIds: [] })}><option value="">Tanlang</option>{batches.map((item) => <option key={item.id} value={item.id}>{item.lotNumber} · {Number(item.quantity) - Number(item.reserved || 0)} mavjud{item.expiresAt ? ` · ${new Date(item.expiresAt).toLocaleDateString("uz-UZ")}` : ""}</option>)}</Select></Field> : null}
          {selectedProduct?.trackSerial ? <div className="qp-form-span-full"><Field label={`Serial / IMEI (${form.serialIds.length}/${Number.isFinite(requiredBase) ? requiredBase : 0})`}><div className="qp-selector-serials">{serials.map((item) => <label key={item.id}><input type="checkbox" checked={form.serialIds.includes(item.id)} onChange={() => toggleSerial(item.id)} /><span>{item.imei || item.serial}</span></label>)}</div></Field></div> : null}
        </div>
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{db.settings.inventory.requireTransferApproval ? "Tasdiqqa yuborish" : "Ko‘chirish"}</PrimaryButton></div>
      </form>
    </Modal>
  </>;
}

export default InventoryTransfersPage;
