import { Boxes, Check, CheckCircle2, Languages, ShieldCheck } from "lucide-react";
import { Outlet } from "react-router-dom";

import { getLanguageLabel } from "../../i18n";
import { updateLocalDb, useLocalDb } from "../../services/localDb";
import "./AuthLayout.scss";

const languageOptions = ["uz", "ru", "tg", "kk"];

function AuthLayout() {
  const language = useLocalDb((db) => db.settings.locale?.language || "uz");

  const changeLanguage = (code) => {
    updateLocalDb((draft) => {
      draft.settings.locale.language = code;
      draft.settings.company.language = code;
    });
  };

  return (
    <div className="qp-auth-layout">
      <aside className="qp-auth-brand-panel">
        <div className="qp-auth-brand"><span>Q</span><strong>Qulay</strong></div>
        <div className="qp-auth-hero">
          <span className="qp-auth-kicker">Biznes boshqaruv platformasi</span>
          <h1>Biznesingiz o‘sadi. Qulay esa siz bilan birga kengayadi.</h1>
          <p>Savdo, ombor, agentlar, marshrutlar, yetkazib berish va moliyani bitta tizimda boshqaring.</p>
        </div>
        <div className="qp-auth-benefits">
          <div><ShieldCheck size={18} /><span><strong>Rolga mos panel</strong><small>Har bir xodim faqat o‘z ishini ko‘radi.</small></span></div>
          <div><Boxes size={18} /><span><strong>Modulli arxitektura</strong><small>Kichik biznesdan katta platformagacha.</small></span></div>
          <div><Languages size={18} /><span><strong>Ko‘p tilli</strong><small>O‘zbek, rus, tojik va qozoq tillari.</small></span></div>
          <div><CheckCircle2 size={18} /><span><strong>Bir manbali ma’lumot</strong><small>Bo‘limlar bir-biri bilan bog‘langan.</small></span></div>
        </div>
      </aside>
      <main className="qp-auth-main">
        <div className="qp-auth-language-switcher" aria-label="Interfeys tili">
          {languageOptions.map((code) => (
            <button key={code} type="button" className={language === code ? "active" : ""} onClick={() => changeLanguage(code)}>
              <span>{getLanguageLabel(code, language)}</span>{language === code ? <Check size={13} /> : null}
            </button>
          ))}
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export default AuthLayout;
