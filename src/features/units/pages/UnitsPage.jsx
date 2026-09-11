import { Plus } from "lucide-react";
import { useState } from "react";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton } from "../../../components/prototype/PrototypeUI";
import { addLocalRecord, useLocalDb } from "../../../services/localDb";

function UnitsPage() {
  const units = useLocalDb((db) => db.units);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", shortName: "" });
  const submit = (event) => { event.preventDefault(); if (!form.name.trim()) return; addLocalRecord("units", { name: form.name.trim(), shortName: form.shortName.trim() || form.name.trim() }); setForm({ name: "", shortName: "" }); setOpen(false); };
  return <><SmartTablePage title="O‘lchov birliklari" description="Dona, quti, kg, litr va boshqa savdo birliklari." eyebrow="Katalog" rows={units} searchFields={["name", "shortName"]} actions={<PrimaryButton onClick={() => setOpen(true)}><Plus size={15} /> Birlik</PrimaryButton>} columns={[{ key: "name", label: "Nomi", render: (row) => <strong>{row.name}</strong> }, { key: "shortName", label: "Qisqa nom" }]} /><Modal open={open} title="Yangi o‘lchov birligi" onClose={() => setOpen(false)}><form onSubmit={submit}><div className="qp-form-grid"><Field label="Nomi"><input className="qp-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Qisqa nom"><input className="qp-input" value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} /></Field></div><div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Saqlash</PrimaryButton></div></form></Modal></>;
}
export default UnitsPage;
