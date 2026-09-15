import { Eye, EyeOff, LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import PinKeypad from "../../../components/mobile/PinKeypad";
import { Field, PrimaryButton } from "../../../components/prototype/PrototypeUI";

function LoginForm({ onSubmit, loading = false, error = "" }) {
  const [form, setForm] = useState({ identifier: "", password: "", pin: "", mode: "password" });
  const [failedPins, setFailedPins] = useState(0);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const lastSubmittedPin = useRef("");

  useEffect(() => {
    if (!lockSeconds) return undefined;
    const timer = window.setInterval(() => setLockSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  useEffect(() => {
    if (form.mode !== "pin" || !error || !lastSubmittedPin.current) return;
    const nextFailures = failedPins + 1;
    setFailedPins(nextFailures >= 5 ? 0 : nextFailures);
    if (nextFailures >= 5) setLockSeconds(30);
    setForm((current) => ({ ...current, pin: "" }));
    lastSubmittedPin.current = "";
  }, [error, failedPins, form.mode]);

  const submit = (event) => {
    event.preventDefault();
    if (loading || lockSeconds) return;
    if (form.mode === "password") { onSubmit?.(form); return; }
    if (form.pin.length !== 6) return;
    lastSubmittedPin.current = form.pin;
    onSubmit?.(form);
  };

  const setMode = (mode) => {
    lastSubmittedPin.current = "";
    setForm((current) => ({ ...current, mode, pin: "", password: mode === "pin" ? "" : current.password }));
  };

  return (
    <form className="qp-auth-form" onSubmit={submit}>
      {error && form.mode === "password" ? <div className="qp-auth-error">{error}</div> : null}
      <div className="qp-auth-mode">
        <button type="button" className={form.mode === "password" ? "active" : ""} onClick={() => setMode("password")}>Login + parol</button>
        <button type="button" className={form.mode === "pin" ? "active" : ""} onClick={() => setMode("pin")}>PIN</button>
      </div>
      {form.mode === "password" ? <>
        <Field label="Login yoki telefon">
          <input className="qp-input" autoComplete="username" placeholder="Login yoki +998 90 123 45 67" value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} required />
        </Field>
        <Field label="Parol">
          <div className="qp-password-field">
            <input className="qp-input" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Parolingizni kiriting" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            <button type="button" aria-label="Parolni ko‘rsatish" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
        </Field>
        <PrimaryButton className="qp-auth-submit" type="submit" disabled={loading}><LogIn size={17} /> {loading ? "Kirilmoqda..." : "Kirish"}</PrimaryButton>
      </> : <>
        <Field label="Login yoki telefon">
          <input className="qp-input" autoComplete="username" placeholder="Login yoki +998 90 123 45 67" value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} required />
        </Field>
        <PinKeypad value={form.pin} onChange={(pin) => { lastSubmittedPin.current = ""; setForm({ ...form, pin }); }} disabled={loading} error={error} lockSeconds={lockSeconds} maxLength={6} label="6 xonali PIN" />
        <div className="qp-auth-pin-hint">Xodimga berilgan 6 xonali PINni kiriting.</div>
        <PrimaryButton className="qp-auth-submit" type="submit" disabled={loading || lockSeconds > 0 || form.pin.length !== 6}><LogIn size={17} /> {loading ? "Tekshirilmoqda..." : "PIN bilan kirish"}</PrimaryButton>
      </>}
    </form>
  );
}

export default LoginForm;
