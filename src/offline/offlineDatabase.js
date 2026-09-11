const KEY = "qulay.offline.v1";

function read() {
  if (typeof window === "undefined") return { queue: [], meta: {} };
  try { return JSON.parse(window.localStorage.getItem(KEY)) || { queue: [], meta: {} }; } catch { return { queue: [], meta: {} }; }
}
function write(value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("qulay:offline-change"));
}
export function getOfflineDb() { return read(); }
export function updateOfflineDb(mutator) { const db = read(); mutator(db); write(db); return db; }
export function clearOfflineDb() { write({ queue: [], meta: {} }); }
export function subscribeOfflineDb(listener) { window.addEventListener("qulay:offline-change", listener); return () => window.removeEventListener("qulay:offline-change", listener); }
