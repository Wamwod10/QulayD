import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Field, PrimaryButton } from "../../../components/prototype/PrototypeUI";
import { useAuth } from "../../../hooks/useAuth";
import { getHomePathForUser } from "../../../services/authService";

function ChangePasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    setError("");
    if (form.next.length < 6) {
      setError("Yangi parol kamida 6 belgidan iborat bo‘lsin.");
      return;
    }
    if (form.next !== form.confirm) {
      setError("Yangi parollar bir-biriga mos kelmadi.");
      return;
    }
    setLoading(true);
    try {
      auth.changePassword(form.current, form.next);
      const destination = getHomePathForUser({ ...auth.user, mustChangePassword: false });
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || "Parolni o‘zgartirib bo‘lmadi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="qp-auth-card">
      <div className="qp-auth-card-head">
        <span>Xavfsizlik</span>
        <h2>Parolni yangilang</h2>
        <p>Vaqtinchalik parol o‘rniga faqat o‘zingiz biladigan yangi parol yarating.</p>
      </div>
      <form className="qp-auth-form" onSubmit={submit}>
        {error ? <div className="qp-auth-error">{error}</div> : null}
        <Field label="Joriy parol">
          <div className="qp-password-field">
            <input className="qp-input" type={show ? "text" : "password"} autoComplete="current-password" value={form.current} onChange={(event) => setForm({ ...form, current: event.target.value })} required />
            <button type="button" aria-label="Parolni ko‘rsatish" onClick={() => setShow((value) => !value)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
        </Field>
        <Field label="Yangi parol">
          <input className="qp-input" type={show ? "text" : "password"} autoComplete="new-password" value={form.next} onChange={(event) => setForm({ ...form, next: event.target.value })} required />
        </Field>
        <Field label="Yangi parolni takrorlang">
          <input className="qp-input" type={show ? "text" : "password"} autoComplete="new-password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} required />
        </Field>
        <PrimaryButton className="qp-auth-submit" type="submit" disabled={loading}><KeyRound size={17} /> {loading ? "Saqlanmoqda..." : "Parolni saqlash"}</PrimaryButton>
      </form>
    </div>
  );
}

export default ChangePasswordPage;
