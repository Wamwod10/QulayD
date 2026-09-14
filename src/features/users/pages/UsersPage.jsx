import { Activity, Archive, Edit3, Eye, LoaderCircle, MapPin, Plus, Power, PowerOff, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import SmartTablePage from "../../../components/prototype/SmartTablePage";
import { Field, Modal, PrimaryButton, SecondaryButton, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { EMPLOYEE_WORKSPACE_OPTIONS, EMPLOYEE_WORKSPACE_KEYS, suggestedWorkspaceForEmployeeType } from "../../../config/employeeWorkspaces";
import { useAuth } from "../../../hooks/useAuth";
import { createEmployeeIdentity, removeEmployeeRecord, updateEmployeeIdentity, updateEmployeeRecord } from "../../../services/employeeService";
import { useLocalDb } from "../../../services/localDb";
import { apiRequest } from "../../../services/authService";
import { notify } from "../../../services/notify";
import { formatMoney } from "../../../utils/formatters";
import { getRoleLabel } from "../../../utils/labels";

const businessModuleOptions = [
  ["dashboard", "Bosh sahifa"], ["sales", "Savdo"], ["pos", "Tezkor kassa"], ["inventory", "Ombor"], ["partners", "Hamkorlar"],
  ["agents", "Agentlar boshqaruvi"], ["routes", "Marshrutlar boshqaruvi"], ["fulfillment", "Tayyorlash boshqaruvi"], ["delivery", "Yetkazib berish boshqaruvi"],
  ["finance", "Moliya"], ["reports", "Hisobotlar"],
];

const emptyForm = {
  name: "", title: "", phone: "", role: "", branchId: "", warehouseId: "", territory: "",
  login: "", password: "", pin: "", moduleAccess: [], status: "ACTIVE",
};

function makeEmployeeTypeCode() {
  return `CUSTOM_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function UsersPage() {
  const db = useLocalDb();
  const { company } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [editingType, setEditingType] = useState(null);

  const employeeTypes = useMemo(() => (db.employeeTypes || []).filter((item) => item.status !== "INACTIVE"), [db.employeeTypes]);
  const branches = useMemo(() => Array.isArray(db.branches) ? db.branches : [], [db.branches]);
  const rows = useMemo(() => (db.users || [])
    .filter((item) => item.role !== "OWNER" && !item.roles?.includes("OWNER"))
    .map((item) => {
      const type = item.employeeType || db.employeeTypes?.find((row) => row.id === item.employeeTypeId);
      const branch = item.branch || branches.find((row) => row.id === item.branchId);
      return {
        ...item,
        role: type?.code || item.role || item.roles?.find((role) => !["EMPLOYEE", "ADMIN"].includes(role)) || "EMPLOYEE",
        roleLabel: type?.name || getRoleLabel(item.roles?.[0] || "EMPLOYEE"),
        branch: branch?.name || "—",
      };
    }), [branches, db.employeeTypes, db.users]);
  const active = rows.filter((item) => item.status === "ACTIVE").length;
  const agents = rows.filter((item) => ["SALES_AGENT", "AGENT"].includes(String(item.role).toUpperCase()) || item.modules?.includes("agent_workspace")).length;
  const fieldTeam = rows.filter((item) => item.modules?.some((module) => ["agent_workspace", "driver_workspace"].includes(module))).length;

  const openCreate = () => {
    const role = employeeTypes[0]?.code || "";
    const workspace = suggestedWorkspaceForEmployeeType(role);
    setEditingEmployee(null);
    setForm({ ...emptyForm, role, branchId: branches[0]?.id || "", moduleAccess: workspace ? [workspace] : [] });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditingEmployee(row);
    setForm({
      ...emptyForm,
      name: row.name || "", title: row.title || "", phone: row.phone || "", role: row.role || "",
      branchId: row.branchId || "", warehouseId: row.warehouseId || "", login: row.login || "",
      moduleAccess: Array.isArray(row.modules) ? row.modules : [], status: row.status || "ACTIVE",
    });
    setOpen(true);
  };

  const chooseEmployeeType = (code) => {
    setForm((current) => {
      const suggested = suggestedWorkspaceForEmployeeType(code);
      if (!suggested || current.moduleAccess.some((key) => EMPLOYEE_WORKSPACE_KEYS.includes(key))) return { ...current, role: code };
      return { ...current, role: code, moduleAccess: [suggested, ...current.moduleAccess] };
    });
  };

  const toggleModule = (key, checked) => setForm((current) => ({
    ...current,
    moduleAccess: checked ? [...new Set([...current.moduleAccess, key])] : current.moduleAccess.filter((item) => item !== key),
  }));

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (editingEmployee) await updateEmployeeIdentity(editingEmployee.id, form);
      else await createEmployeeIdentity({ companyId: company?.id, ...form });
      setOpen(false); setEditingEmployee(null); setForm(emptyForm);
      notify(editingEmployee ? "Xodim ma’lumotlari yangilandi" : "Xodim qo‘shildi");
    } catch (error) { notify(error.message, "warning"); }
    finally { setBusy(false); }
  };

  const toggleStatus = async (row) => {
    const next = row.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    try {
      await updateEmployeeRecord(row.id, { status: next });
      notify(next === "ACTIVE" ? "Xodim faollashtirildi" : "Xodim faolsizlantirildi", next === "ACTIVE" ? "success" : "warning");
    } catch (error) { notify(error.message, "danger"); }
  };

  const removeEmployee = async (row) => {
    if (!window.confirm(`“${row.name}” xodimini o‘chirasizmi? Tarixiy buyurtma, to‘lov va audit yozuvlari saqlanadi.`)) return;
    try { await removeEmployeeRecord(row.id); notify("Xodim arxivlandi va uning aktiv sessiyalari yopildi", "warning"); }
    catch (error) { notify(error.message, "danger"); }
  };

  const openTypeCreate = () => { setEditingType(null); setTypeName(""); setTypeModalOpen(true); };
  const openTypeEdit = (type) => { if (type.system) return; setEditingType(type); setTypeName(type.name || ""); setTypeModalOpen(true); };

  const saveEmployeeType = async (event) => {
    event.preventDefault();
    const cleanName = typeName.trim();
    if (!cleanName) { notify("Xodim turi nomini kiriting", "warning"); return; }
    const duplicate = (db.employeeTypes || []).some((item) => item.id !== editingType?.id && item.status !== "INACTIVE" && item.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (duplicate) { notify("Bu nomdagi xodim turi mavjud", "warning"); return; }
    const savedCode = editingType?.code || makeEmployeeTypeCode();
    await apiRequest({ url: editingType ? `/workforce/employee-types/${editingType.id}` : "/workforce/employee-types", method: editingType ? "PATCH" : "POST", body: { code: savedCode, name: cleanName, status: "ACTIVE" } });
    if (!editingType) chooseEmployeeType(savedCode);
    setTypeModalOpen(false); setTypeName("");
    notify(editingType ? "Xodim turi yangilandi" : "Yangi xodim turi qo‘shildi");
  };

  const archiveEmployeeType = async (type) => {
    if (type.system) return;
    await apiRequest({ url: `/workforce/employee-types/${type.id}`, method: "PATCH", body: { status: "INACTIVE" } });
    if (form.role === type.code) {
      const fallback = employeeTypes.find((item) => item.id !== type.id)?.code || "";
      chooseEmployeeType(fallback);
    }
    notify("Xodim turi arxivlandi", "warning");
  };

  return <>
    <section className="qp-owner-team-summary">
      <div><span>Jamoa</span><h2>Xodimlar boshqaruvi</h2><p>Owner va Admin xodim hisobini, ish turini, maxsus ish joyini va qo‘shimcha modullarini boshqaradi.</p></div>
      <div className="qp-owner-team-stats"><article><UsersRound size={17}/><span>Jami</span><strong>{rows.length}</strong></article><article><Activity size={17}/><span>Faol</span><strong>{active}</strong></article><article><MapPin size={17}/><span>Dala jamoasi</span><strong>{fieldTeam}</strong></article><article><UsersRound size={17}/><span>Agentlar</span><strong>{agents}</strong></article></div>
    </section>
    <SmartTablePage title="Xodimlar" description="Distribution jamoasi uchun maxsus ish modullari va qo‘shimcha ruxsatlarni bir joydan boshqaring." eyebrow="Jamoa" rows={rows} searchFields={["name", "phone", "title", "roleLabel", "branch"]} extraSummary={[{label:"Jami xodim",value:rows.length,hint:"Kompaniya jamoasi"},{label:"Faol",value:active,hint:"Operatsiyalarda tanlash mumkin"},{label:"Agent",value:agents,hint:"Savdo xodimlari"},{label:"Faolsiz",value:rows.length-active,hint:"Tarix saqlanadi"}]} actions={<PrimaryButton onClick={openCreate}><Plus size={15}/> Xodim qo‘shish</PrimaryButton>} columns={[
      { key:"name", label:"Xodim", render:(row)=><div className="qp-product-name-cell">{row.image ? <img src={row.image} alt="" /> : <span>{row.name.slice(0,1).toUpperCase()}</span>}<div><strong>{row.name}</strong><div className="qp-muted">{row.title}</div></div></div> },
      { key:"phone", label:"Telefon", render:(row)=>row.phone || "—" }, { key:"roleLabel", label:"Turi" }, { key:"branch", label:"Filial" },
      { key:"modules", label:"Ish joyi", render:(row)=>row.modules?.map((key)=>EMPLOYEE_WORKSPACE_OPTIONS.find(([id])=>id===key)?.[1]?.shortLabel).filter(Boolean).join(", ") || "Qo‘shimcha modul" },
      { key:"baseSalary", label:"Bazaviy oylik", render:(row)=><strong>{formatMoney(row.baseSalary || 0)}</strong> },
      { key:"status", label:"Holat", render:(row)=><StatusPill status={row.status || "ACTIVE"}/> },
    ]} detailRenderer={(row)=><div className="qp-stack">{row.image ? <img className="qp-product-detail-image" src={row.image} alt={row.name} /> : null}<div className="qp-drawer-details"><div className="qp-drawer-detail-row"><span>Telefon</span><strong>{row.phone || "—"}</strong></div><div className="qp-drawer-detail-row"><span>Login</span><strong>{row.login || "—"}</strong></div><div className="qp-drawer-detail-row"><span>Lavozim</span><strong>{row.title}</strong></div><div className="qp-drawer-detail-row"><span>Turi</span><strong>{row.roleLabel}</strong></div><div className="qp-drawer-detail-row"><span>Filial</span><strong>{row.branch || "—"}</strong></div><div className="qp-drawer-detail-row"><span>Modullar</span><strong>{row.modules?.length ? row.modules.length : 0}</strong></div></div><div className="qp-inline-actions"><SecondaryButton onClick={()=>navigate(`/users/${row.id}`)}><Eye size={15}/> Profil</SecondaryButton><SecondaryButton onClick={()=>openEdit(row)}><Edit3 size={15}/> Tahrirlash</SecondaryButton><button type="button" className={`qp-button ${row.status === "ACTIVE" ? "qp-button-danger" : "qp-button-secondary"}`} onClick={()=>toggleStatus(row)}>{row.status === "ACTIVE" ? <><PowerOff size={15}/> Faolsizlantirish</> : <><Power size={15}/> Faollashtirish</>}</button><button type="button" className="qp-button qp-button-danger" onClick={()=>removeEmployee(row)}><Trash2 size={15}/> O‘chirish</button></div></div>} />

    <Modal open={open} title={editingEmployee ? "Xodimni tahrirlash" : "Yangi xodim"} description="Xodimga distributiondagi aniq ish joyini va kerak bo‘lsa qo‘shimcha boshqaruv modullarini bering." wide onClose={()=>{ if (!busy) { setOpen(false); setEditingEmployee(null); } }}>
      <form onSubmit={submit} aria-busy={busy}><div className="qp-form-grid">
        <Field label="Ism va familiya"><input required className="qp-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} autoFocus/></Field>
        <Field label="Lavozim"><input required className="qp-input" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="Masalan: Savdo agenti"/></Field>
        <Field label="Telefon"><input className="qp-input" inputMode="tel" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} placeholder="+998 90 123 45 67"/></Field>
        <Field label="Xodim turi" hint="Ro‘yxatda yo‘q bo‘lsa yangi tur yarating"><div className="qp-field-with-action"><Select value={form.role} onChange={(e)=>chooseEmployeeType(e.target.value)}><option value="">Tanlang</option>{employeeTypes.map((type)=><option key={type.code} value={type.code}>{type.name}</option>)}</Select><button type="button" className="qp-mini-action" onClick={openTypeCreate}><Plus size={14}/> Yangi tur</button></div></Field>
        <Field label="Filial"><Select value={form.branchId} onChange={(e)=>setForm({...form,branchId:e.target.value})}><option value="">Biriktirilmagan</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</Select></Field>
        <Field label="Ombor"><Select value={form.warehouseId} onChange={(e)=>setForm({...form,warehouseId:e.target.value})}><option value="">Biriktirilmagan</option>{db.warehouses.map((warehouse)=><option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</Select></Field>
        <Field label="Login"><input className="qp-input" autoComplete="off" value={form.login} onChange={(e)=>setForm({...form,login:e.target.value.replace(/\s/g, "")})}/></Field>
        {!editingEmployee ? <Field label="Parol"><input required className="qp-input" type="password" autoComplete="new-password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})}/></Field> : null}
        <Field label={editingEmployee ? "Yangi PIN (ixtiyoriy)" : "PIN"}><input className="qp-input" type="password" inputMode="numeric" maxLength={8} autoComplete="new-password" value={form.pin} onChange={(e)=>setForm({...form,pin:e.target.value.replace(/\D/g, "").slice(0, 8)})} placeholder={editingEmployee ? "O‘zgartirmaslik uchun bo‘sh qoldiring" : "4–8 ta raqam"}/></Field>

        <div className="qp-form-span-full qp-employee-module-group"><div><span className="qp-field-label">Xodim ish modullari</span><small>Distributiondagi frontline xodimlar uchun soddalashtirilgan alohida ish joylari.</small></div><div className="qp-module-selector qp-workspace-selector">{EMPLOYEE_WORKSPACE_OPTIONS.map(([key,workspace])=><label key={key}><input type="checkbox" checked={form.moduleAccess.includes(key)} onChange={(event)=>toggleModule(key,event.target.checked)}/><span><strong>{workspace.label}</strong><small>{workspace.description}</small></span></label>)}</div></div>
        <div className="qp-form-span-full qp-employee-module-group"><div><span className="qp-field-label">Qo‘shimcha biznes modullari</span><small>Kerak bo‘lsa xodimga boshqaruv modullarini ham qo‘shing. Agent ish joyi “Agentlar” admin modulidan alohida.</small></div><div className="qp-module-selector">{businessModuleOptions.map(([key,label])=><label key={key}><input type="checkbox" checked={form.moduleAccess.includes(key)} onChange={(event)=>toggleModule(key,event.target.checked)}/><span>{label}</span></label>)}</div></div>
      </div><div className="qp-form-actions"><SecondaryButton type="button" disabled={busy} onClick={()=>setOpen(false)}>Bekor qilish</SecondaryButton><SecondaryButton type="button" disabled={busy} onClick={openTypeCreate}>Xodim turlarini boshqarish</SecondaryButton><PrimaryButton type="submit" disabled={busy}>{busy ? <><LoaderCircle className="qp-spin" size={15}/> Saqlanmoqda...</> : editingEmployee ? <><Edit3 size={15}/> Saqlash</> : <><Plus size={15}/> Xodim qo‘shish</>}</PrimaryButton></div></form>
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
