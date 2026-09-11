import { Activity, AlertTriangle, BarChart3, Blocks, Building2, CheckCircle2, CircleHelp, CreditCard, Database, Globe2, HardDrive, Languages, Megaphone, PlugZap, Server, ShieldCheck, UsersRound } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";

import Checkbox from "../../../components/ui/Checkbox";
import Select from "../../../components/ui/Select";
import {
  PLATFORM_MODULE_KEYS,
  addPlatformBroadcast,
  getAuthDirectory,
  getEffectiveCompanyModules,
  getPlatformSettings,
  getUserSessions,
  revokeUserSessions,
  resetAuthUserPassword,
  setCompanyModuleEnabled,
  setAuthUserStatus,
  setGlobalModuleEnabled,
  setModulePlans,
  subscribeAuth,
  updateCompany,
  updatePlanConfig,
  updatePlatformSettings,
  addSupportTicket,
  updateSupportTicket,
} from "../../../services/authService";
import { notify } from "../../../services/notify";
import { formatDateTime } from "../../../utils/formatters";
import { getLabel, getRoleLabel } from "../../../utils/labels";

let cachedRaw = "";
let cachedDirectory = getAuthDirectory();
function getDirectorySnapshot() {
  const raw = JSON.stringify(getAuthDirectory());
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedDirectory = JSON.parse(raw);
  }
  return cachedDirectory;
}
function useDirectory() { return useSyncExternalStore(subscribeAuth, getDirectorySnapshot, getDirectorySnapshot); }
function readCompanyDb(companyId) {
  if (typeof window === "undefined" || !companyId) return null;
  try {
    const raw = window.localStorage.getItem(`qulay.prototype.db.v5.company.${companyId}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}


const planLabel = (value) => ({ TRIAL: "Sinov", PRO: "Kengaytirilgan", FREE: "Bepul", STANDARD: "Standart", ENTERPRISE: "Korporativ" }[value] || value);
const companyStatusLabel = (value) => ({ ACTIVE: "Faol", BLOCKED: "Bloklangan", INACTIVE: "Faolsiz" }[value] || value);
const audienceLabel = (value) => ({ ALL: "Barcha foydalanuvchilar", OWNERS: "Faqat biznes egalari", TRIAL: "Sinov tarifidagi kompaniyalar" }[value] || "Tanlangan auditoriya");
const supportStatusLabel = (value) => ({ OPEN: "Ochiq", RESOLVED: "Yopilgan" }[value] || value);
const auditTypeLabel = (value) => ({ MODULE_GLOBAL: "Global modul o‘zgartirildi", MODULE_COMPANY: "Kompaniya moduli o‘zgartirildi", PLAN_UPDATED: "Tarif yangilandi", MODULE_PLANS: "Modul tariflari yangilandi" }[value] || getLabel(value));
const featureFlagMeta = {
  workforceMap: ["Xodimlar xaritasi", "Agent va haydovchilarni operatsion xaritada ko‘rsatish"],
  debtAging: ["Qarzdorlik aging tahlili", "Qarzlarni 0–30, 31–60, 61–90 va 90+ kun kesimida tahlil qilish"],
  platformBroadcasts: ["Platforma e’lonlari", "Super Admin e’lonlarini kompaniya va foydalanuvchilarga yetkazish"],
};
const moduleMeta = {
  sales: ["Savdo", "Buyurtmalar va sotuvlar"], pos: ["Tezkor kassa", "POS savdolari"], catalog: ["Katalog", "Mahsulot, kategoriya va narxlar"], inventory: ["Ombor", "Qoldiq va ombor operatsiyalari"], partners: ["Hamkorlar", "Mijoz va yetkazib beruvchilar"], agents: ["Agentlar", "Dala savdo jamoasi"], routes: ["Marshrutlar", "Xarita va route rejalari"], fulfillment: ["Tayyorlash", "Yig‘ish va qadoqlash"], delivery: ["Yetkazib berish", "Reys va haydovchilar"], finance: ["Moliya", "Faktura, to‘lov va qarz"], reports: ["Hisobotlar", "Modullararo analitika"],
};

const sectionMeta = {
  dashboard: ["Qulay boshqaruv markazi", "Platforma, kompaniyalar va tizim holatini kuzating."],
  companies: ["Kompaniyalar", "Har bir biznesning obunasi, modullari va foydalanuvchilarini 360° nazorat qiling."],
  users: ["Foydalanuvchilar", "Owner va Admin platforma hisoblarini, sessiyalarini va xavfsizligini boshqaring."],
  plans: ["Tariflar va obunalar", "Tarif, sinov muddati va kompaniya limitlarini boshqaring."],
  modules: ["Modullar", "Modulni butun platforma yoki alohida kompaniya uchun yoqing va o‘chiring."],
  translations: ["Tarjimalar", "O‘zbek, rus, tojik va qozoq tillari holatini nazorat qiling."],
  notifications: ["Umumiy bildirishnomalar", "Platforma e’lonlarini kerakli auditoriyaga yuboring."],
  security: ["Audit va xavfsizlik", "Hisoblar, bloklashlar, platforma amallari va xavfsizlik signallari."],
  analytics: ["Platforma analitikasi", "Kompaniyalar, foydalanish hajmi va asosiy operatsion ko‘rsatkichlarni kuzating."],
  integrations: ["Integratsiyalar", "Yandex, valyuta, bildirishnoma va kelajak providerlari holatini boshqaring."],
  support: ["Support markazi", "Kompaniya murojaatlari va support ishlarini boshqaring."],
  health: ["Tizim holati", "Interfeys, xarita, valyuta manbalari va mahalliy ma’lumot qatlamini kuzating."],
  settings: ["Umumiy sozlamalar", "Registratsiya, maintenance, sinov muddati va beta funksiyalar."],
};

function Header({ section }) {
  const [title, description] = sectionMeta[section] || sectionMeta.dashboard;
  return <div className="qp-super-head"><div><span>Platforma administratori</span><h1>{title}</h1><p>{description}</p></div><div className="qp-super-live"><i /> Tizim faol</div></div>;
}

function Dashboard({ directory }) {
  const activeCompanies = directory.companies.filter((company) => company.status === "ACTIVE").length;
  const businessUsers = directory.users.filter((user) => !user.roles?.includes("SUPER_ADMIN"));
  const moduleSettings = directory.platformSettings?.modules || {};
  const activeModules = Object.values(moduleSettings).filter((item) => item.enabled !== false).length;
  return <>
    <div className="qp-super-kpis">
      <div><Building2 /><span>Kompaniyalar</span><strong>{directory.companies.length}</strong><small>{activeCompanies} faol</small></div>
      <div><UsersRound /><span>Foydalanuvchilar</span><strong>{businessUsers.length}</strong><small>{businessUsers.filter((user) => user.status === "ACTIVE").length} faol</small></div>
      <div><Blocks /><span>Faol modullar</span><strong>{activeModules}/{PLATFORM_MODULE_KEYS.length}</strong><small>Umumiy ro‘yxat</small></div>
      <div><CreditCard /><span>Sinov / Kengaytirilgan</span><strong>{directory.companies.filter((company) => company.plan === "TRIAL").length} / {directory.companies.filter((company) => company.plan === "PRO").length}</strong><small>Obuna holati</small></div>
    </div>
    <div className="qp-super-dashboard-grid">
      <section className="qp-super-card"><div className="qp-super-card-head"><div><span>Kompaniya 360°</span><h2>So‘nggi kompaniyalar</h2></div></div><div className="qp-super-company-list">{directory.companies.slice(-6).reverse().map((company) => <div key={company.id}><span>{company.name.slice(0, 1)}</span><div><strong>{company.name}</strong><small>{planLabel(company.plan)} • {companyStatusLabel(company.status)}</small></div><b>{directory.users.filter((user) => user.companyId === company.id).length} foydalanuvchi</b></div>)}</div></section>
      <section className="qp-super-card"><div className="qp-super-card-head"><div><span>Platforma holati</span><h2>Tezkor nazorat</h2></div></div><div className="qp-super-health-list"><div><CheckCircle2/><span><strong>Registratsiya</strong><small>{directory.platformSettings?.signupEnabled === false ? "Yopiq" : "Ochiq"}</small></span></div><div><Activity/><span><strong>Texnik xizmat</strong><small>{directory.platformSettings?.maintenanceMode ? "Yoqilgan" : "O‘chirilgan"}</small></span></div><div><Languages/><span><strong>Tillar</strong><small>UZ · RU · TJ · KZ</small></span></div><div><ShieldCheck/><span><strong>Platforma auditi</strong><small>{directory.platformSettings?.audit?.length || 0} amal</small></span></div></div></section>
    </div>
  </>;
}

function Companies({ directory }) {
  const [selectedId, setSelectedId] = useState(directory.companies[0]?.id || "");
  const company = directory.companies.find((item) => item.id === selectedId) || directory.companies[0];
  const companyLoginUsers = directory.users.filter((user) => user.companyId === company?.id);
  const companyDb = company ? readCompanyDb(company.id) : null;
  const companyEmployees = (companyDb?.users || []).filter((item) => !(item.roles || []).includes("OWNER") && item.role !== "OWNER");
  const effectiveModules = company ? getEffectiveCompanyModules(company.id) : {};
  const extendTrial = () => {
    if (!company) return;
    const current = company.trialEndsAt ? new Date(company.trialEndsAt).getTime() : Date.now();
    updateCompany(company.id, { trialEndsAt: new Date(Math.max(current, Date.now()) + 14 * 86400000).toISOString() });
    notify("Sinov muddati 14 kunga uzaytirildi");
  };
  return <div className="qp-super-company-workspace">
    <section className="qp-super-card"><div className="qp-super-card-head"><div><span>Bizneslar</span><h2>Kompaniyalar ro‘yxati</h2></div></div><div className="qp-super-table">{directory.companies.map((item) => { const owner = directory.users.find((user) => user.id === item.ownerUserId); return <button type="button" className={item.id === company?.id ? "selected" : ""} key={item.id} onClick={() => setSelectedId(item.id)}><div><strong>{item.name}</strong><small>{owner?.phone || "—"}</small></div><span>{planLabel(item.plan)}</span><span>{directory.users.filter((user) => user.companyId === item.id).length} platforma hisobi</span><span className={item.status === "ACTIVE" ? "ok" : "off"}>{companyStatusLabel(item.status)}</span><b>360°</b></button>; })}</div></section>
    {company ? <aside className="qp-super-card qp-super-company-360"><div className="qp-super-card-head"><div><span>Kompaniya 360°</span><h2>{company.name}</h2></div></div><div className="qp-super-360-grid"><div><span>Tarif</span><strong>{planLabel(company.plan)}</strong></div><div><span>Xodimlar</span><strong>{companyEmployees.length}</strong></div><div><span>Platforma hisoblari</span><strong>{companyLoginUsers.length}</strong></div><div><span>Holat</span><strong>{companyStatusLabel(company.status)}</strong></div><div><span>Sinov tugashi</span><strong>{company.trialEndsAt ? formatDateTime(company.trialEndsAt) : "—"}</strong></div><div><span>Filiallar</span><strong>{companyDb?.branches?.length || 1}</strong></div><div><span>Omborlar</span><strong>{companyDb?.warehouses?.length || 0}</strong></div><div><span>Ma’lumot hajmi</span><strong>{(() => { const value = readCompanyDb(company.id); return value ? `${Math.max(1, Math.round(new Blob([JSON.stringify(value)]).size / 1024))} KB` : "—"; })()}</strong></div></div><div className="qp-super-actions"><button type="button" onClick={() => updateCompany(company.id, { status: company.status === "ACTIVE" ? "BLOCKED" : "ACTIVE" })}>{company.status === "ACTIVE" ? "Kompaniyani bloklash" : "Faollashtirish"}</button><button type="button" onClick={extendTrial}>+14 kun</button></div><h3>Modullar</h3><div className="qp-super-company-modules">{PLATFORM_MODULE_KEYS.map((key) => <label key={key}><span><strong>{moduleMeta[key]?.[0] || key}</strong><small>{moduleMeta[key]?.[1]}</small></span><Checkbox checked={effectiveModules[key] !== false} onChange={(checked) => setCompanyModuleEnabled(company.id, key, checked)} ariaLabel={`${moduleMeta[key]?.[0] || key} modulini boshqarish`} /></label>)}</div></aside> : null}
  </div>;
}

function Users({ directory }) {
  const users = directory.users.filter((user) => user.roles?.some((role) => ["OWNER", "ADMIN"].includes(role)));
  const [selectedId, setSelectedId] = useState(users[0]?.id || "");
  const [resetPassword, setResetPassword] = useState("");
  const selected = users.find((item) => item.id === selectedId) || users[0];
  const company = directory.companies.find((item) => item.id === selected?.companyId);
  const db = readCompanyDb(selected?.companyId);
  const companyOrders = db?.orders || [];
  const companyEmployees = (db?.users || []).filter((item) => !(item.roles || []).includes("OWNER") && item.role !== "OWNER");
  const sessions = selected ? getUserSessions(selected.id) : [];
  const activeSessions = sessions.filter((item) => item.status === "ACTIVE");
  return <div className="qp-super-company-workspace"><section className="qp-super-card"><div className="qp-super-card-head"><div><span>Umumiy katalog</span><h2>Foydalanuvchilar</h2></div></div><div className="qp-super-table qp-super-users">{users.map((item) => <button type="button" key={item.id} className={item.id === selected?.id ? "selected" : ""} onClick={() => { setSelectedId(item.id); setResetPassword(""); }}><div><strong>{item.name}</strong><small>{item.phone}</small></div><span>{item.title || item.primaryRole}</span><span>{directory.companies.find((companyItem) => companyItem.id === item.companyId)?.name || "—"}</span><span className={item.status === "ACTIVE" ? "ok" : "off"}>{item.status === "ACTIVE" ? "Faol" : "Faolsiz"}</span><b>{(item.roles || []).map(getRoleLabel).join(", ")}</b></button>)}</div></section>{selected ? <aside className="qp-super-card qp-super-company-360"><div className="qp-super-card-head"><div><span>Foydalanuvchi 360°</span><h2>{selected.name}</h2></div></div><div className="qp-super-360-grid"><div><span>Kompaniya</span><strong>{company?.name || "—"}</strong></div><div><span>Rollar</span><strong>{(selected.roles || []).map(getRoleLabel).join(", ")}</strong></div><div><span>Oxirgi kirish</span><strong>{selected.lastLoginAt ? formatDateTime(selected.lastLoginAt) : "Hali kirmagan"}</strong></div><div><span>Holat</span><strong>{selected.status === "ACTIVE" ? "Faol" : "Faolsiz"}</strong></div><div><span>Auth turi</span><strong>{selected.primaryRole === "ADMIN" ? "Admin" : "Owner"}</strong></div><div><span>Kompaniya buyurtmalari</span><strong>{companyOrders.length}</strong></div><div><span>Kompaniya xodimlari</span><strong>{companyEmployees.length}</strong></div><div><span>Telefon</span><strong>{selected.phone || "—"}</strong></div><div><span>Filial</span><strong>{selected.branch || "—"}</strong></div><div><span>Ombor</span><strong>{db?.warehouses?.find((item) => item.id === selected.warehouseId)?.name || "Biriktirilmagan"}</strong></div><div><span>Hudud</span><strong>{selected.territory || "Biriktirilmagan"}</strong></div><div><span>Hisob turi</span><strong>{selected.primaryRole === "ADMIN" ? "Admin" : "Owner"}</strong></div><div><span>Parol holati</span><strong>Faol</strong></div><div><span>Faol sessiyalar</span><strong>{activeSessions.length}</strong></div><div><span>Oxirgi qurilma</span><strong>{sessions[0]?.device || "—"}</strong></div></div><div className="qp-super-actions"><button type="button" onClick={() => setAuthUserStatus(selected.id, selected.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}>{selected.status === "ACTIVE" ? "Hisobni bloklash" : "Hisobni faollashtirish"}</button><button type="button" onClick={() => { revokeUserSessions(selected.id); notify("Foydalanuvchining faol sessiyalari yakunlandi", "warning"); }}>Barcha qurilmalardan chiqarish</button><button type="button" onClick={() => { const next = `Qulay#${Math.floor(1000 + Math.random() * 9000)}`; resetAuthUserPassword(selected.id, next); setResetPassword(next); notify("Yangi kirish paroli yaratildi", "success"); }}>Kirish parolini yangilash</button></div>{resetPassword ? <div className="qp-super-temp-password"><span>Yangi kirish paroli</span><strong>{resetPassword}</strong><small>Owner/Admin keyingi kirishda ushbu parolni yangilashi talab qilinadi.</small><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(resetPassword); notify("Parol nusxalandi"); } catch { notify("Parolni qo‘lda nusxalang", "warning"); } }}>Nusxalash</button></div> : null}<h3>Qurilmalar va sessiyalar</h3><div className="qp-super-broadcast-list">{sessions.slice(0, 5).map((session) => <div key={session.id}><strong>{session.device || "Brauzer"}</strong><span>{session.status === "ACTIVE" ? "Faol sessiya" : session.status === "REVOKED" ? "Bekor qilingan" : "Yakunlangan"}</span><small>{formatDateTime(session.lastActivityAt || session.loggedInAt)}</small></div>)}{!sessions.length ? <div className="qp-super-empty">Sessiya tarixi yo‘q.</div> : null}</div></aside> : null}</div>;
}

function Plans({ directory }) {
  const plans = ["TRIAL", "FREE", "STANDARD", "PRO", "ENTERPRISE"];
  const planSettings = directory.platformSettings?.plans || {};
  const saveLimit = (plan, key, value) => updatePlanConfig(plan, { limits: { [key]: Math.max(0, Number(value) || 0) } });
  return <><div className="qp-super-feature-grid">{plans.map((plan) => { const limits = planSettings[plan]?.limits || {}; return <section className="qp-super-card qp-super-feature-card" key={plan}><CreditCard size={22}/><span>{planLabel(plan)}</span><strong>{directory.companies.filter((company) => company.plan === plan).length} kompaniya</strong><small>Xodim {limits.employees || "∞"} · Filial {limits.branches || "∞"} · Ombor {limits.warehouses || "∞"}</small></section>; })}</div><section className="qp-super-card qp-super-plan-table"><div className="qp-super-card-head"><div><span>Tarif limitlari</span><h2>Platforma limitlarini boshqarish</h2></div></div>{plans.map((plan) => { const limits = planSettings[plan]?.limits || {}; return <div key={plan} className="qp-super-plan-config"><strong>{planLabel(plan)}</strong><label><span>Xodim</span><input className="qp-input" type="number" min="0" value={limits.employees ?? 0} onChange={(event) => saveLimit(plan, "employees", event.target.value)}/></label><label><span>Filial</span><input className="qp-input" type="number" min="0" value={limits.branches ?? 0} onChange={(event) => saveLimit(plan, "branches", event.target.value)}/></label><label><span>Ombor</span><input className="qp-input" type="number" min="0" value={limits.warehouses ?? 0} onChange={(event) => saveLimit(plan, "warehouses", event.target.value)}/></label><label><span>Storage MB</span><input className="qp-input" type="number" min="0" value={limits.storageMb ?? 0} onChange={(event) => saveLimit(plan, "storageMb", event.target.value)}/></label></div>; })}</section><section className="qp-super-card qp-super-plan-table"><div className="qp-super-card-head"><div><span>Obunalar</span><h2>Kompaniya tarifini boshqarish</h2></div></div>{directory.companies.map((company) => <div key={company.id}><strong>{company.name}</strong><Select value={company.plan} onChange={(event) => updateCompany(company.id, { plan: event.target.value })}>{plans.map((plan) => <option value={plan} key={plan}>{planLabel(plan)}</option>)}</Select><span>{company.trialEndsAt ? `Sinov: ${formatDateTime(company.trialEndsAt)}` : "—"}</span></div>)}</section></>;
}

function Modules({ directory }) {
  const platform = directory.platformSettings || getPlatformSettings();
  const plans = ["TRIAL", "FREE", "STANDARD", "PRO", "ENTERPRISE"];
  const [companyId, setCompanyId] = useState(directory.companies[0]?.id || "");
  const effective = companyId ? getEffectiveCompanyModules(companyId) : {};
  return <div className="qp-super-modules-workspace">
    <section className="qp-super-card"><div className="qp-super-card-head"><div><span>Umumiy ro‘yxat</span><h2>Platforma modullari</h2></div></div><div className="qp-super-module-grid">{PLATFORM_MODULE_KEYS.map((key) => { const setting = platform.modules?.[key] || {}; return <div key={key}><Blocks size={17}/><span><strong>{moduleMeta[key]?.[0] || key}</strong><small>{moduleMeta[key]?.[1]}</small></span><button type="button" className={setting.enabled === false ? "off" : "on"} onClick={() => setGlobalModuleEnabled(key, setting.enabled === false)}>{setting.enabled === false ? "O‘chirilgan" : "Yoqilgan"}</button><div className="qp-super-plan-pills">{plans.map((plan) => <label key={plan}><Checkbox checked={(setting.plans || plans).includes(plan)} onChange={(checked) => setModulePlans(key, checked ? [...(setting.plans || plans), plan] : (setting.plans || plans).filter((item) => item !== plan))} ariaLabel={`${moduleMeta[key]?.[0] || key} ${plan} tarifi`}/><span>{planLabel(plan)}</span></label>)}</div></div>; })}</div></section>
    <section className="qp-super-card"><div className="qp-super-card-head"><div><span>Kompaniya access</span><h2>Modullarni alohida boshqarish</h2></div></div><div className="qp-super-module-company-select"><Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{directory.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select></div><div className="qp-super-company-modules">{PLATFORM_MODULE_KEYS.map((key) => <label key={key}><span><strong>{moduleMeta[key]?.[0]}</strong><small>{effective[key] === false ? "Kirish yopiq (global/tarif/company qoidasi)" : "Kirish ochiq"}</small></span><Checkbox checked={effective[key] !== false} onChange={(checked) => setCompanyModuleEnabled(companyId, key, checked)} ariaLabel={`${moduleMeta[key]?.[0] || key} modulini boshqarish`} /></label>)}</div></section>
  </div>;
}

function Translations() {
  const languages = [["UZ", "O‘zbek", "Asosiy manba tili"], ["RU", "Rus", "To‘liq UI auditi"], ["TJ", "Tojik", "To‘liq UI auditi"], ["KZ", "Qozoq", "To‘liq UI auditi"]];
  return <><div className="qp-super-feature-grid">{languages.map(([code, name, hint]) => <section className="qp-super-card qp-super-feature-card" key={code}><Languages size={22}/><span>{code}</span><strong>{name}</strong><small>{hint}</small></section>)}</div><section className="qp-super-card qp-super-placeholder"><Languages size={28}/><h2>Tarjima sifati nazorati</h2><p>Tarjima tekshiruvi `npm run i18n:check` orqali faol interfeysdagi yetishmayotgan tarjimalarni aniqlaydi. Tanlangan tilga boshqa tizim tili aralashmasligi kerak.</p></section></>;
}

function Notifications({ directory }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("ALL");
  const send = () => {
    if (!title.trim() || !message.trim()) { notify("Sarlavha va xabarni kiriting", "warning"); return; }
    addPlatformBroadcast({ title, message, audience });
    setTitle(""); setMessage(""); notify("Platforma e’loni saqlandi");
  };
  return <div className="qp-super-notification-grid"><section className="qp-super-card"><div className="qp-super-card-head"><div><span>Broadcast</span><h2>Yangi e’lon</h2></div></div><div className="qp-super-form"><label><span>Sarlavha</span><input className="qp-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Masalan: Texnik xizmat" /></label><label><span>Auditoriya</span><Select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="ALL">Barcha foydalanuvchilar</option><option value="OWNERS">Faqat biznes egalari</option><option value="TRIAL">Sinov tarifidagi kompaniyalar</option></Select></label><label><span>Xabar</span><textarea className="qp-textarea" rows="5" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Xabar matni..." /></label><button type="button" className="qp-button qp-button-primary" onClick={send}><Megaphone size={15}/> E’lonni saqlash</button></div></section><section className="qp-super-card"><div className="qp-super-card-head"><div><span>Tarix</span><h2>So‘nggi e’lonlar</h2></div></div><div className="qp-super-broadcast-list">{directory.platformSettings?.broadcasts?.length ? directory.platformSettings.broadcasts.slice(0, 8).map((item) => <div key={item.id}><strong>{item.title}</strong><span>{item.message}</span><small>{audienceLabel(item.audience)} · {formatDateTime(item.createdAt)}</small></div>) : <div className="qp-super-empty">E’lon hali yuborilmagan.</div>}</div></section></div>;
}

function Security({ directory }) {
  const inactive = directory.users.filter((user) => user.status !== "ACTIVE").length;
  const blockedCompanies = directory.companies.filter((company) => company.status !== "ACTIVE").length;
  const audit = directory.platformSettings?.audit || [];
  return <><div className="qp-super-feature-grid"><section className="qp-super-card qp-super-feature-card"><ShieldCheck size={22}/><span>Faolsiz hisoblar</span><strong>{inactive}</strong><small>Kirish bloklangan</small></section><section className="qp-super-card qp-super-feature-card"><Building2 size={22}/><span>Bloklangan kompaniya</span><strong>{blockedCompanies}</strong><small>Platformaga kirish cheklangan</small></section><section className="qp-super-card qp-super-feature-card"><Activity size={22}/><span>Admin audit</span><strong>{audit.length}</strong><small>Platforma o‘zgarishlari</small></section></div><section className="qp-super-card"><div className="qp-super-card-head"><div><span>Audit log</span><h2>So‘nggi Super Admin amallari</h2></div></div><div className="qp-super-audit-list">{audit.slice(0, 20).map((item) => <div key={item.id}><ShieldCheck size={15}/><div><strong>{auditTypeLabel(item.type)}</strong><span>{moduleMeta[item.moduleKey]?.[0] || directory.companies.find((company) => company.id === item.companyId)?.name || "Platforma"}</span></div><small>{formatDateTime(item.createdAt)}</small></div>)}</div></section></>;
}

function Analytics({ directory }) {
  const usage = directory.companies.map((company) => { const db = readCompanyDb(company.id); return { company, products: db?.products?.length || 0, customers: db?.customers?.length || 0, orders: db?.orders?.length || 0, payments: db?.payments?.length || 0, deliveries: db?.deliveries?.length || 0, bytes: db ? new Blob([JSON.stringify(db)]).size : 0 }; });
  const totalOrders = usage.reduce((sum, item) => sum + item.orders, 0);
  const totalStorage = usage.reduce((sum, item) => sum + item.bytes, 0);
  return <><div className="qp-super-feature-grid"><section className="qp-super-card qp-super-feature-card"><Building2 size={22}/><span>Kompaniyalar</span><strong>{usage.length}</strong><small>Platformadagi tenantlar</small></section><section className="qp-super-card qp-super-feature-card"><BarChart3 size={22}/><span>Buyurtmalar</span><strong>{totalOrders}</strong><small>Barcha kompaniyalar</small></section><section className="qp-super-card qp-super-feature-card"><HardDrive size={22}/><span>Prototype data</span><strong>{Math.max(1, Math.round(totalStorage / 1024))} KB</strong><small>LocalDB hajmi</small></section></div><section className="qp-super-card"><div className="qp-super-card-head"><div><span>Usage</span><h2>Kompaniyalar bo‘yicha foydalanish</h2></div></div><div className="qp-super-table">{usage.map((item) => <div key={item.company.id}><div><strong>{item.company.name}</strong><small>{planLabel(item.company.plan)}</small></div><span>{item.products} mahsulot</span><span>{item.customers} mijoz</span><span>{item.orders} order</span><b>{Math.max(1, Math.round(item.bytes / 1024))} KB</b></div>)}</div></section></>;
}

function Integrations() {
  const integrations = [
    ["Yandex Maps", Boolean(import.meta.env.VITE_YANDEX_MAPS_API_KEY), "Xarita, navigator va workforce location"],
    ["Google Finance", true, "Valyuta kursi provider + cache/fallback"],
    ["Telegram", false, "Kelajak bildirishnoma kanali"],
    ["WhatsApp", false, "Kelajak bildirishnoma kanali"],
    ["Email / SMS", false, "Backend bosqichida provider ulanadi"],
  ];
  return <div className="qp-super-feature-grid">{integrations.map(([name, connected, hint]) => <section className="qp-super-card qp-super-feature-card" key={name}><PlugZap size={22}/><span>{name}</span><strong>{connected ? "Tayyor" : "Rejalashtirilgan"}</strong><small>{hint}</small></section>)}</div>;
}

function Support({ directory }) {
  const tickets = directory.platformSettings?.supportTickets || [];
  const [companyId, setCompanyId] = useState(directory.companies[0]?.id || "");
  const [subject, setSubject] = useState("");
  const create = () => { if (!companyId || !subject.trim()) { notify("Kompaniya va mavzuni kiriting", "warning"); return; } addSupportTicket({ companyId, subject }); setSubject(""); notify("Support murojaati yaratildi"); };
  return <div className="qp-super-notification-grid"><section className="qp-super-card"><div className="qp-super-card-head"><div><span>Support</span><h2>Yangi murojaat</h2></div></div><div className="qp-super-form"><label><span>Kompaniya</span><Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{directory.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select></label><label><span>Mavzu</span><input className="qp-input" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Muammo yoki support vazifasi"/></label><button type="button" className="qp-button qp-button-primary" onClick={create}><CircleHelp size={15}/> Murojaat yaratish</button></div></section><section className="qp-super-card"><div className="qp-super-card-head"><div><span>Navbat</span><h2>Support murojaatlari</h2></div></div><div className="qp-super-broadcast-list">{tickets.map((ticket) => <div key={ticket.id}><strong>{ticket.subject}</strong><span>{directory.companies.find((company) => company.id === ticket.companyId)?.name || "—"}</span><small>{supportStatusLabel(ticket.status)} · {formatDateTime(ticket.createdAt)}</small><button type="button" onClick={() => updateSupportTicket(ticket.id, { status: ticket.status === "OPEN" ? "RESOLVED" : "OPEN" })}>{ticket.status === "OPEN" ? "Yopish" : "Qayta ochish"}</button></div>)}{!tickets.length ? <div className="qp-super-empty">Ochiq support murojaati yo‘q.</div> : null}</div></section></div>;
}

function Health() {
  const hasYandex = Boolean(import.meta.env.VITE_YANDEX_MAPS_API_KEY);
  const storageUsed = typeof window !== "undefined" ? Object.keys(window.localStorage).filter((key) => key.startsWith("qulay.")).length : 0;
  return <div className="qp-super-feature-grid"><section className="qp-super-card qp-super-feature-card"><Server size={22}/><span>Interfeys</span><strong>Faol</strong><small>React/Vite asosidagi interfeys</small></section><section className="qp-super-card qp-super-feature-card"><Globe2 size={22}/><span>Yandex xarita</span><strong>{hasYandex ? "Ulangan" : "Kalit kutilmoqda"}</strong><small>{hasYandex ? "API kaliti topildi" : ".env ichiga kalit kiriting"}</small></section><section className="qp-super-card qp-super-feature-card"><CreditCard size={22}/><span>Valyuta manbasi</span><strong>Google Finance</strong><small>Kesh va zaxira kurs</small></section><section className="qp-super-card qp-super-feature-card"><HardDrive size={22}/><span>Mahalliy xotira</span><strong>{storageUsed}</strong><small>Qulay xotira kalitlari</small></section><section className="qp-super-card qp-super-feature-card"><Database size={22}/><span>Server qismi</span><strong>Keyingi bosqich</strong><small>Hozir mahalliy xotira prototipi</small></section><section className="qp-super-card qp-super-feature-card"><BarChart3 size={22}/><span>Xatolar</span><strong>Audit orqali</strong><small>Yig‘ish va kod sifati tekshiruvi</small></section></div>;
}

function PlatformSettings({ directory }) {
  const settings = directory.platformSettings || getPlatformSettings();
  const [trialDays, setTrialDays] = useState(String(settings.defaultTrialDays || 14));
  const saveTrial = () => { updatePlatformSettings({ defaultTrialDays: Math.max(1, Number(trialDays) || 14) }); notify("Sinov muddati saqlandi"); };
  return <div className="qp-super-settings-grid"><section className="qp-super-card"><div className="qp-super-card-head"><div><span>Platforma</span><h2>Kirish va xizmat holati</h2></div></div><div className="qp-super-setting-list"><label><span><strong>Yangi registratsiya</strong><small>Yangi bizneslar ro‘yxatdan o‘ta oladi</small></span><Checkbox checked={settings.signupEnabled !== false} onChange={(checked) => updatePlatformSettings({ signupEnabled: checked })} ariaLabel="Yangi registratsiyani boshqarish"/></label><label><span><strong>Texnik xizmat rejimi</strong><small>Platformani vaqtincha texnik xizmat holatiga o‘tkazish</small></span><Checkbox checked={Boolean(settings.maintenanceMode)} onChange={(checked) => updatePlatformSettings({ maintenanceMode: checked })} ariaLabel="Texnik xizmat rejimini boshqarish"/></label><label className="text"><span><strong>Sinov muddati</strong><small>Yangi kompaniyalar uchun</small></span><div><input className="qp-input" type="number" min="1" value={trialDays} onChange={(event) => setTrialDays(event.target.value)}/><button type="button" onClick={saveTrial}>Saqlash</button></div></label></div></section><section className="qp-super-card"><div className="qp-super-card-head"><div><span>Funksiya boshqaruvi</span><h2>Beta funksiyalar</h2></div></div><div className="qp-super-setting-list">{Object.entries(settings.featureFlags || {}).map(([key, enabled]) => { const meta = featureFlagMeta[key] || ["Eksperimental funksiya", "Bosqichma-bosqich yoqish uchun boshqaruv"]; return <label key={key}><span><strong>{meta[0]}</strong><small>{meta[1]}</small></span><Checkbox checked={Boolean(enabled)} onChange={(checked) => updatePlatformSettings({ featureFlags: { ...(settings.featureFlags || {}), [key]: checked } })} ariaLabel={`${meta[0]} funksiyasini boshqarish`}/></label>; })}</div></section></div>;
}

function SuperAdminPage({ section = "dashboard" }) {
  const directory = useDirectory();
  const content = useMemo(() => {
    if (section === "dashboard") return <Dashboard directory={directory}/>;
    if (section === "companies") return <Companies directory={directory}/>;
    if (section === "users") return <Users directory={directory}/>;
    if (section === "plans") return <Plans directory={directory}/>;
    if (section === "modules") return <Modules directory={directory}/>;
    if (section === "translations") return <Translations/>;
    if (section === "notifications") return <Notifications directory={directory}/>;
    if (section === "security") return <Security directory={directory}/>;
    if (section === "analytics") return <Analytics directory={directory}/>;
    if (section === "integrations") return <Integrations/>;
    if (section === "support") return <Support directory={directory}/>;
    if (section === "health") return <Health/>;
    if (section === "settings") return <PlatformSettings directory={directory}/>;
    return <section className="qp-super-card qp-super-placeholder"><AlertTriangle size={28}/><h2>Bo‘lim topilmadi</h2><p>Ushbu bo‘lim hali mavjud emas.</p></section>;
  }, [directory, section]);
  return <div className="qp-super-page"><Header section={section}/>{content}</div>;
}

export default SuperAdminPage;
