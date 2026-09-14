import ImageUploader from "../../../components/ui/ImageUploader";
import Select from "../../../components/ui/Select";
import { getLanguageLabel } from "../../../i18n";
import { Download, Edit3, LoaderCircle, Plus, RotateCcw, ShieldCheck, Smartphone, Trash2, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Field,
  Modal,
  PageShell,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
} from "../../../components/prototype/PrototypeUI";
import {
  exportLocalDb,
  updateLocalDb,
  useLocalDb,
} from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatDateTime } from "../../../utils/formatters";
import { clearDeviceUnlock, hashDevicePin, markDeviceUnlocked } from "../../../utils/deviceSecurity";
import { isStandaloneMode } from "../../../utils/pwa";
import { apiRequest } from "../../../services/authService";
import { EMPLOYEE_WORKSPACE_OPTIONS } from "../../../config/employeeWorkspaces";

const nav = [
  ["general", "Umumiy"],
  ["appearance", "Interfeys va dizayn"],
  ["modules", "Modullar"],
  ["sales", "Savdo"],
  ["pos", "Tezkor kassa"],
  ["payment-methods", "To‘lov usullari"],
  ["inventory", "Ombor"],
  ["agents", "Agentlar"],
  ["delivery", "Yetkazib berish"],
  ["finance", "Moliya"],
  ["documents", "Hujjatlar"],
  ["notifications", "Bildirishnomalar"],
  ["maps", "Xarita va navigatsiya"],
  ["locale", "Til va hudud"],
  ["mobile", "Mobil ilova"],
  ["data", "Ma’lumotlar"],
  ["system", "Tizim"],
];


const DEFAULT_APPEARANCE = {
  primaryColor: "#0a2a43",
  themeMode: "light",
  pageBackground: "#faf9f6",
  surfaceColor: "#ffffff",
  baseFontSize: 15,
  headingSize: 31,
  headingWeight: 720,
  cardRadius: 16,
  controlRadius: 10,
  sidebarWidth: 236,
  topbarHeight: 68,
  motion: "subtle",
  contentWidth: "fluid",
  sidebarDensity: "comfortable",
  tableDensity: "comfortable",
  cardShadow: "premium",
  borderStrength: "soft",
  showDescriptions: true,
  showBreadcrumbs: true,
  stickySectionNavigation: true,
  showTableSummary: true,
};

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      className={`qp-switch ${value ? "on" : ""}`}
      onClick={() => onChange(!value)}
      aria-pressed={value}
    >
      <span />
    </button>
  );
}

