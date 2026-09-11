const DEVICE_UNLOCK_KEY = "qulay-device-unlocked";

export async function hashDevicePin(pin) {
  const normalized = String(pin || "").replace(/\D/g, "").slice(0, 6);
  if (normalized.length !== 6) throw new Error("PIN 6 ta raqamdan iborat bo‘lishi kerak");
  if (!globalThis.crypto?.subtle) throw new Error("Bu brauzer xavfsiz PIN saqlashni qo‘llamaydi");
  const bytes = new TextEncoder().encode(`qulay-device-pin:${normalized}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function verifyDevicePin(pin, expectedHash) {
  if (!expectedHash) return false;
  try {
    return (await hashDevicePin(pin)) === expectedHash;
  } catch {
    return false;
  }
}

export function markDeviceUnlocked() {
  try { window.sessionStorage.setItem(DEVICE_UNLOCK_KEY, "1"); } catch { /* sessionStorage can be blocked */ }
}

export function clearDeviceUnlock() {
  try { window.sessionStorage.removeItem(DEVICE_UNLOCK_KEY); } catch { /* sessionStorage can be blocked */ }
}

export function isDeviceUnlocked() {
  try { return window.sessionStorage.getItem(DEVICE_UNLOCK_KEY) === "1"; } catch { return false; }
}
