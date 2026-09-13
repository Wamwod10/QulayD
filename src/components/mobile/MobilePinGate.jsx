import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import PinKeypad from "./PinKeypad";
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
  const [busy, setBusy] = useState(false);
  const [failedPins, setFailedPins] = useState(0);
  const [lockSeconds, setLockSeconds] = useState(0);
  const timerRef = useRef(0);
  const autoLockMinutes = Math.max(0, Number(mobile.autoLockMinutes || 0));

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
    const onVisibility = () => { if (document.visibilityState === "visible") armTimer(); };
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
    if (!lockSeconds) return undefined;
    const timer = window.setInterval(() => setLockSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  const unlock = useCallback(async () => {
    if (pin.length !== 6 || busy || lockSeconds) return;
    setBusy(true);
    const ok = await verifyDevicePin(pin, mobile.pinHash);
    if (!ok) {
      const nextFailures = failedPins + 1;
      setFailedPins(nextFailures >= 5 ? 0 : nextFailures);
      if (nextFailures >= 5) setLockSeconds(30);
      setError("PIN noto‘g‘ri");
      setPin("");
      setBusy(false);
      return;
    }
    markDeviceUnlocked();
    setError("");
    setPin("");
    setLocked(false);
    setBusy(false);
  }, [busy, failedPins, lockSeconds, mobile.pinHash, pin]);

  useEffect(() => {
    if (locked && pin.length === 6 && !busy && !lockSeconds) unlock();
  }, [busy, lockSeconds, locked, pin, unlock]);

  if (!pinEnabled || !locked) return null;

  return (
    <div className="qp-device-lock" role="dialog" aria-modal="true" aria-label="Qulay qurilma qulfi">
      <div className="qp-device-lock-card">
        <div className="qp-device-lock-brand">
          {db.settings.company?.logo ? <img src={db.settings.company.logo} alt="" /> : <span><ShieldCheck size={24}/></span>}
          <div><strong>{db.settings.company?.name || "Qulay"}</strong><small>Qurilma xavfsizligi</small></div>
        </div>
        <div className="qp-device-lock-copy"><LockKeyhole size={26}/><h1>PIN-kodni kiriting</h1><p>Qulay’ni davom ettirish uchun ushbu qurilmaning 6 xonali PIN-kodini kiriting.</p></div>
        <PinKeypad value={pin} onChange={(value) => { setPin(value); setError(""); }} disabled={busy} error={error} lockSeconds={lockSeconds} />
        <div className="qp-auth-pin-hint">6-raqam kiritilganda avtomatik ochiladi</div>
      </div>
    </div>
  );
}

export default MobilePinGate;
