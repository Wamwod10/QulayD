import { Copy, Plus } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { addLocalRecord, updateLocalRecord, useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { getLabel } from "../../../utils/labels";
import { priceListCustomerCount, normalizePriceList } from "../priceUtils";

const initialForm = { name: "", type: "CUSTOM", basePrice: "WHOLESALE", adjustmentPercent: 0, priority: 10, validFrom: "", validTo: "", status: "ACTIVE" };

function PriceListsPage() {
  const db = useLocalDb();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);
  const rows = (db.priceLists || []).map((item) => ({ ...normalizePriceList(item), customers: priceListCustomerCount(db, item.id) }));

  const startCreate = () => { setEditingId(""); setForm(initialForm); setOpen(true); };
  const startEdit = (row) => { setEditingId(row.id); setForm({ ...initialForm, ...row }); setOpen(true); };
  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) { notify("Narx ro‘yxati nomini kiriting", "warning"); return; }
    const payload = { ...form, name: form.name.trim(), adjustmentPercent: Number(form.adjustmentPercent || 0), priority: Number(form.priority || 0) };
    if (editingId) updateLocalRecord("priceLists", editingId, payload);
    else addLocalRecord("priceLists", payload);
    notify(editingId ? "Narx ro‘yxati yangilandi" : "Narx ro‘yxati yaratildi");
    setOpen(false);
  };
  const duplicate = (row) => {
    const payload = { ...row };
    delete payload.id;
    delete payload.customers;
    addLocalRecord("priceLists", { ...payload, name: `${row.name} nusxa`, status: "ACTIVE" });
    notify("Narx ro‘yxati nusxalandi");
  };

  return <>
    <SmartTablePage title="Narx ro‘yxatlari" description="Sotuv narxi, tannarx, VIP va maxsus mijozlar uchun narx siyosatini boshqaring. Mijoz tanlanganda tegishli narx buyurtmada avtomatik ishlaydi." eyebrow="Sozlamalar" rows={rows} searchFields={["name", "type", "status"]} actions={<PrimaryButton onClick={startCreate}><Plus size={15}/> Narx ro‘yxati</PrimaryButton>} columns={[
      { key: "name", label: "Nomi", render: (row) => <div><strong>{row.name}</strong><span className="qp-muted">{getLabel(row.type)}</span></div> },
      { key: "basePrice", label: "Asos", render: (row) => row.basePrice === "RETAIL" ? "Sotuv narxi" : "Tannarx" },
      { key: "adjustmentPercent", label: "O‘zgarish", render: (row) => `${Number(row.adjustmentPercent || 0) > 0 ? "+" : ""}${row.adjustmentPercent || 0}%` },
      { key: "customers", label: "Mijozlar", render: (row) => `${row.customers} ta` },
      { key: "priority", label: "Ustuvorlik" },
      { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status}/> },
      { key: "actions", label: "Amal", sortable: false, render: (row) => <div className="qp-inline-actions"><SecondaryButton onClick={() => startEdit(row)}>Tahrirlash</SecondaryButton><button type="button" className="qp-icon-button" title="Nusxalash" onClick={() => duplicate(row)}><Copy size={14}/></button></div> },
    ]}/>
    <Modal open={open} title={editingId ? "Narx ro‘yxatini tahrirlash" : "Yangi narx ro‘yxati"} description="Narx mahsulotning sotuv narxi yoki tannarxidan foiz orqali hisoblanadi." onClose={() => setOpen(false)} wide>
      <form onSubmit={submit}><div className="qp-form-grid">
        <Field label="Nomi"><input className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/></Field>
        <Field label="Turi"><Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="RETAIL">Sotuv narxi</option><option value="WHOLESALE">Tannarx</option><option value="VIP">VIP</option><option value="PROMO">Aksiya</option><option value="CUSTOM">Maxsus</option></Select></Field>
        <Field label="Narx asosi"><Select value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: event.target.value })}><option value="RETAIL">Sotuv narxi</option><option value="WHOLESALE">Tannarx</option></Select></Field>
        <Field label="Foizli o‘zgarish" hint="Masalan -5 = 5% chegirma, 10 = 10% ustama"><input className="qp-input" type="number" step="0.1" value={form.adjustmentPercent} onChange={(event) => setForm({ ...form, adjustmentPercent: event.target.value })}/></Field>
        <Field label="Ustuvorlik"><input className="qp-input" type="number" min="0" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}/></Field>
        <Field label="Holat"><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">Faol</option><option value="INACTIVE">Faolsiz</option></Select></Field>
        <Field label="Amal boshlanishi"><input className="qp-input" type="date" value={form.validFrom} onChange={(event) => setForm({ ...form, validFrom: event.target.value })}/></Field>
        <Field label="Amal tugashi"><input className="qp-input" type="date" value={form.validTo} onChange={(event) => setForm({ ...form, validTo: event.target.value })}/></Field>
      </div><div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Saqlash</PrimaryButton></div></form>
    </Modal>
  </>;
}
export default PriceListsPage;
