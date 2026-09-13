import { ArrowLeft, ArrowRight, Building2, Check, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

import { Field, PrimaryButton, SecondaryButton } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { getLanguageLabel } from "../../../i18n";
import { useLocalDb } from "../../../services/localDb";

function RegisterCompanyForm({ onSubmit, loading = false, error = "" }) {
  const interfaceLanguage = useLocalDb((db) => db.settings.locale?.language || "uz");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", phone: "", password: "", companyName: "", branchName: "Bosh filial", warehouseName: "Asosiy ombor", language: "uz", currency: "UZS", workMode: "SOLO" });
  const canContinue = useMemo(() => step === 1 ? form.name.trim() && form.phone.trim() && form.password.length >= 8 && /[A-Z]/.test(form.password) && /[a-z]/.test(form.password) && /\d/.test(form.password) : form.companyName.trim(), [form, step]);

  const submit = (event) => {
    event.preventDefault();
    if (step === 1) { setStep(2); return; }
    onSubmit?.(form);
  };

  return (
    <form className="qp-auth-form" onSubmit={submit}>
      <div className="qp-auth-stepper"><i className="active"/><i className={step === 2 ? "active" : ""}/></div>
      {error ? <div className="qp-auth-error">{error}</div> : null}
      {step === 1 ? <>
        <div className="qp-auth-card-head"><span>1-qadam</span><h2>Shaxsiy hisobingiz</h2><p>Qulay kompaniyangizning birinchi egasi sifatida sizni ro‘yxatdan o‘tkazamiz.</p></div>
        <Field label="Ism va familiya"><input className="qp-input" autoComplete="name" placeholder="Masalan: Shamshod Karimov" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Telefon raqami"><input className="qp-input" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></Field>
        <Field label="Parol" hint="Kamida 8 belgi, katta-kichik harf va raqam"><input className="qp-input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} /></Field>
      </> : <>
        <div className="qp-auth-card-head"><span>2-qadam</span><h2>Kompaniyani tayyorlaymiz</h2><p>Bu ma’lumotlarni keyinchalik Sozlamalardan o‘zgartira olasiz.</p></div>
        <Field label="Kompaniya nomi"><div className="qp-input-icon-wrap"><Building2 size={17}/><input className="qp-input" placeholder="Kompaniya nomi" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required /></div></Field>
        <div className="qp-form-grid"><Field label="Birinchi filial"><input className="qp-input" value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} placeholder="Bosh filial" /></Field><Field label="Asosiy ombor"><input className="qp-input" value={form.warehouseName} onChange={(e) => setForm({ ...form, warehouseName: e.target.value })} placeholder="Asosiy ombor" /></Field></div>
        <div className="qp-form-grid">
          <Field label="Asosiy til"><Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>{["uz","ru","tg","kk"].map((code) => <option key={code} value={code}>{getLanguageLabel(code, interfaceLanguage)}</option>)}</Select></Field>
          <Field label="Asosiy valyuta"><Select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="UZS">UZS — so‘m</option><option value="USD">USD — dollar</option><option value="EUR">EUR — yevro</option></Select></Field>
        </div>
        <Field label="Ishlash usuli"><Select value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })}><option value="SOLO">Hozircha o‘zim ishlayman</option><option value="TEAM">Jamoa bilan ishlayman</option></Select></Field>
        <div className="qp-auth-demo"><UserRound size={14}/> Xodimlarni keyin Sozlamalar → Xodimlar bo‘limidan qo‘shasiz; ularga real login, PIN va modul ruxsatlarini belgilashingiz mumkin.</div>
      </>}
      <div className="qp-auth-inline">
        {step === 2 ? <SecondaryButton type="button" onClick={() => setStep(1)}><ArrowLeft size={16}/> Orqaga</SecondaryButton> : <span/>}
        <PrimaryButton type="submit" disabled={!canContinue || loading}>{step === 1 ? <>Davom etish <ArrowRight size={16}/></> : <><Check size={16}/>{loading ? "Tayyorlanmoqda..." : "Kompaniyani yaratish"}</>}</PrimaryButton>
      </div>
    </form>
  );
}

export default RegisterCompanyForm;
