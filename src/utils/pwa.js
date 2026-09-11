export function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return Boolean(
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
    Reflect.get(window.navigator, "standalone") === true,
  );
}

export function openPosWorkspace(navigate) {
  if (typeof window === "undefined") return false;

  // Installed PWA and small-screen users should stay inside the same app window.
  if (isStandaloneMode() || window.innerWidth < 768) {
    navigate?.("/sales/pos");
    return true;
  }

  const posWindow = window.open("/sales/pos", "qulay-pos", "popup=yes,width=1440,height=960");
  if (posWindow) {
    try { posWindow.opener = null; } catch { /* Cross-origin opener protection is best-effort. */ }
    posWindow.focus?.();
    return true;
  }

  // Popup blockers should never make POS unreachable.
  navigate?.("/sales/pos");
  return false;
}
