import { Delete, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { clearDeviceUnlock, isDeviceUnlocked, markDeviceUnlocked, verifyDevicePin } from "../../utils/deviceSecurity";
import { useLocalDb } from "../../services/localDb";

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart"];

function MobilePinGate() {
  const db = useLocalDb();
  const mobile = db.settings.mobile || {};
  const pinEnabled = mobile.pinEnabled === true && Boolean(mobile.pinHash);
  const [locked, setLocked] = useState(() => pinEnabled && !isDeviceUnlocked());
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const timerRef = useRef(0);
  const autoLockMinutes = Math.max(0, Number(mobile.autoLockMinutes || 0));
  const digits = useMemo(() => Array.from({ length: 6 }, (_, index) => pin[index] || ""), [pin]);

  useEffect(() => {
    if (!pinEnabled) {
      clearDeviceUnlock();
      setLocked(false);
      setPin("");
      return;
    }
    if (!isDeviceUnlocked()) setLocked(true);
  }, [pinEnabled, mobile.pinHash]);

  useEffect(() => {
    if (!pinEnabled || locked || autoLockMinutes <= 0) return undefined;
    const clearTimer = () => window.clearTimeout(timerRef.current);
    const lockNow = () => {
      clearDeviceUnlock();
      setPin("");
      setLocked(true);
    };
    const armTimer = () => {
      clearTimer();
      timerRef.current = window.setTimeout(lockNow, autoLockMinutes * 60 * 1000);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") armTimer();
    };
    ACTIVITY_EVENTS.forEach((eventName) => window.addEventListener(eventName, armTimer, { passive: true }));
    document.addEventListener("visibilitychange", onVisibility);
    armTimer();
    return () => {
      clearTimer();
      ACTIVITY_EVENTS.forEach((eventName) => window.removeEventListener(eventName, armTimer));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autoLockMinutes, locked, pinEnabled]);

  useEffect(() => {
    if (!locked) return undefined;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(focusTimer);
  }, [locked]);

  const unlock = async (event) => {
    event?.preventDefault();
    if (pin.length !== 6) return;
    const ok = await verifyDevicePin(pin, mobile.pinHash);
    if (!ok) {
      setError("PIN noto‘g‘ri");
      setPin("");
      inputRef.current?.focus();
      return;
    }
    markDeviceUnlocked();
    setError("");
    setPin("");
    setLocked(false);
  };

  if (!pinEnabled || !locked) return null;

  return (
    <div className="qp-device-lock" role="dialog" aria-modal="true" aria-label="Qulay qurilma qulfi">
      <form className="qp-device-lock-card" onSubmit={unlock}>
        <div className="qp-device-lock-brand">
          {db.settings.company?.logo ? <img src={db.settings.company.logo} alt="" /> : <span><ShieldCheck size={24}/></span>}
          <div><strong>{db.settings.company?.name || "Qulay"}</strong><small>Qurilma xavfsizligi</small></div>
        </div>
        <div className="qp-device-lock-copy"><LockKeyhole size={26}/><h1>PIN-kodni kiriting</h1><p>Qulay’ni davom ettirish uchun ushbu qurilmaning 6 xonali PIN-kodini kiriting.</p></div>
        <label className="qp-device-pin-input">
          <span className="qp-sr-only">PIN-kod</span>
          <div aria-hidden="true">{digits.map((digit, index) => <i key={index} className={digit ? "filled" : ""}>{digit ? "•" : ""}</i>)}</div>
          <input ref={inputRef} value={pin} onChange={(event) => { setPin(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} inputMode="numeric" autoComplete="off" maxLength={6} />
        </label>
        {error ? <div className="qp-device-lock-error">{error}</div> : null}
        <div className="qp-device-pin-actions">
          <button type="button" onClick={() => setPin((value) => value.slice(0, -1))} aria-label="Oxirgi raqamni o‘chirish"><Delete size={17}/></button>
          <button type="submit" disabled={pin.length !== 6}>Qulfni ochish</button>
        </div>
      </form>
    </div>
  );
}

export default MobilePinGate;
