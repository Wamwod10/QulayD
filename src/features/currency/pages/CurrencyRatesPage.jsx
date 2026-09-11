import { ArrowDownUp, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { Field, PageShell, PrimaryButton, SectionCard, StatusPill } from "../../../components/prototype/PrototypeUI";
import Select from "../../../components/ui/Select";
import { CURRENCIES, convertFromUzs, convertToUzs, currencyMeta, refreshCurrencyRates } from "../../../services/currencyService";
import { updateLocalDb, useLocalDb } from "../../../services/localDb";
import { notify } from "../../../services/notify";
import { formatDateTime, formatExchangeRateValue } from "../../../utils/formatters";

function CurrencyRatesPage() {
  const db = useLocalDb();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("1000000");
  const [from, setFrom] = useState("UZS");
  const [to, setTo] = useState("USD");
  const rates = useMemo(() => db.currencyRates?.rates || {}, [db.currencyRates?.rates]);
  const codes = CURRENCIES.map((item) => item.code);
  const converted = useMemo(() => convertFromUzs(convertToUzs(Number(amount) || 0, from, rates), to, rates), [amount, from, rates, to]);

  const refresh = async () => {
    setLoading(true);
    const result = await refreshCurrencyRates();
    notify(result.ok ? "Google Finance kurslari yangilandi" : "Jonli kurs olinmadi. Oxirgi saqlangan kurs ishlatilmoqda", result.ok ? "success" : "warning");
    setLoading(false);
  };
  const switchCurrencies = () => { setFrom(to); setTo(from); };
  const status = db.currencyRates?.status || "FALLBACK";
  const statusLabel = status === "LIVE" ? "Jonli kurs" : status === "CACHED" ? "Saqlangan kurs" : "Zaxira kurs";

  return <PageShell title="Valyuta kurslari" description="Google Finance bozor kurslari va kompaniya ko‘rinish valyutasini bitta joydan boshqaring." eyebrow="Moliya" actions={<PrimaryButton type="button" onClick={refresh} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> {loading ? "Yangilanmoqda" : "Kurslarni yangilash"}</PrimaryButton>}>
    <div className="qp-currency-statusbar"><div><StatusPill status={status === "LIVE" ? "ACTIVE" : "PENDING"} label={statusLabel}/><span>Manba: <strong>{db.currencyRates?.source || "Google Finance"}</strong></span></div><span>Oxirgi tekshiruv: {db.currencyRates?.checkedAt || db.currencyRates?.updatedAt ? formatDateTime(db.currencyRates.checkedAt || db.currencyRates.updatedAt) : "hali tekshirilmagan"}</span></div>
    <div className="qp-currency-head-grid">
      <SectionCard title="Kurslar" description="Ko‘rinish valyutasini tanlash uchun kartani bosing.">
        <div className="qp-currency-rate-grid qp-currency-rate-grid-v52">
          {CURRENCIES.map((currency) => {
            const isUzs = currency.code === "UZS";
            return <button key={currency.code} type="button" className={db.settings.company.currency === currency.code ? "active" : ""} onClick={() => updateLocalDb((draft) => { draft.settings.company.currency = currency.code; })}>
              <div className="qp-currency-rate-top"><span className="qp-currency-code">{currency.code}</span><span className="qp-currency-symbol">{currency.symbol}</span></div>
              <strong>{isUzs ? "1 so‘m" : `${formatExchangeRateValue(rates[currency.code])} so‘m`}</strong>
              <small>{isUzs ? "Asosiy hisob valyutasi" : `1 ${currency.code} uchun`}</small>
            </button>;
          })}
        </div>
      </SectionCard>

      <SectionCard title="Valyuta konverteri" description="Istalgan ikki qo‘llab-quvvatlangan valyuta orasida hisoblang.">
        <div className="qp-currency-converter qp-currency-converter-v52">
          <Field label="Summa"><input className="qp-input" type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
          <div className="qp-currency-converter-row"><Select value={from} onChange={(event) => setFrom(event.target.value)}>{codes.map((code) => <option key={code} value={code}>{code} — {currencyMeta(code).name}</option>)}</Select><button type="button" className="qp-icon-button qp-currency-swap" onClick={switchCurrencies} aria-label="Valyutalarni almashtirish"><ArrowDownUp size={17} /></button><Select value={to} onChange={(event) => setTo(event.target.value)}>{codes.map((code) => <option key={code} value={code}>{code} — {currencyMeta(code).name}</option>)}</Select></div>
          <div className="qp-currency-result qp-currency-result-v52"><span>Natija</span><strong>{new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 2 }).format(converted)} <em>{currencyMeta(to).symbol}</em></strong><small>{status === "LIVE" ? "Joriy Google Finance kursi" : "Oxirgi saqlangan yoki zaxira kurs"}</small></div>
        </div>
      </SectionCard>
    </div>
  </PageShell>;
}
export default CurrencyRatesPage;
