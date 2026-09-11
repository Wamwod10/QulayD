import Select from "../../../components/ui/Select";
import { CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { approveStockAdjustment, createStockAdjustment } from "../../../services/prototypeActions";
import { getName } from "../../../utils/formatters";

function StockAdjustmentsPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ warehouseId: db.warehouses[0]?.id || "", productId: "", quantity: "", reason: "Yo‘qotish / topilma" });

  const rows = db.adjustments.map((item) => ({
    ...item,
    product: getName(db.products, item.productId),
    warehouse: getName(db.warehouses, item.warehouseId),
  }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.productId || !Number(form.quantity)) {
      notify("Mahsulot va miqdorni kiriting", "warning");
      return;
    }
    const result = createStockAdjustment(form);
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) setOpen(false);
  };

  const approve = (id) => {
    const result = approveStockAdjustment(id);
    notify(result.message, result.ok ? "success" : "danger");
  };

  return (
    <>
      <SmartTablePage
        title="Qoldiq tuzatish"
        description="Sinish, yo‘qotish, topilma va boshqa vakolatli qoldiq tuzatishlari audit bilan yuritiladi."
        eyebrow="Ombor"
        rows={rows}
        searchFields={["number", "product", "warehouse", "reason", "status"]}
        actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Tuzatish</PrimaryButton>}
        columns={[
          { key: "number", label: "Hujjat", render: (row) => <strong>{row.number}</strong> },
          { key: "product", label: "Mahsulot" },
          { key: "warehouse", label: "Ombor" },
          { key: "quantity", label: "Miqdor" },
          { key: "reason", label: "Sabab" },
          { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
          { key: "actions", label: "Amal", sortable: false, render: (row) => row.status === "PENDING" ? <PrimaryButton onClick={() => approve(row.id)}><CheckCircle2 size={14} /> Tasdiqlash</PrimaryButton> : <span className="qp-muted">Yakunlangan</span> },
        ]}
      />

      <Modal open={open} title="Qoldiq tuzatish" description={db.settings.inventory.requireAdjustmentApproval ? "Yozuv avval tasdiq kutadi; qoldiq darhol o‘zgarmaydi." : "Musbat miqdor oshiradi, manfiy miqdor kamaytiradi."} onClose={() => setOpen(false)}>
        <form onSubmit={submit}>
          <div className="qp-form-grid">
            <Field label="Ombor"><Select value={form.warehouseId} onChange={(event) => setForm({ ...form, warehouseId: event.target.value })}>{db.warehouses.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Mahsulot"><Select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Tanlang</option>{db.products.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Miqdor (+/-)"><input className="qp-input" type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></Field>
            <Field label="Sabab"><input className="qp-input" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></Field>
          </div>
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{db.settings.inventory.requireAdjustmentApproval ? "Tasdiqqa yuborish" : "Tasdiqlash"}</PrimaryButton></div>
        </form>
      </Modal>
    </>
  );
}

export default StockAdjustmentsPage;
