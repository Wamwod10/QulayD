import { Download, RefreshCw, Share2, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { useAuth } from "../hooks/useAuth";
import { notify } from "../services/notify";
import { isStandaloneMode } from "../utils/pwa";

const INSTALL_DISMISSED_KEY = "qulay.pwa.install.dismissedAt";
const INSTALL_DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(max-width: 767px)")?.matches || window.innerWidth < 768;
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "")
    || (navigator.platform === "MacIntel" && Number(navigator.maxTouchPoints || 0) > 1);
}

function installWasDismissedRecently() {
  if (typeof window === "undefined") return true;
  const timestamp = Number(window.localStorage.getItem(INSTALL_DISMISSED_KEY) || 0);
  return timestamp > 0 && Date.now() - timestamp < INSTALL_DISMISS_MS;
}

function PwaLifecycle() {
  const { isAuthenticated } = useAuth();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const registrationRef = useRef(null);
  const ios = useMemo(() => isIosDevice(), []);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration || null;
    },
    onRegisterError() {
      notify("Ilova yangilanish xizmatini ishga tushirib bo‘lmadi", "warning");
    },
  });

  useEffect(() => {
    const checkForUpdate = () => {
      if (document.visibilityState === "visible" && navigator.onLine) registrationRef.current?.update?.().catch(() => undefined);
    };
    const timer = window.setInterval(checkForUpdate, 15 * 60 * 1000);
    window.addEventListener("online", checkForUpdate);
    document.addEventListener("visibilitychange", checkForUpdate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", checkForUpdate);
      document.removeEventListener("visibilitychange", checkForUpdate);
    };
  }, []);

  useEffect(() => {
    if (!offlineReady) return;
    notify("Qulay ilova qobig‘i offline ochishga tayyor. Business amallar uchun internet kerak.", "success");
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const refreshVisibility = () => {
      const eligible = isAuthenticated
        && isMobileViewport()
        && !isStandaloneMode()
        && !installWasDismissedRecently();
      setShowInstall(eligible);
      if (!eligible) setShowIosHelp(false);
    };

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
      refreshVisibility();
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setShowInstall(false);
      setShowIosHelp(false);
      window.localStorage.removeItem(INSTALL_DISMISSED_KEY);
      notify("Qulay telefoningizga o‘rnatildi", "success");
    };
    const media = window.matchMedia?.("(max-width: 767px)");

    refreshVisibility();
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("resize", refreshVisibility);
    media?.addEventListener?.("change", refreshVisibility);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("resize", refreshVisibility);
      media?.removeEventListener?.("change", refreshVisibility);
    };
  }, [isAuthenticated]);

  const dismissInstall = () => {
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    setShowInstall(false);
    setShowIosHelp(false);
  };

  const requestInstall = async () => {
    if (installPrompt?.prompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice?.catch?.(() => null);
      if (choice?.outcome === "accepted") {
        setShowInstall(false);
        setInstallPrompt(null);
      }
      return;
    }
    if (ios) {
      setShowIosHelp(true);
      return;
    }
    notify("Brauzer menyusidan “Bosh ekranga qo‘shish” ni tanlang", "info");
  };

  if (needRefresh) {
    return (
      <div className="qp-pwa-update" role="status">
        <RefreshCw size={20} />
        <div><strong>Qulay yangilandi</strong><span>Yangi versiyani hozir qo‘llash mumkin.</span></div>
        <button type="button" className="qp-button qp-button-primary" onClick={() => updateServiceWorker(true)}>Yangilash</button>
        <button type="button" className="qp-icon-button" aria-label="Keyinroq" onClick={() => setNeedRefresh(false)}><X size={17} /></button>
      </div>
    );
  }

  if (!showInstall) return null;

  return (
    <div className={`qp-pwa-install ${showIosHelp ? "is-help" : ""}`} role="status">
      <div className="qp-pwa-install-icon"><Smartphone size={21} /></div>
      <div className="qp-pwa-install-copy">
        <strong>Qulayni ilova sifatida ishlating</strong>
        <span>{showIosHelp ? <>Safari’da <Share2 size={13} /> <b>Ulashish</b> → <b>Bosh ekranga qo‘shish</b> ni bosing.</> : "Bosh ekrandan bir tegishda ochiladi va brauzer panelisiz ishlaydi."}</span>
      </div>
      {!showIosHelp ? <button type="button" className="qp-button qp-button-primary qp-pwa-install-action" onClick={requestInstall}><Download size={16} /> O‘rnatish</button> : null}
      <button type="button" className="qp-icon-button qp-pwa-install-close" aria-label="Keyinroq" onClick={dismissInstall}><X size={17} /></button>
    </div>
  );
}

export default PwaLifecycle;
