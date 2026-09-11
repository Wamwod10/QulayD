import { Activity, Archive, Edit3, Eye, MapPin, Plus, Power, PowerOff, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { useAuth } from "../../../hooks/useAuth";
import { createEmployeeIdentity, updateEmployeeRecord } from "../../../services/employeeService";
import { makeId, updateLocalDb, useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatMoney } from "../../../utils/formatters";
import { getRoleLabel } from "../../../utils/labels";

const moduleOptions = [
  ["dashboard", "Bosh sahifa"], ["sales", "Savdo"], ["pos", "Tezkor kassa"], ["inventory", "Ombor"], ["partners", "Hamkorlar"],
  ["agents", "Agentlar"], ["routes", "Marshrutlar"], ["fulfillment", "Tayyorlash"], ["delivery", "Yetkazib berish"],
  ["finance", "Moliya"], ["reports", "Hisobotlar"],
];
const emptyForm = { name: "", title: "", phone: "", role: "SALES_AGENT", branch: "Bosh filial", warehouseId: "", territory: "", login: "", password: "", pin: "", moduleAccess: ["dashboard"] };

function makeEmployeeTypeCode() {
  return `CUSTOM_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function UsersPage() {
  const db = useLocalDb();
  const { company } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [editingType, setEditingType] = useState(null);

  const employeeTypes = useMemo(() => (db.employeeTypes || []).filter((item) => item.status !== "INACTIVE"), [db.employeeTypes]);
  const rows = useMemo(() => (db.users || [])
    .filter((item) => item.role !== "OWNER" && !item.roles?.includes("OWNER"))
    .map((item) => ({ ...item, roleLabel: db.employeeTypes?.find((type) => type.code === (item.role || item.roles?.[0]))?.name || getRoleLabel(item.role || item.roles?.[0] || "OTHER") })), [db.employeeTypes, db.users]);
  const active = rows.filter((item) => item.status === "ACTIVE").length;
  const agents = rows.filter((item) => (item.role || item.roles?.[0]) === "SALES_AGENT").length;
  const fieldTeam = rows.filter((item) => ["SALES_AGENT", "DELIVERY_DRIVER"].includes(item.role || item.roles?.[0])).length;

  const submit = async (event) => {
    event.preventDefault();
    try {
      await createEmployeeIdentity({ companyId: company?.id, ...form });
      setOpen(false);
      setForm(emptyForm);
      notify("Xodim qo‘shildi");
    } catch (error) {
      notify(error.message, "warning");
    }
  };

  const toggleStatus = (row) => {
    const next = row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    updateEmployeeRecord(row.id, { status: next });
    notify(next === "ACTIVE" ? "Xodim faollashtirildi" : "Xodim faolsizlantirildi", next === "ACTIVE" ? "success" : "warning");
  };

  const openTypeCreate = () => {
    setEditingType(null);
    setTypeName("");
    setTypeModalOpen(true);
  };

  const openTypeEdit = (type) => {
    if (type.system) return;
    setEditingType(type);
    setTypeName(type.name || "");
    setTypeModalOpen(true);
  };

  const saveEmployeeType = (event) => {
    event.preventDefault();
    const cleanName = typeName.trim();
    if (!cleanName) {
      notify("Xodim turi nomini kiriting", "warning");
      return;
    }
    const duplicate = (db.employeeTypes || []).some((item) => item.id !== editingType?.id && item.status !== "INACTIVE" && item.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (duplicate) {
      notify("Bu nomdagi xodim turi mavjud", "warning");
      return;
    }
    let savedCode = editingType?.code || "";
    updateLocalDb((draft) => {
      if (!Array.isArray(draft.employeeTypes)) draft.employeeTypes = [];
      if (editingType) {
        const target = draft.employeeTypes.find((item) => item.id === editingType.id);
        if (target && !target.system) target.name = cleanName;
      } else {
        savedCode = makeEmployeeTypeCode();
        draft.employeeTypes.push({ id: makeId("etype"), code: savedCode, name: cleanName, system: false, status: "ACTIVE", createdAt: new Date().toISOString() });
      }
    });
    if (!editingType) setForm((current) => ({ ...current, role: savedCode }));
    setTypeModalOpen(false);
    setTypeName("");
    notify(editingType ? "Xodim turi yangilandi" : "Yangi xodim turi qo‘shildi");
  };

  const archiveEmployeeType = (type) => {
    if (type.system) return;
    updateLocalDb((draft) => {
      const target = (draft.employeeTypes || []).find((item) => item.id === type.id);
      if (target) target.status = "INACTIVE";
    });
    if (form.role === type.code) setForm((current) => ({ ...current, role: "OTHER" }));
    notify("Xodim turi arxivlandi", "warning");
  };

  return <>
    <section className="qp-owner-team-summary">
      <div><span>Jamoa</span><h2>Xodimlar boshqaruvi</h2><p>Owner va Admin xodimning hisobini, ish turini va ko‘rinadigan modullarini boshqaradi.</p></div>
      <div className="qp-owner-team-stats"><article><UsersRound size={17}/><span>Jami</span><strong>{rows.length}</strong></article><article><Activity size={17}/><span>Faol</span><strong>{active}</strong></article><article><MapPin size={17}/><span>Dala jamoasi</span><strong>{fieldTeam}</strong></article><article><UsersRound size={17}/><span>Agentlar</span><strong>{agents}</strong></article></div>
    </section>
    <SmartTablePage title="Xodimlar" description="Agent, menejer, omborchi, haydovchi va boshqa xodimlarni bitta katalogdan boshqaring." eyebrow="Jamoa" rows={rows} searchFields={["name", "phone", "title", "roleLabel", "branch", "territory"]} extraSummary={[{label:"Jami xodim",value:rows.length,hint:"Kompaniya jamoasi"},{label:"Faol",value:active,hint:"Operatsiyalarda tanlash mumkin"},{label:"Agent",value:agents,hint:"Savdo xodimlari"},{label:"Faolsiz",value:rows.length-active,hint:"Tarix saqlanadi"}]} actions={<PrimaryButton onClick={() => { setForm(emptyForm); setOpen(true); }}><Plus size={15}/> Xodim qo‘shish</PrimaryButton>} columns={[
      { key:"name", label:"Xodim", render:(row)=><div className="qp-product-name-cell">{row.image ? <img src={row.image} alt="" /> : <span>{row.name.slice(0,1).toUpperCase()}</span>}<div><strong>{row.name}</strong><div className="qp-muted">{row.title}</div></div></div> },
      { key:"phone", label:"Telefon" },
      { key:"roleLabel", label:"Turi" },
      { key:"branch", label:"Filial" },
      { key:"territory", label:"Hudud", render:(row)=>row.territory || "—" },
      { key:"baseSalary", label:"Bazaviy oylik", render:(row)=><strong>{formatMoney(row.baseSalary || 0)}</strong> },
      { key:"status", label:"Holat", render:(row)=><StatusPill status={row.status || "ACTIVE"}/> },
    ]} detailRenderer={(row)=><div className="qp-stack">{row.image ? <img className="qp-product-detail-image" src={row.image} alt={row.name} /> : null}<div className="qp-drawer-details"><div className="qp-drawer-detail-row"><span>Telefon</span><strong>{row.phone || "—"}</strong></div><div className="qp-drawer-detail-row"><span>Lavozim</span><strong>{row.title}</strong></div><div className="qp-drawer-detail-row"><span>Turi</span><strong>{row.roleLabel}</strong></div><div className="qp-drawer-detail-row"><span>Filial</span><strong>{row.branch || "—"}</strong></div><div className="qp-drawer-detail-row"><span>Hudud</span><strong>{row.territory || "—"}</strong></div></div><div className="qp-inline-actions"><SecondaryButton onClick={()=>navigate(`/users/${row.id}`)}><Eye size={15}/> Profil</SecondaryButton><button type="button" className={`qp-button ${row.status === "ACTIVE" ? "qp-button-danger" : "qp-button-secondary"}`} onClick={()=>toggleStatus(row)}>{row.status === "ACTIVE" ? <><PowerOff size={15}/> Faolsizlantirish</> : <><Power size={15}/> Faollashtirish</>}</button></div></div>} />

    <Modal open={open} title="Yangi xodim" description="Xodim login va parol yoki shaxsiy PIN orqali Qulay platformasiga kiradi." wide onClose={()=>setOpen(false)}>
      <form onSubmit={submit}><div className="qp-form-grid">
        <Field label="Ism va familiya"><input className="qp-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} autoFocus/></Field>
        <Field label="Lavozim"><input className="qp-input" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="Masalan: Savdo agenti"/></Field>
        <Field label="Telefon"><input className="qp-input" inputMode="tel" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} placeholder="+998 90 123 45 67"/></Field>
        <Field label="Xodim turi" hint="Ro‘yxatda yo‘q bo‘lsa yangi tur yarating"><div className="qp-field-with-action"><Select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}>{employeeTypes.map((type)=><option key={type.code} value={type.code}>{type.name}</option>)}</Select><button type="button" className="qp-mini-action" onClick={openTypeCreate}><Plus size={14}/> Yangi tur</button></div></Field>
        <Field label="Filial"><input className="qp-input" value={form.branch} onChange={(e)=>setForm({...form,branch:e.target.value})}/></Field>
        <Field label="Ombor"><Select value={form.warehouseId} onChange={(e)=>setForm({...form,warehouseId:e.target.value})}><option value="">Biriktirilmagan</option>{db.warehouses.map((warehouse)=><option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</Select></Field>
        <Field label="Hudud"><input className="qp-input" value={form.territory} onChange={(e)=>setForm({...form,territory:e.target.value})} placeholder="Masalan: Chilonzor"/></Field>
        <Field label="Login"><input className="qp-input" autoComplete="off" value={form.login} onChange={(e)=>setForm({...form,login:e.target.value.replace(/\s/g, "")})}/></Field>
        <Field label="Parol"><input className="qp-input" type="password" autoComplete="new-password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/></Field>
        <Field label="PIN"><input className="qp-input" type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" value={form.pin} onChange={(e)=>setForm({...form,pin:e.target.value.replace(/\D/g, "").slice(0, 6)})} placeholder="6 ta raqam"/></Field>
        <div className="qp-form-span-full"><span className="qp-field-label">Modullar</span><div className="qp-module-selector">{moduleOptions.map(([key,label])=><label key={key}><input type="checkbox" checked={form.moduleAccess.includes(key)} onChange={(event)=>setForm((current)=>({...current,moduleAccess:event.target.checked?[...current.moduleAccess,key]:current.moduleAccess.filter((item)=>item!==key)}))}/><span>{label}</span></label>)}</div></div>
      </div><div className="qp-form-actions"><SecondaryButton type="button" onClick={()=>setOpen(false)}>Bekor qilish</SecondaryButton><SecondaryButton type="button" onClick={openTypeCreate}>Xodim turlarini boshqarish</SecondaryButton><PrimaryButton type="submit"><Plus size={15}/> Xodim qo‘shish</PrimaryButton></div></form>
    </Modal>

    <Modal open={typeModalOpen} title={editingType ? "Xodim turini tahrirlash" : "Xodim turi"} description="Custom xodim turlari kompaniyaning o‘ziga tegishli. Tizim turlari business logic uchun himoyalangan." onClose={()=>setTypeModalOpen(false)}>
      <form onSubmit={saveEmployeeType}>
        <Field label="Xodim turi nomi"><input className="qp-input" value={typeName} onChange={(event)=>setTypeName(event.target.value)} placeholder="Masalan: Merchandiser" autoFocus/></Field>
        {!editingType ? <div className="qp-employee-type-list">{(db.employeeTypes || []).map((type)=><div key={type.id} className={type.status === "INACTIVE" ? "archived" : ""}><div><strong>{type.name}</strong><span>{type.system ? "Tizim turi" : type.status === "INACTIVE" ? "Arxivlangan" : "Custom"}</span></div>{!type.system && type.status !== "INACTIVE" ? <div className="qp-inline-actions"><button type="button" className="qp-icon-button" title="Tahrirlash" onClick={()=>openTypeEdit(type)}><Edit3 size={14}/></button><button type="button" className="qp-icon-button" title="Arxivlash" onClick={()=>archiveEmployeeType(type)}><Archive size={14}/></button></div> : null}</div>)}</div> : null}
        <div className="qp-form-actions"><SecondaryButton type="button" onClick={()=>setTypeModalOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit">{editingType ? "Yangilash" : "Qo‘shish"}</PrimaryButton></div>
      </form>
    </Modal>
  </>;
}
export default UsersPage;
