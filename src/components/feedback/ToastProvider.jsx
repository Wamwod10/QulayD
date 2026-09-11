import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

import { NOTIFY_EVENT_NAME } from "../../services/notify";
import { useLocalDb } from "../../services/localDb";

const icons = {
  success: CheckCircle2,
  danger: CircleAlert,
  warning: CircleAlert,
  info: Info,
};

function playSoftTone() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 620;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.13);
    window.setTimeout(() => context.close(), 180);
  } catch {
    // Brauzer ovozga ruxsat bermasa bildirishnoma ovozsiz davom etadi.
  }
}

function ToastProvider() {
  const [toast, setToast] = useState(null);
  const notificationSettings = useLocalDb((db) => db.settings.notifications);

  useEffect(() => {
    let timer;
    const handleToast = (event) => {
      if (notificationSettings.browser === false) return;
      window.clearTimeout(timer);
      setToast(event.detail);
      if (notificationSettings.sound === true) playSoftTone();
      timer = window.setTimeout(() => setToast(null), 3200);
    };
    window.addEventListener(NOTIFY_EVENT_NAME, handleToast);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(NOTIFY_EVENT_NAME, handleToast);
    };
  }, [notificationSettings.browser, notificationSettings.sound]);

  if (!toast) return null;
  const Icon = icons[toast.tone] || Info;

  return (
    <div className={`qp-global-toast qp-global-toast-${toast.tone || "info"}`} role="status">
      <Icon size={18} strokeWidth={2} />
      <span>{toast.message}</span>
      <button type="button" onClick={() => setToast(null)} aria-label="Bildirishnomani yopish"><X size={15} /></button>
    </div>
  );
}

export default ToastProvider;
