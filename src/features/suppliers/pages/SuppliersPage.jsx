import { Plus } from "lucide-react";
import { useState } from "react";

import { PERMISSIONS } from "../../../constants/permissions";
import { usePermissions } from "../../../hooks/usePermissions";
import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import ImageUploader from "../../../components/ui/ImageUploader";
import { createSupplier } from "../../../services/prototypeActions";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";

const emptyForm = { name: "", phone: "", contact: "", image: "" };

function SuppliersPage() {
  const suppliers = useLocalDb((db) => db.suppliers);
  const { can } = usePermissions();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const submit = async (event) => { event.preventDefault(); if (!form.name.trim()) return; const result = await createSupplier(form); notify(result.message, result.ok ? "success" : "danger"); if (result.ok) { setForm(emptyForm); setOpen(false); } };
  return <>
    <SmartTablePage title="Ta’minotchilar" description="Kirim va xarid jarayonlarida ishlatiladigan tashqi ta’minotchilar bazasi." eyebrow="Hamkorlar" rows={suppliers} searchFields={["name", "phone", "contact"]} actions={can(PERMISSIONS.CUSTOMERS_CREATE) ? <PrimaryButton onClick={() => { setForm(emptyForm); setOpen(true); }}><Plus size={15} /> Ta’minotchi</PrimaryButton> : null} columns={[
      { key: "name", label: "Nomi", render: (row) => <div className="qp-product-name-cell">{row.image ? <img src={row.image} alt=""/> : <span>{row.name.slice(0,1).toUpperCase()}</span>}<div><strong>{row.name}</strong><div className="qp-muted">{row.contact || "Aloqa shaxsi yo‘q"}</div></div></div> },
      { key: "phone", label: "Telefon" }, { key: "contact", label: "Aloqa shaxsi" }, { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
    ]} />
    <Modal open={open} title="Yangi ta’minotchi" onClose={() => setOpen(false)}>
      <form onSubmit={submit}><div className="qp-form-grid"><div className="qp-form-span-full"><ImageUploader purpose="other" value={form.image} name={form.name} label="Ta’minotchi logosi yoki rasmi" compact onChange={(image)=>setForm((current)=>({...current,image}))}/></div><Field label="Nomi"><input className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Telefon"><input className="qp-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field><Field label="Aloqa shaxsi"><input className="qp-input" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} /></Field></div><div className="qp-form-actions"><SecondaryButton type="button" onClick={() => { setForm(emptyForm); setOpen(false); }}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Saqlash</PrimaryButton></div></form>
    </Modal>
  </>;
}
export default SuppliersPage;
