import { Edit3, Plus } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { addLocalRecord, updateLocalDb, useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";

const emptyForm = { name: "", type: "COUNT", shortName: "", precision: "0", status: "ACTIVE" };

function UnitsPage() {
  const units = useLocalDb((db) => db.units);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const openCreate = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (unit) => { setEditing(unit); setForm({ name: unit.name || "", type: unit.type || "COUNT", shortName: unit.shortName || "", precision: String(unit.precision ?? 0), status: unit.status || "ACTIVE" }); setOpen(true); };
  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.type) { notify("Nomi va turini kiriting", "warning"); return; }
    const payload = { name: form.name.trim(), type: form.type, shortName: form.shortName.trim(), precision: Math.max(0, Math.min(6, Number(form.precision) || 0)), status: form.status };
    if (editing) updateLocalDb((db) => { const target = db.units.find((item) => item.id === editing.id); if (target) Object.assign(target, payload); });
    else addLocalRecord("units", payload);
    setOpen(false);
    notify(editing ? "O‘lchov birligi yangilandi" : "O‘lchov birligi yaratildi");
  };
  return <>
    <SmartTablePage title="O‘lchov birliklari" description="Dona, vazn, hajm va boshqa savdo birliklari." eyebrow="Sozlamalar" rows={units} searchFields={["name", "shortName", "type"]} actions={<PrimaryButton onClick={openCreate}><Plus size={15} /> Birlik</PrimaryButton>} columns={[
      { key: "name", label: "Nomi", render: (row) => <strong>{row.name}</strong> }, { key: "type", label: "Tur" },
      { key: "shortName", label: "Qisqa nom", render: (row) => row.shortName || "—" }, { key: "precision", label: "Aniqlik", render: (row) => `${row.precision ?? 0} ta raqam` },
      { key: "status", label: "Faolligi", render: (row) => <StatusPill status={row.status || "ACTIVE"} /> },
      { key: "actions", label: "Amal", sortable: false, render: (row) => <button type="button" className="qp-icon-button" onClick={() => openEdit(row)} aria-label="Tahrirlash"><Edit3 size={15} /></button> },
    ]} />
    <Modal open={open} title={editing ? "O‘lchov birligini tahrirlash" : "Yangi o‘lchov birligi"} onClose={() => setOpen(false)}>
      <form onSubmit={submit}><div className="qp-form-grid">
        <Field label="Nomi"><input required className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="Tur"><Select required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="COUNT">Dona</option><option value="WEIGHT">Vazn</option><option value="VOLUME">Hajm</option><option value="LENGTH">Uzunlik</option><option value="TIME">Vaqt</option></Select></Field>
        <Field label="Qisqa nom"><input className="qp-input" value={form.shortName} onChange={(event) => setForm({ ...form, shortName: event.target.value })} /></Field>
        <Field label="Nuqtadan keyingi raqamlar soni"><input className="qp-input" type="number" min="0" max="6" value={form.precision} onChange={(event) => setForm({ ...form, precision: event.target.value })} /></Field>
        <Field label="Faolligi"><Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="ACTIVE">Faol</option><option value="INACTIVE">Faol emas</option></Select></Field>
      </div><div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Saqlash</PrimaryButton></div></form>
    </Modal>
  </>;
}

export default UnitsPage;
