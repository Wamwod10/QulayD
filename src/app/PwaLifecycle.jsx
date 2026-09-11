import { RefreshCw, X } from "lucide-react";
import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { notify } from "../services/notify";

function PwaLifecycle() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError() {
      notify("Ilova yangilanish xizmatini ishga tushirib bo‘lmadi", "warning");
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    notify("Qulay offline ishlashga tayyor", "success");
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  if (!needRefresh) return null;

  return (
    <div className="qp-pwa-update" role="status">
      <RefreshCw size={20} />
      <div><strong>Qulay yangilandi</strong><span>Yangi versiyani hozir qo‘llash mumkin.</span></div>
      <button type="button" className="qp-button qp-button-primary" onClick={() => updateServiceWorker(true)}>Yangilash</button>
      <button type="button" className="qp-icon-button" aria-label="Keyinroq" onClick={() => setNeedRefresh(false)}><X size={17} /></button>
    </div>
  );
}

export default PwaLifecycle;
