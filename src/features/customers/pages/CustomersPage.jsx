import { MapPin, MessageCircle, Phone, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import LocationPicker from "../../../components/maps/LocationPicker";
import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import ImageUploader from "../../../components/ui/ImageUploader";
import Select from "../../../components/ui/Select";
import { createCustomer } from "../../../services/prototypeActions";
import { getOperationalAgents } from "../../../services/employeeSelectors";
import { useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatMoney, getName } from "../../../utils/formatters";

const emptyForm = { name: "", image: "", customerType: "ORGANIZATION", taxId: "", category: "", phone: "", address: "", latitude: null, longitude: null, territory: "", priceListId: "pl-retail", agentId: "", creditLimit: "" };

function CustomersPage() {
  const db = useLocalDb();
  const operationalAgents = getOperationalAgents(db);
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const rows = db.customers.map((item) => ({ ...item, agent: getName(db.agents, item.agentId, "Biriktirilmagan"), priceList: getName(db.priceLists, item.priceListId) }));
  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) { notify("Mijoz nomini kiriting", "warning"); return; }
    if (form.phone.trim() && db.customers.some((customer) => customer.phone === form.phone.trim())) { notify("Bu telefon raqamli mijoz mavjud", "warning"); return; }
    createCustomer(form);
    notify("Mijoz qo‘shildi");
    setOpen(false);
    setForm(emptyForm);
  };

  const phoneDigits = (value) => String(value || "").replace(/\D/g, "");

  return <>
    <SmartTablePage
      title="Mijozlar"
      description="Savdo, tezkor kassa, agentlar va moliya foydalanadigan yagona mijoz bazasi."
      eyebrow="Hamkorlar"
      rows={rows}
      searchFields={["name", "phone", "address", "territory", "agent", "taxId", "category"]}
      actions={<PrimaryButton onClick={() => { setForm(emptyForm); setOpen(true); }}><Plus size={15} /> Yangi mijoz</PrimaryButton>}
      detailTitle={(row) => row.name}
      detailDescription={(row) => row.address || row.phone || "Mijoz tafsilotlari"}
      detailRenderer={(row) => <div className="qp-stack">
        {row.image ? <img className="qp-product-detail-image" src={row.image} alt={row.name}/> : null}
        <div className="qp-drawer-details">
          <div className="qp-drawer-detail-row"><span>Turi</span><strong>{row.customerType === "PERSON" ? "Jismoniy shaxs" : "Tashkilot"}</strong></div>
          <div className="qp-drawer-detail-row"><span>Telefon</span><strong>{row.phone || "—"}</strong></div>
          <div className="qp-drawer-detail-row"><span>STIR</span><strong>{row.taxId || "—"}</strong></div>
          <div className="qp-drawer-detail-row"><span>Manzil</span><strong>{row.address || "—"}</strong></div>
          <div className="qp-drawer-detail-row"><span>Narx ro‘yxati</span><strong>{row.priceList}</strong></div>
          <div className="qp-drawer-detail-row"><span>Kredit limiti</span><strong>{formatMoney(row.creditLimit || 0)}</strong></div>
          <div className="qp-drawer-detail-row"><span>Qarz</span><strong>{formatMoney(row.debt || 0)}</strong></div>
        </div>
        <div className="qp-inline-actions">
          {row.phone ? <a className="qp-button qp-button-secondary" href={`tel:${row.phone}`}><Phone size={15}/> Qo‘ng‘iroq</a> : null}
          {row.phone ? <a className="qp-button qp-button-secondary" href={`https://wa.me/${phoneDigits(row.phone)}`} target="_blank" rel="noreferrer"><MessageCircle size={15}/> WhatsApp</a> : null}
          {row.latitude && row.longitude ? <a className="qp-button qp-button-secondary" href={`https://yandex.com/maps/?pt=${row.longitude},${row.latitude}&z=16&l=map`} target="_blank" rel="noreferrer"><MapPin size={15}/> Xaritada</a> : null}
        </div>
      </div>}
      columns={[
        { key: "name", label: "Mijoz", render: (row) => <div className="qp-product-name-cell">{row.image ? <img src={row.image} alt=""/> : <span>{row.name.slice(0,1).toUpperCase()}</span>}<div><strong>{row.name}</strong><div className="qp-muted">{row.phone || "Telefon yo‘q"}</div></div></div> },
        { key: "territory", label: "Hudud" },
        { key: "agent", label: "Agent" },
        { key: "priceList", label: "Narx ro‘yxati" },
        { key: "debt", label: "Qarz", render: (row) => <strong>{formatMoney(row.debt)}</strong> },
        { key: "status", label: "Holat", render: (row) => <StatusPill status={row.status} /> },
      ]}
    />
    <Modal open={open} title="Yangi mijoz" onClose={() => setOpen(false)} wide>
      <form onSubmit={submit}>
        <div className="qp-form-grid">
          <div className="qp-form-span-full"><ImageUploader value={form.image} name={form.name} label="Mijoz yoki savdo nuqtasi rasmi" compact onChange={(image)=>setForm((current)=>({...current,image}))}/></div>
          <Field label="Nomi"><input className="qp-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="Mijoz turi"><Select value={form.customerType} onChange={(event)=>setForm({...form,customerType:event.target.value})}><option value="ORGANIZATION">Tashkilot</option><option value="PERSON">Jismoniy shaxs</option></Select></Field>
          <Field label="Telefon"><input className="qp-input" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></Field>
          <Field label="STIR / rekvizit"><input className="qp-input" value={form.taxId} onChange={(event)=>setForm({...form,taxId:event.target.value})} placeholder="Ixtiyoriy"/></Field>
          <Field label="Mijoz kategoriyasi"><input className="qp-input" value={form.category} onChange={(event)=>setForm({...form,category:event.target.value})} placeholder="Masalan: A / VIP / Retail"/></Field>
          <Field label="Hudud"><input className="qp-input" value={form.territory} onChange={(event) => setForm({ ...form, territory: event.target.value })} /></Field>
          <div className="qp-form-span-full"><LocationPicker value={form} onChange={(location) => setForm({ ...form, ...location })} /></div>
          <Field label="Agent"><Select value={form.agentId} onChange={(event) => setForm({ ...form, agentId: event.target.value })}><option value="">Biriktirilmagan</option>{operationalAgents.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Narx ro‘yxati"><Select value={form.priceListId} onChange={(event) => setForm({ ...form, priceListId: event.target.value })}>{db.priceLists.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
          <Field label="Kredit limiti"><input className="qp-input" type="number" min="0" value={form.creditLimit} onChange={(event) => setForm({ ...form, creditLimit: event.target.value })} /></Field>
        </div>
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={() => setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">Saqlash</PrimaryButton></div>
      </form>
    </Modal>
  </>;
}
export default CustomersPage;
