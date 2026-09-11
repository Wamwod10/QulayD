import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState } from "react";

import { Field, PrimaryButton } from "../../../components/prototype/PrototypeUI";

function LoginForm({ onSubmit, loading = false, error = "" }) {
  const [form, setForm] = useState({ phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    onSubmit?.(form);
  };

  return (
    <form className="qp-auth-form" onSubmit={submit}>
      {error ? <div className="qp-auth-error">{error}</div> : null}
      <Field label="Telefon raqami">
        <input className="qp-input" inputMode="tel" autoComplete="username" placeholder="+998 90 123 45 67" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
      </Field>
      <Field label="Parol">
        <div className="qp-password-field">
          <input className="qp-input" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Parolingizni kiriting" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          <button type="button" aria-label="Parolni ko‘rsatish" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
      </Field>
      <PrimaryButton className="qp-auth-submit" type="submit" disabled={loading}><LogIn size={17} /> {loading ? "Kirilmoqda..." : "Kirish"}</PrimaryButton>
    </form>
  );
}

export default LoginForm;
