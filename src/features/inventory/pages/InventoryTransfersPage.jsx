import Select from "../../../components/ui/Select";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { approveTransfer, createTransfer } from "../../../services/prototypeActions";
import { getName } from "../../../utils/formatters";

function InventoryTransfersPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fromWarehouseId: db.warehouses[0]?.id || "",
    toWarehouseId: db.warehouses[1]?.id || db.warehouses[0]?.id || "",
    productId: "",
    quantity: "",
  });

  const rows = db.transfers.map((item) => ({
    ...item,
    from: getName(db.warehouses, item.fromWarehouseId),
    to: getName(db.warehouses, item.toWarehouseId),
    product: getName(db.products, item.productId),
  }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.productId || Number(form.quantity) <= 0 || form.fromWarehouseId === form.toWarehouseId) {
      notify("Omborlar, mahsulot va miqdorni to‘g‘ri kiriting", "warning");
      return;
    }
    const result = await createTransfer(form);
    notify(result.message, result.ok ? "success" : "danger");
    if (result.ok) setOpen(false);
  };

  const approve = async (id) => {
    const result = await approveTransfer(id);
    notify(result.message, result.ok ? "success" : "danger");
  };

  return (
    <>
      <SmartTablePage
        title="Omborlararo ko‘chirish"
        description="Tasdiq talab qilinsa mahsulot qoldig‘i faqat vakolatli tasdiqdan keyin o‘zgaradi."
        eyebrow="Ombor"
        rows={rows}
        searchFields={["number", "from", "to", "product", "status"]}
        actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Ko‘chirish</PrimaryButton>}
        columns={[
          { key: "number", label: "Hujjat", render: (row) => <strong>{row.number}</strong> },
          { key: "product", label: "Mahsulot" },
          { key: "from", label: "Manba" },
          { key: "arrow", label: "", sortable: false, render: () => <ArrowRight size={15} /> },
          { key: "to", label: "Qabul qiluvchi" },
          { key: "quantity", label: "Miqdor" },
          { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
          {
            key: "actions",
            label: "Amal",
            sortable: false,
            render: (row) => row.status === "PENDING"
              ? <PrimaryButton onClick={() => approve(row.id)}><CheckCircle2 size={14} /> Tasdiqlash</PrimaryButton>
              : <span className="qp-muted">Yakunlangan</span>,
          },
        ]}
      />

      <Modal open={open} title="Yangi ko‘chirish" description={db.settings.inventory.requireTransferApproval ? "Ko‘chirish tasdiqqa yuboriladi." : "Mahsulot darhol qabul qiluvchi omborga o‘tadi."} onClose={() => setOpen(false)}>
        <form onSubmit={submit}>
          <div className="qp-form-grid">
            <Field label="Qayerdan"><Select value={form.fromWarehouseId} onChange={(event) => setForm({ ...form, fromWarehouseId: event.target.value })}>{db.warehouses.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Qayerga"><Select value={form.toWarehouseId} onChange={(event) => setForm({ ...form, toWarehouseId: event.target.value })}>{db.warehouses.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Mahsulot"><Select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Tanlang</option>{db.products.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
            <Field label="Miqdor"><input className="qp-input" type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></Field>
          </div>
          <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{db.settings.inventory.requireTransferApproval ? "Tasdiqqa yuborish" : "Ko‘chirish"}</PrimaryButton></div>
        </form>
      </Modal>
    </>
  );
}

export default InventoryTransfersPage;