function SettingRow({ title, description = "", children = null }) {
  return (
    <div className="qp-setting-row">
      <div className="qp-setting-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ToggleList({ section, db, items = [], children = null }) {
  const title = nav.find(([key]) => key === section)?.[1] || "Sozlamalar";
  return (
    <SectionCard title={title}>
      <div className="qp-settings-panel">
        {items.map(([key, label, description]) => (
          <SettingRow key={key} title={label} description={description}>
            <Toggle value={Boolean(db.settings[section]?.[key])} onChange={(value) => setSetting(section, key, value)} />
          </SettingRow>
        ))}
        {children}
      </div>
    </SectionCard>
  );
}

function setSetting(section, key, value) {
  updateLocalDb((draft) => {
    if (!draft.settings[section]) draft.settings[section] = {};
    draft.settings[section][key] = value;
  });
}

function NumberSetting({ label, value, min, max, suffix = "px", onChange }) {
  return (
    <Field label={label} hint={`${min}–${max}${suffix ? ` ${suffix}` : ""}`}>
      <div className="qp-setting-number-control">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          className="qp-input"
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
    </Field>
  );
}

function AppearanceSettings({ db }) {
  const appearance = db.settings.appearance;
  const reset = () => {
    updateLocalDb((draft) => {
      draft.settings.appearance = { ...DEFAULT_APPEARANCE };
    });
    notify("Interfeys sozlamalari Qulay standartiga qaytarildi");
  };

  return (
    <div className="qp-stack">
      <SectionCard
        title="Tipografiya va o‘lchamlar"
        description="O‘zgarishlar saqlash tugmasisiz darhol butun platformaga qo‘llanadi."
        actions={<SecondaryButton onClick={reset}><RotateCcw size={14} /> Standartga qaytarish</SecondaryButton>}
      >
        <div className="qp-settings-panel qp-form-grid">
          <NumberSetting label="Asosiy matn o‘lchami" value={appearance.baseFontSize} min={11} max={18} onChange={(value) => setSetting("appearance", "baseFontSize", value)} />
          <NumberSetting label="Sahifa sarlavhasi" value={appearance.headingSize} min={20} max={40} onChange={(value) => setSetting("appearance", "headingSize", value)} />
          <Field label="Sarlavha qalinligi">
            <Select value={appearance.headingWeight} onChange={(event) => setSetting("appearance", "headingWeight", Number(event.target.value))}>
              <option value="500">O‘rtacha</option>
              <option value="600">Yarim qalin</option>
              <option value="700">Qalin</option>
              <option value="720">Kuchli qalin</option>
              <option value="800">Juda qalin</option>
            </Select>
          </Field>
          <Field label="Sahifa kengligi">
            <Select value={appearance.contentWidth} onChange={(event) => setSetting("appearance", "contentWidth", event.target.value)}>
              <option value="compact">Ixcham</option>
              <option value="wide">Keng</option>
              <option value="fluid">Moslashuvchan</option>
              <option value="full">To‘liq ekran</option>
            </Select>
          </Field>
          <NumberSetting label="Yon menyu kengligi" value={appearance.sidebarWidth} min={210} max={300} onChange={(value) => setSetting("appearance", "sidebarWidth", value)} />
          <NumberSetting label="Yuqori panel balandligi" value={appearance.topbarHeight} min={58} max={82} onChange={(value) => setSetting("appearance", "topbarHeight", value)} />
        </div>
      </SectionCard>

      <SectionCard title="Kartalar va boshqaruv elementlari" description="Platformaning umumiy zichligi va professional ko‘rinishini boshqaring.">
        <div className="qp-settings-panel qp-form-grid">
          <NumberSetting label="Karta radiusi" value={appearance.cardRadius} min={6} max={28} onChange={(value) => setSetting("appearance", "cardRadius", value)} />
          <NumberSetting label="Tugma va maydon radiusi" value={appearance.controlRadius} min={5} max={22} onChange={(value) => setSetting("appearance", "controlRadius", value)} />
          <Field label="Karta soyasi">
            <Select value={appearance.cardShadow} onChange={(event) => setSetting("appearance", "cardShadow", event.target.value)}>
              <option value="none">Soyasiz</option>
              <option value="soft">Yumshoq</option>
              <option value="premium">Kuchli</option>
            </Select>
          </Field>
          <Field label="Chegara chizig‘i kuchi">
            <Select value={appearance.borderStrength} onChange={(event) => setSetting("appearance", "borderStrength", event.target.value)}>
              <option value="soft">Juda nozik</option>
              <option value="normal">Aniqroq</option>
            </Select>
          </Field>
          <Field label="Jadval zichligi">
            <Select value={appearance.tableDensity} onChange={(event) => setSetting("appearance", "tableDensity", event.target.value)}>
              <option value="compact">Ixcham</option>
              <option value="comfortable">Qulay</option>
              <option value="spacious">Keng</option>
            </Select>
          </Field>
          <Field label="Animatsiya">
            <Select value={appearance.motion} onChange={(event) => setSetting("appearance", "motion", event.target.value)}>
              <option value="off">O‘chirilgan</option>
              <option value="subtle">Sokin</option>
              <option value="normal">Oddiy</option>
            </Select>
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Ranglar va rejim" description="Yorug‘ va qorong‘i rejim tanlangan asosiy rang bilan birga ishlaydi; muvaffaqiyat, ogohlantirish va xavf ranglari alohida semantik rang bo‘lib qoladi.">
        <div className="qp-settings-panel">
          <SettingRow title="Ko‘rinish rejimi" description="Yorug‘, qorong‘i yoki qurilma rejimiga mos">
            <div style={{ minWidth: 190 }}><Select value={appearance.themeMode || "light"} onChange={(event) => setSetting("appearance", "themeMode", event.target.value)}><option value="light">Yorug‘</option><option value="dark">Qorong‘i</option><option value="system">Qurilmaga mos</option></Select></div>
          </SettingRow>
          <SettingRow title="Asosiy rang" description="Navigatsiya, faol holatlar va brend aksentlari"><input className="qp-color-input" type="color" value={appearance.primaryColor} onChange={(event) => setSetting("appearance", "primaryColor", event.target.value)} /></SettingRow>
          <SettingRow title="Ish maydoni foni" description="Sahifalar orqa foni"><input className="qp-color-input" type="color" value={appearance.pageBackground} onChange={(event) => setSetting("appearance", "pageBackground", event.target.value)} /></SettingRow>
          <SettingRow title="Kartalar foni" description="Jadval, panel va kartalar yuzasi"><input className="qp-color-input" type="color" value={appearance.surfaceColor || "#ffffff"} onChange={(event) => setSetting("appearance", "surfaceColor", event.target.value)} /></SettingRow>
        </div>
      </SectionCard>

      <SectionCard title="Ko‘rinadigan elementlar">
        <div className="qp-settings-panel">
          <SettingRow title="Sahifa izohlari" description="Sarlavha ostidagi qisqa tushuntirishlar"><Toggle value={appearance.showDescriptions !== false} onChange={(value) => setSetting("appearance", "showDescriptions", value)} /></SettingRow>
          <SettingRow title="Yo‘l ko‘rsatkichi" description="Qaysi bo‘lim va sahifada turganingizni ko‘rsatadi"><Toggle value={appearance.showBreadcrumbs !== false} onChange={(value) => setSetting("appearance", "showBreadcrumbs", value)} /></SettingRow>
          <SettingRow title="Ichki navigatsiyani mahkamlash" description="Sahifa pastga aylantirilganda bo‘lim sahifalari tepada qoladi"><Toggle value={appearance.stickySectionNavigation !== false} onChange={(value) => setSetting("appearance", "stickySectionNavigation", value)} /></SettingRow>
          <SettingRow title="Jadval qisqa statistikasi" description="Ro‘yxatlar tepasida jami va holat kartalarini ko‘rsatadi"><Toggle value={appearance.showTableSummary !== false} onChange={(value) => setSetting("appearance", "showTableSummary", value)} /></SettingRow>
        </div>
      </SectionCard>

      <SectionCard title="Jonli ko‘rinish">
        <div className="qp-settings-panel">
          <div className="qp-preview">
            <div className="qp-eyebrow">Jonli namuna</div>
            <h1 style={{ margin: "0 0 8px" }}>Mahsulotlar</h1>
            <p style={{ color: "var(--qp-text-2)", margin: 0 }}>Rang, radius, sarlavha va o‘lchamlar shu zahoti platformaga tarqaladi.</p>
            <div className="qp-inline-actions" style={{ marginTop: 16 }}><PrimaryButton>Asosiy tugma</PrimaryButton><SecondaryButton>Ikkinchi tugma</SecondaryButton></div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function ModulesSettings({ db }) {
  const labels = {
    sales: "Savdo", pos: "Tezkor kassa", inventory: "Ombor", partners: "Hamkorlar",
    agents: "Agentlar", routes: "Marshrutlar", fulfillment: "Tayyorlash", delivery: "Yetkazib berish",
    finance: "Moliya", reports: "Hisobotlar", dashboard: "Bosh sahifa", settings: "Sozlamalar",
  };
  const normalEntries = Object.entries(db.settings.modules || {}).filter(([key]) => !key.endsWith("_workspace"));
  return (
    <div className="qp-stack">
      <SectionCard title="Biznes modullari" description="O‘chirilgan bo‘lim sidebar va ichki navigatsiyadan yashiriladi. Ma’lumotlar o‘chirilmaydi.">
        <div className="qp-settings-panel">
          {normalEntries.map(([key, value]) => (
            <SettingRow key={key} title={labels[key] || key} description="Bo‘lim va unga tegishli boshqaruv sahifalarining ko‘rinishi">
              <Toggle value={value} onChange={(next) => setSetting("modules", key, next)} />
            </SettingRow>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Xodim ish modullari" description="Bu modullar xodimlarga biriktiriladi. Owner sidebarida birinchi holatda yashirin; preview yoki nazorat uchun xohlasangiz yoqing.">
        <div className="qp-settings-panel">
          {EMPLOYEE_WORKSPACE_OPTIONS.map(([key, workspace]) => (
            <SettingRow key={key} title={workspace.label} description={workspace.description}>
              <Toggle value={Boolean(db.settings.employeeWorkspaces?.[key])} onChange={(next) => setSetting("employeeWorkspaces", key, next)} />
            </SettingRow>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function GeneralSettings({ db }) {
  return (
    <SectionCard title="Umumiy sozlamalar" description="Kompaniya bo‘yicha asosiy qiymatlar platformaning boshqa bo‘limlarida ham ishlatiladi.">
      <div className="qp-settings-panel qp-form-grid">
        <div className="qp-form-span-full"><ImageUploader value={db.settings.company.logo || ""} name={db.settings.company.name} label="Kompaniya logosi" compact onChange={(logo) => setSetting("company", "logo", logo)} /></div>
        <Field label="Kompaniya nomi"><input className="qp-input" value={db.settings.company.name} onChange={(event) => setSetting("company", "name", event.target.value)} /></Field>
        <Field label="Ko‘rinadigan valyuta"><Select searchable value={db.settings.company.currency} onChange={(event) => setSetting("company", "currency", event.target.value)}><option value="UZS">UZS — O‘zbekiston so‘mi</option><option value="USD">USD — AQSH dollari</option><option value="EUR">EUR — Yevro</option><option value="RUB">RUB — Rossiya rubli</option><option value="GBP">GBP — Funt sterling</option><option value="CNY">CNY — Xitoy yuani</option><option value="AED">AED — BAA dirhami</option></Select></Field>
        <Field label="Asosiy ombor"><Select value={db.settings.company.defaultWarehouseId} onChange={(event) => setSetting("company", "defaultWarehouseId", event.target.value)}>{db.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</Select></Field>
        <Field label="Vaqt mintaqasi"><input className="qp-input" value={db.settings.company.timezone} onChange={(event) => setSetting("company", "timezone", event.target.value)} /></Field>
        <Field label="Valyuta manbasi"><input className="qp-input" value="Google Finance" disabled /></Field>
        <Field label="Yuqori panelda kurslar"><Select value={db.settings.currency?.showInHeader === false ? "OFF" : "ON"} onChange={(event) => setSetting("currency", "showInHeader", event.target.value === "ON")}><option value="ON">Ko‘rsatilsin</option><option value="OFF">Yashirilsin</option></Select></Field>
      </div>
    </SectionCard>
  );
}

function SalesSettings({ db }) {
  return (
    <ToggleList
      section="sales"
      db={db}
      items={[
        ["autoConfirmOrders", "Buyurtmani avtomatik tayyorlashga yuborish", "Buyurtma saqlanganda mahsulot band qilinadi va tayyorlash navbatiga tushadi"],
        ["requireOwnerApprovalForAdminOrders", "Admin buyurtmasi uchun Owner tasdig‘i", "Admin yaratgan buyurtma stock band qilishdan oldin Owner tasdig‘ini kutadi"],
        ["showStockOnOrder", "Buyurtmada qoldiqni ko‘rsatish", "Mahsulot yonida sotish mumkin bo‘lgan qoldiq ko‘rinadi"],
        ["warnCustomerDebt", "Mijoz qarzini eslatish", "Buyurtma vaqtida mavjud qarz ko‘rsatiladi"],
      ]}
    >
      <div className="qp-form-grid qp-settings-inline-form">
        <Field label="Maksimal chegirma (%)"><input className="qp-input" type="number" min="0" max="100" value={db.settings.sales.maxAgentDiscount} onChange={(event) => setSetting("sales", "maxAgentDiscount", Math.max(0, Math.min(100, Number(event.target.value))))} /></Field>
      </div>
    </ToggleList>
  );
}

function PosSettings({ db }) {
  return (
    <SectionCard title="Tezkor kassa" description="Kassa ishlash usuli va tezkor savdo tajribasi.">
      <div className="qp-settings-panel">
        <div className="qp-form-grid qp-settings-inline-form">
          <Field label="Kassa ombori"><Select value={db.settings.pos.warehouseId} onChange={(event) => setSetting("pos", "warehouseId", event.target.value)}>{db.warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</Select></Field>
          <Field label="Narx ro‘yxati"><Select value={db.settings.pos.priceListId} onChange={(event) => setSetting("pos", "priceListId", event.target.value)}>{db.priceLists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</Select></Field>
        </div>
        <SettingRow title="Anonim mijoz" description="Mijoz tanlamasdan sotuvga ruxsat"><Toggle value={db.settings.pos.allowAnonymousCustomer} onChange={(value) => setSetting("pos", "allowAnonymousCustomer", value)} /></SettingRow>
        <SettingRow title="Mahsulot rasmi" description="Kassa katalogida vizual mahsulot blokini ko‘rsatish"><Toggle value={db.settings.pos.showImages} onChange={(value) => setSetting("pos", "showImages", value)} /></SettingRow>
        <SettingRow title="Qoldiq belgisi" description="Mahsulot kartasida mavjud qoldiqni ko‘rsatish"><Toggle value={db.settings.pos.showStockBadge !== false} onChange={(value) => setSetting("pos", "showStockBadge", value)} /></SettingRow>
        <SettingRow title="Saqlangan savatlar" description="Savatni vaqtincha chetga olib keyin davom ettirish"><Toggle value={db.settings.pos.allowHeldCarts !== false} onChange={(value) => setSetting("pos", "allowHeldCarts", value)} /></SettingRow>
        <SettingRow title="Shtrix-kod bilan avtomatik qo‘shish" description="Aniq shtrix-kod Enter bilan savatga tushadi"><Toggle value={db.settings.pos.barcodeAutoAdd} onChange={(value) => setSetting("pos", "barcodeAutoAdd", value)} /></SettingRow>
        <SettingRow title="Sotuvdan keyin savatni tozalash" description="Yangi xaridor uchun toza savat ochiladi"><Toggle value={db.settings.pos.clearCartAfterSale} onChange={(value) => setSetting("pos", "clearCartAfterSale", value)} /></SettingRow>
        <SettingRow title="Chek oynasini ochish" description="Sotuv yakunlangach brauzer chop etish oynasi ochiladi"><Toggle value={db.settings.pos.printReceipt} onChange={(value) => setSetting("pos", "printReceipt", value)} /></SettingRow>
      </div>
    </SectionCard>
  );
}

function PaymentMethodsSettings({ db }) {
  const empty = { name: "", shortcut: "", commissionType: "NONE", commissionRate: "" };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(empty);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (method) => {
    setEditing(method);
    setForm({
      name: method.name || "",
      shortcut: method.shortcut || "",
      commissionType: method.metadata?.commissionType || (Number(method.commissionRate || 0) > 0 ? "PERCENT" : "NONE"),
      commissionRate: Number(method.commissionRate || 0) || "",
    });
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const name = form.name.trim();
    if (!name) { notify("To‘lov usuli nomini kiriting", "warning"); return; }
    if ((db.paymentMethods || []).some((item) => item.id !== editing?.id && item.name.toLowerCase() === name.toLowerCase())) { notify("Bu nomdagi to‘lov usuli mavjud", "warning"); return; }
    setBusy(true);
    try {
      const body = editing ? {
        name,
        shortcut: form.shortcut || undefined,
        commissionRate: form.commissionType === "PERCENT" ? Number(form.commissionRate || 0) : 0,
        metadata: { ...(editing.metadata || {}), commissionType: form.commissionType },
      } : {
        code: `CUSTOM_${Date.now().toString(36).toUpperCase()}`,
        name,
        method: "OTHER",
        shortcut: form.shortcut || undefined,
        status: "ACTIVE",
        commissionRate: form.commissionType === "PERCENT" ? Number(form.commissionRate || 0) : 0,
        metadata: { commissionType: form.commissionType },
      };
      await apiRequest({ url: editing ? `/pos/payment-methods/${editing.id}` : "/pos/payment-methods", method: editing ? "PATCH" : "POST", body });
      setOpen(false); setEditing(null); setForm(empty);
      notify(editing ? "To‘lov usuli yangilandi" : "To‘lov usuli yaratildi");
    } catch (error) { notify(error.message, "danger"); }
    finally { setBusy(false); }
  };

  const remove = async (method) => {
    if (busy) return;
    if (!window.confirm(`“${method.name}” to‘lov usulini o‘chirasizmi? Tarixiy to‘lovlar saqlanadi.`)) return;
    setBusy(true);
    try {
      await apiRequest({ url: `/pos/payment-methods/${method.id}`, method: "DELETE" });
      notify("To‘lov usuli o‘chirildi", "warning");
    } catch (error) { notify(error.message, "danger"); }
    finally { setBusy(false); }
  };

  return <>
    <SectionCard title="To‘lov usullari" description="Bu yagona ro‘yxat POS, moliya, to‘lov tarixi, chek va hisobotlarda ishlatiladi.">
      <div className="qp-settings-panel">{(db.paymentMethods || []).map((method) => {
        const commissionType = method.metadata?.commissionType || (Number(method.commissionRate || 0) > 0 ? "PERCENT" : "NONE");
        return <SettingRow key={method.id} title={method.name} description={`${method.shortcut || "Tezkor klavish yo‘q"} · ${commissionType === "PERCENT" ? `${Number(method.commissionRate || 0)}% komissiya` : commissionType === "FIXED" ? "Belgilangan komissiya" : "Komissiyasiz"}`}>
          <div className="qp-inline-actions"><strong>{method.code}</strong><button type="button" className="qp-icon-button" title="Tahrirlash" onClick={() => openEdit(method)}><Edit3 size={15}/></button><button type="button" className="qp-icon-button qp-danger-icon" title="O‘chirish" onClick={() => remove(method)}><Trash2 size={15}/></button></div>
        </SettingRow>;
      })}</div>
      <div className="qp-form-actions"><PrimaryButton type="button" onClick={openCreate}><Plus size={15}/> To‘lov usuli</PrimaryButton></div>
    </SectionCard>
    <Modal open={open} title={editing ? "To‘lov usulini tahrirlash" : "Yangi to‘lov usuli"} onClose={() => { if (!busy) { setOpen(false); setEditing(null); } }}><form onSubmit={submit} aria-busy={busy}><div className="qp-form-grid">
      <Field label="Nom"><input required className="qp-input" value={form.name} onChange={(event)=>setForm({...form,name:event.target.value})} placeholder="Masalan: Click"/></Field>
      <Field label="Tezkor klavish"><input className="qp-input" value={form.shortcut} onChange={(event)=>setForm({...form,shortcut:event.target.value.toUpperCase()})} placeholder="Masalan: F4"/></Field>
      <Field label="Komissiya turi"><Select value={form.commissionType} onChange={(event)=>setForm({...form,commissionType:event.target.value})}><option value="NONE">Komissiyasiz</option><option value="PERCENT">Foiz</option><option value="FIXED">Belgilangan summa</option></Select></Field>
      {form.commissionType === "PERCENT" ? <Field label="Komissiya (%)"><input className="qp-input" type="number" min="0" max="100" step="0.01" value={form.commissionRate} onChange={(event)=>setForm({...form,commissionRate:event.target.value})}/></Field> : null}
    </div><div className="qp-form-actions"><SecondaryButton type="button" disabled={busy} onClick={()=>setOpen(false)}>Bekor qilish</SecondaryButton><PrimaryButton type="submit" disabled={busy}>{busy ? <><LoaderCircle className="qp-spin" size={15}/> Saqlanmoqda...</> : "Saqlash"}</PrimaryButton></div></form></Modal>
  </>;
}

function MobileSettings({ db }) {
  const mobile = db.settings.mobile || {};
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [installEvent, setInstallEvent] = useState(null);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const standalone = typeof window !== "undefined" && isStandaloneMode();

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const savePin = async () => {
    if (!/^\d{6}$/.test(pin)) { notify("PIN 6 ta raqamdan iborat bo‘lishi kerak", "warning"); return; }
    if (pin !== pinConfirm) { notify("PIN-kodlar bir xil emas", "warning"); return; }
    setPinBusy(true);
    try {
      const pinHash = await hashDevicePin(pin);
      updateLocalDb((draft) => {
        draft.settings.mobile.pinEnabled = true;
        draft.settings.mobile.pinHash = pinHash;
      });
      markDeviceUnlocked();
      setPin("");
      setPinConfirm("");
      notify("Qurilma PIN-kodi yoqildi");
    } catch (error) {
      notify(error?.message || "PIN-kodni saqlab bo‘lmadi", "danger");
    } finally {
      setPinBusy(false);
    }
  };

  const removePin = () => {
    updateLocalDb((draft) => {
      draft.settings.mobile.pinEnabled = false;
      draft.settings.mobile.pinHash = "";
      draft.settings.mobile.autoLockMinutes = 0;
    });
    clearDeviceUnlock();
    setPin("");
    setPinConfirm("");
    notify("Qurilma PIN-kodi o‘chirildi");
  };

  return (
    <div className="qp-stack">
      <SectionCard title="Mobil ilova" description="Qulay telefonga o‘rnatilganda brauzer panelisiz, mustaqil PWA ilova sifatida ishlaydi.">
        <div className="qp-settings-panel">
          <SettingRow title="Ilova holati" description={standalone ? "Qulay hozir standalone ilova rejimida ochilgan" : "Brauzerda ochilgan. Home Screen’ga o‘rnatilganda brauzer interfeysi ko‘rinmaydi."}>
            <span className={`qp-mobile-status-pill ${standalone ? "is-ok" : ""}`}><Smartphone size={15}/>{standalone ? "O‘rnatilgan" : "Brauzer"}</span>
          </SettingRow>
          <SettingRow title="Tarmoq holati" description={online ? "Internet mavjud. LocalDB o‘zgarishlari darhol saqlanadi." : "Internet yo‘q. Mahalliy ma’lumotlar bilan ishlash davom etadi."}>
            <span className={`qp-mobile-status-pill ${online ? "is-ok" : "is-warning"}`}>{online ? <Wifi size={15}/> : <WifiOff size={15}/>} {online ? "Online" : "Offline"}</span>
          </SettingRow>
          {!standalone && installEvent ? <SettingRow title="Telefon yoki kompyuterga o‘rnatish" description="Qulay’ni alohida ilova sifatida ochish uchun o‘rnating."><PrimaryButton type="button" onClick={install}><Download size={15}/> Ilovani o‘rnatish</PrimaryButton></SettingRow> : null}
          {!standalone && !installEvent ? <div className="qp-mobile-install-note"><strong>Home Screen’ga qo‘shish</strong><span>Android/Chrome: brauzer menyusi → “Ilovani o‘rnatish”. iPhone/Safari: Share → “Add to Home Screen”. Shundan keyin Qulay brauzer panelisiz ochiladi.</span></div> : null}
          <SettingRow title="Kamera skaneri" description="POS va inventarizatsiyada telefon kamerasi bilan barcode/QR o‘qish"><Toggle value={mobile.cameraScanner !== false} onChange={(value) => setSetting("mobile", "cameraScanner", value)} /></SettingRow>
          <SettingRow title="Mobil pastki navigatsiya" description="Telefon ekranida asosiy amallar uchun app-uslubidagi bottom navigation"><Toggle value={mobile.compactBottomNav !== false} onChange={(value) => setSetting("mobile", "compactBottomNav", value)} /></SettingRow>
        </div>
      </SectionCard>

      <SectionCard title="Qurilma xavfsizligi" description="Bu PIN faqat joriy brauzer/qurilmada saqlanadigan frontend himoya qatlamidir. Serverdagi login/parol o‘rnini bosmaydi.">
        <div className="qp-settings-panel">
          <SettingRow title="Qurilma PIN-kodi" description={mobile.pinEnabled ? "6 xonali mahalliy PIN faol" : "Qulay ochilganda qo‘shimcha PIN so‘ralmaydi"}>
            <span className={`qp-mobile-status-pill ${mobile.pinEnabled ? "is-ok" : ""}`}><ShieldCheck size={15}/>{mobile.pinEnabled ? "Yoqilgan" : "O‘chiq"}</span>
          </SettingRow>
          {mobile.pinEnabled ? (
            <>
              <Field label="Avtomatik bloklash"><Select value={String(mobile.autoLockMinutes || 0)} onChange={(event) => setSetting("mobile", "autoLockMinutes", Number(event.target.value))}><option value="0">Faqat yangi sessiyada</option><option value="1">1 daqiqadan keyin</option><option value="5">5 daqiqadan keyin</option><option value="10">10 daqiqadan keyin</option><option value="15">15 daqiqadan keyin</option><option value="30">30 daqiqadan keyin</option></Select></Field>
              <div className="qp-form-actions"><SecondaryButton type="button" onClick={removePin}>PIN-kodni o‘chirish</SecondaryButton></div>
            </>
          ) : (
            <div className="qp-form-grid qp-settings-inline-form">
              <Field label="Yangi PIN"><input className="qp-input" inputMode="numeric" type="password" autoComplete="new-password" maxLength={6} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6 ta raqam" /></Field>
              <Field label="PIN-ni takrorlang"><input className="qp-input" inputMode="numeric" type="password" autoComplete="new-password" maxLength={6} value={pinConfirm} onChange={(event) => setPinConfirm(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6 ta raqam" /></Field>
              <div className="qp-form-span-full qp-form-actions"><PrimaryButton type="button" disabled={pinBusy || pin.length !== 6 || pinConfirm.length !== 6} onClick={savePin}>{pinBusy ? "Saqlanmoqda..." : "PIN-kodni yoqish"}</PrimaryButton></div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function DocumentsSettings({ db }) {
  return (
    <SectionCard title="Hujjatlar" description="Hujjat raqamlari yangi yozuvlarda darhol ishlatiladi.">
      <div className="qp-settings-panel">
        <div className="qp-form-grid qp-settings-inline-form">
          <Field label="Buyurtma prefiksi"><input className="qp-input" value={db.settings.documents.orderPrefix} onChange={(event) => setSetting("documents", "orderPrefix", event.target.value.toUpperCase())} /></Field>
          <Field label="Hisob-faktura prefiksi"><input className="qp-input" value={db.settings.documents.invoicePrefix} onChange={(event) => setSetting("documents", "invoicePrefix", event.target.value.toUpperCase())} /></Field>
          <Field label="To‘lov prefiksi"><input className="qp-input" value={db.settings.documents.paymentPrefix} onChange={(event) => setSetting("documents", "paymentPrefix", event.target.value.toUpperCase())} /></Field>
          <Field label="Qaytarish prefiksi"><input className="qp-input" value={db.settings.documents.returnPrefix} onChange={(event) => setSetting("documents", "returnPrefix", event.target.value.toUpperCase())} /></Field>
        </div>
      </div>
    </SectionCard>
  );
}

function LocaleSettings({ db }) {
  return (
    <SectionCard title="Til va hudud" description="Sana va pul formatlari platformadagi formatterlarda ishlatiladi.">
      <div className="qp-settings-panel qp-form-grid">
        <Field label="Til"><Select value={db.settings.locale.language} onChange={(event) => { setSetting("locale", "language", event.target.value); setSetting("company", "language", event.target.value); }}>{["uz","ru","tg","kk"].map((code) => <option key={code} value={code}>{getLanguageLabel(code, db.settings.locale.language)}</option>)}</Select></Field>
        <Field label="Sana ko‘rinishi"><Select value={db.settings.locale.dateFormat} onChange={(event) => setSetting("locale", "dateFormat", event.target.value)}><option value="DD.MM.YYYY">31.12.2026</option><option value="YYYY-MM-DD">2026-12-31</option></Select></Field>
        <Field label="Soat ko‘rinishi"><Select value={db.settings.locale.timeFormat} onChange={(event) => setSetting("locale", "timeFormat", event.target.value)}><option value="24h">24 soatlik</option><option value="12h">12 soatlik</option></Select></Field>
        <Field label="Vaqt mintaqasi"><input className="qp-input" value={db.settings.company.timezone} onChange={(event) => setSetting("company", "timezone", event.target.value)} /></Field>
        <Field label="Valyuta manbasi"><input className="qp-input" value="Google Finance" disabled /></Field>
        <Field label="Yuqori panelda kurslar"><Select value={db.settings.currency?.showInHeader === false ? "OFF" : "ON"} onChange={(event) => setSetting("currency", "showInHeader", event.target.value === "ON")}><option value="ON">Ko‘rsatilsin</option><option value="OFF">Yashirilsin</option></Select></Field>
      </div>
    </SectionCard>
  );
}


function MapsSettings({ db }) {
  return (
    <div className="qp-stack">
      <SectionCard title="Xarita va navigatsiya" description="Marshrutlar, agentlar va yetkazib berish sahifalaridagi xarita ishlashini boshqaring.">
        <div className="qp-settings-panel qp-form-grid">
          <Field label="Xarita xizmati"><input className="qp-input" value="Yandex Maps" disabled /></Field>
          <Field label="Standart navigatsiya"><Select value={db.settings.maps?.navigationApp || "ASK"} onChange={(event) => setSetting("maps", "navigationApp", event.target.value)}><option value="ASK">Har safar so‘rash</option><option value="YANDEX_NAVIGATOR">Yandex Navigator</option><option value="YANDEX_MAPS">Yandex Maps</option><option value="YANDEX_GO">Yandex Go</option><option value="GOOGLE_MAPS">Google Maps</option><option value="APPLE_MAPS">Apple Maps</option></Select></Field>
          <Field label="Standart kattalashtirish"><input className="qp-input" type="number" min="6" max="18" value={db.settings.maps?.defaultZoom || 12} onChange={(event) => setSetting("maps", "defaultZoom", Number(event.target.value))} /></Field>
          <Field label="Hudud chegarasi (metr)"><input className="qp-input" type="number" min="20" max="5000" value={db.settings.maps?.geofenceMeters || 250} onChange={(event) => setSetting("maps", "geofenceMeters", Number(event.target.value))} /></Field>
        </div>
        <div className="qp-settings-panel" style={{ marginTop: 12 }}>
          <SettingRow title="Tirbandlik qatlamiga tayyor" description="API kaliti va xarita xizmati imkon bersa, tirbandlik qatlamidan foydalanish"><Toggle value={Boolean(db.settings.maps?.showTraffic)} onChange={(value) => setSetting("maps", "showTraffic", value)} /></SettingRow>
        </div>
      </SectionCard>
      <SectionCard title="Yandex Maps API holati" description="Interfeys integratsiyasi tayyor; haqiqiy xarita uchun API kaliti .env faylida bo‘lishi kerak.">
        <div className="qp-settings-panel"><SettingRow title="VITE_YANDEX_MAPS_API_KEY" description="Kalit kod ichiga yozilmaydi, .env orqali ulanadi"><strong>{import.meta.env.VITE_YANDEX_MAPS_API_KEY ? "Ulangan" : "Hali kiritilmagan"}</strong></SettingRow></div>
      </SectionCard>
    </div>
  );
}

function DataSettings() {
  const download = () => {
    const blob = new Blob([exportLocalDb()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `qulay-zaxira-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Ma’lumotlar fayli tayyorlandi");
  };

  return (
    <SectionCard title="Ma’lumotlar" description="Backenddan yuklangan joriy ma’lumotlarning o‘qish uchun JSON nusxasi.">
      <div className="qp-settings-panel">
        <SettingRow title="Zaxira faylini yuklab olish" description="Barcha joriy ma’lumotlarni JSON faylga saqlaydi"><SecondaryButton onClick={download}><Download size={15} /> Yuklab olish</SecondaryButton></SettingRow>
      </div>
    </SectionCard>
  );
}

function SystemSettings({ db }) {
  const bytes = new Blob([exportLocalDb()]).size;
  return (
    <div className="qp-stack">
      <SectionCard title="Tizim holati">
        <div className="qp-settings-panel">
          <SettingRow title="Ma’lumotlar versiyasi" description="Mahalliy ma’lumotlar tuzilmasi"><strong>v{db.meta?.version || 3}</strong></SettingRow>
          <SettingRow title="Saqlash usuli" description="Business source-of-truth"><strong>Backend API · PostgreSQL</strong></SettingRow>
          <SettingRow title="Ma’lumot hajmi" description="Joriy ma’lumotlar holatining taxminiy hajmi"><strong>{Math.max(1, Math.round(bytes / 1024))} KB</strong></SettingRow>
          <SettingRow title="Oxirgi ochilgan vaqt" description="Joriy ma’lumotlar holati"><strong>{db.meta?.lastOpenedAt ? formatDateTime(db.meta.lastOpenedAt) : "—"}</strong></SettingRow>
        </div>
      </SectionCard>
    </div>
  );
}

function SettingsContent({ section, db }) {
  if (section === "appearance") return <AppearanceSettings db={db} />;
  if (section === "modules") return <ModulesSettings db={db} />;
  if (section === "general") return <GeneralSettings db={db} />;
  if (section === "sales") return <SalesSettings db={db} />;
  if (section === "pos") return <PosSettings db={db} />;
  if (section === "payment-methods") return <PaymentMethodsSettings db={db} />;
  if (section === "documents") return <DocumentsSettings db={db} />;
  if (section === "maps") return <MapsSettings db={db} />;
  if (section === "locale") return <LocaleSettings db={db} />;
  if (section === "mobile") return <MobileSettings db={db} />;
  if (section === "data") return <DataSettings />;
  if (section === "system") return <SystemSettings db={db} />;

  const configs = {
    inventory: [
      ["allowNegativeStock", "Manfiy qoldiq", "Qoldiq yetarli bo‘lmasa ham operatsiyaga ruxsat"],
      ["reservations", "Mahsulotni band qilish", "Tasdiqlangan buyurtmalar uchun mahsulot miqdorini band qiladi"],
      ["lowStockAlerts", "Kam qoldiq ogohlantirishi", "Minimal qoldiqdan past bo‘lganda signal"],
      ["requireTransferApproval", "Ko‘chirish tasdig‘i", "Ko‘chirish avval tasdiq kutadi"],
      ["requireAdjustmentApproval", "Qoldiq tuzatish tasdig‘i", "Qoldiq tuzatish avval tasdiq kutadi"],
    ],
    agents: [
      ["showDailyProgress", "Agent natijalarini ko‘rsatish", "Owner agentlar bo‘limida kunlik tashrif, buyurtma va savdo ko‘rsatkichlarini ko‘radi"],
    ],
    delivery: [
      ["allowPartialDelivery", "Qisman yetkazish", "Buyurtmaning bir qismini topshirishga ruxsat"],
      ["requireFailureReason", "Muvaffaqiyatsiz sabab", "Yetkazilmaganda sabab majburiy"],
      ["requireRecipientName", "Qabul qiluvchi ismi", "Yetkazishda qabul qilgan shaxsni yozish"],
      ["requirePhoto", "Foto tasdiq", "Yetkazilganda foto talab qilish"],
      ["requireGps", "GPS tasdiq", "Yetkazish joylashuvini talab qilish"],
      ["showDriverWorkload", "Haydovchi yuklamasi", "Reys va topshiriqlarda yuklama ko‘rsatish"],
    ],
    finance: [
      ["allowCreditSales", "Nasiya savdo", "Mijoz qarzdor bo‘lib qolishiga ruxsat"],
      ["enforceCreditLimit", "Kredit limitini tekshirish", "Limitdan oshsa yangi buyurtma bloklanadi"],
      ["blockOverdueOrders", "Muddati o‘tgan qarzda bloklash", "Qarzli mijozga yangi buyurtmani cheklash"],
      ["requirePaymentConfirmation", "To‘lov tasdig‘i", "To‘lov alohida tasdiq holatida yaratiladi"],
    ],
    notifications: [
      ["lowStock", "Kam qoldiq", "Mahsulot kamayganda ogohlantirish"],
      ["overdueDebt", "Qarzdorlik", "Mijoz qarzi bo‘yicha signal"],
      ["failedDelivery", "Yetkazib berish muammosi", "Muvaffaqiyatsiz yetkazish haqida signal"],
      ["payment", "To‘lov", "Yangi to‘lov haqida bildirishnoma"],
      ["newOrder", "Yangi buyurtma", "Yangi savdo buyurtmasi haqida bildirishnoma"],
      ["browser", "Interfeys bildirishnomalari", "Yuqori panel va qisqa bildirishnoma orqali ko‘rsatish"],
      ["sound", "Ovozli signal", "Tezkor bildirishnomalar uchun ovoz"],
    ],
  };
  return <ToggleList section={section} items={configs[section] || []} db={db} />;
}

function SettingsPage({ section = "general" }) {
  const db = useLocalDb();
  return (
    <PageShell title="Sozlamalar" description="Qulayni kompaniyangizning ish uslubi, qoidalari va vizual ko‘rinishiga moslashtiring." eyebrow="Tizim">
      <SettingsContent section={section} db={db} />
    </PageShell>
  );
}

export default SettingsPage;
