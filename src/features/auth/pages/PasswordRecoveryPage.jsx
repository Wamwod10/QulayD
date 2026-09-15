import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Field, PrimaryButton } from "../../../components/prototype/PrototypeUI";
import { forgotPassword, resetPassword } from "../../../services/authService";

export default function PasswordRecoveryPage({ reset = false }) {
  const [params] = useSearchParams(); const navigate = useNavigate();
  const [identifier, setIdentifier] = useState(""); const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (reset) { const token = params.get("token"); if (!token) throw new Error("Tiklash havolasi yaroqsiz."); await resetPassword(token, password); navigate("/login", { replace: true }); }
      else { await forgotPassword(identifier); setMessage("Agar hisob mavjud bo‘lsa, tiklash yo‘riqnomasi yuborildi."); }
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  };
  return <div className="qp-auth-card"><div className="qp-auth-card-head"><span>Hisob xavfsizligi</span><h2>{reset ? "Yangi parol" : "Parolni tiklash"}</h2></div>
    <form className="qp-auth-form" onSubmit={submit}>{error ? <div className="qp-auth-error">{error}</div> : null}{message ? <div className="qp-auth-success">{message}</div> : null}
      {reset ? <Field label="Yangi parol" hint="Kamida 6 ta belgi"><input className="qp-input" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></Field>
        : <Field label="Login, telefon yoki email"><input className="qp-input" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required /></Field>}
      <PrimaryButton type="submit" disabled={busy}>{busy ? "Yuborilmoqda..." : reset ? "Parolni saqlash" : "Tiklash so‘rovini yuborish"}</PrimaryButton>
    </form><div className="qp-auth-footer"><Link to="/login">Kirishga qaytish</Link></div></div>;
}
