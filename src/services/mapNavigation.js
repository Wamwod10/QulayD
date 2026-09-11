export const NAVIGATION_APPS = [
  { id: "YANDEX_NAVIGATOR", label: "Yandex Navigator", description: "Mobil qurilmada avtomobil navigatsiyasi", mobileOnly: true },
  { id: "YANDEX_MAPS", label: "Yandex Maps", description: "Xaritada yo‘nalishni ochish" },
  { id: "YANDEX_GO", label: "Yandex Go", description: "Manzilga taksi chaqirish", mobilePreferred: true },
  { id: "GOOGLE_MAPS", label: "Google Maps", description: "Google yo‘nalishlari" },
  { id: "APPLE_MAPS", label: "Apple Maps", description: "Apple qurilmalari uchun", appleOnly: true },
];

function coord(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
export function getDeviceInfo() {
  if (typeof navigator === "undefined") return { mobile: false, apple: false, android: false };
  const ua = navigator.userAgent || "";
  const apple = /iPhone|iPad|iPod|Macintosh/i.test(ua);
  const android = /Android/i.test(ua);
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
  return { mobile, apple, android };
}
export function getAvailableNavigationApps() {
  const device = getDeviceInfo();
  return NAVIGATION_APPS.filter((app) => !app.appleOnly || device.apple).map((app) => ({ ...app, disabled: Boolean(app.mobileOnly && !device.mobile), disabledReason: app.mobileOnly && !device.mobile ? "Bu ilova haqiqiy telefonda ochiladi" : "" }));
}

export function buildNavigationUrl(appId, destination, origin) {
  const lat = coord(destination?.latitude), lon = coord(destination?.longitude);
  if (lat === null || lon === null) return "";
  const originLat = coord(origin?.latitude), originLon = coord(origin?.longitude);
  if (appId === "YANDEX_NAVIGATOR") {
    const params = new URLSearchParams({ lat_to: String(lat), lon_to: String(lon) });
    if (originLat !== null && originLon !== null) { params.set("lat_from", String(originLat)); params.set("lon_from", String(originLon)); }
    return `yandexnavi://build_route_on_map?${params.toString()}`;
  }
  if (appId === "YANDEX_MAPS") {
    const rtext = originLat !== null && originLon !== null ? `${originLat},${originLon}~${lat},${lon}` : `${lat},${lon}`;
    return `https://yandex.com/maps/?rtext=${encodeURIComponent(rtext)}&rtt=auto`;
  }
  if (appId === "YANDEX_GO") {
    const interfaceLanguage = typeof document !== "undefined" && document.documentElement.lang === "ru" ? "ru" : "uz";
    const params = new URLSearchParams({ "end-lat": String(lat), "end-lon": String(lon), ref: "qulayapp", appmetrica_tracking_id: "1178268795219780156", lang: interfaceLanguage });
    if (originLat !== null && originLon !== null) { params.set("start-lat", String(originLat)); params.set("start-lon", String(originLon)); }
    return `https://3.redirect.appmetrica.yandex.com/route?${params.toString()}`;
  }
  if (appId === "GOOGLE_MAPS") {
    const params = new URLSearchParams({ api: "1", destination: `${lat},${lon}`, travelmode: "driving", dir_action: "navigate" });
    if (originLat !== null && originLon !== null) params.set("origin", `${originLat},${originLon}`);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
  if (appId === "APPLE_MAPS") {
    const params = new URLSearchParams({ daddr: `${lat},${lon}`, dirflg: "d" });
    if (originLat !== null && originLon !== null) params.set("saddr", `${originLat},${originLon}`);
    return `https://maps.apple.com/?${params.toString()}`;
  }
  return "";
}

export function openNavigationApp(appId, destination, origin) {
  if (typeof window === "undefined") return { ok: false, message: "Brauzer muhiti topilmadi" };
  const app = getAvailableNavigationApps().find((item) => item.id === appId);
  if (app?.disabled) return { ok: false, message: app.disabledReason };
  const url = buildNavigationUrl(appId, destination, origin);
  if (!url) return { ok: false, message: "Manzil koordinatasi topilmadi" };
  const isHttp = /^https?:/i.test(url);
  if (isHttp) {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) window.location.href = url;
    return { ok: true };
  }
  let leftPage = false;
  const handleVisibility = () => {
    if (document.visibilityState === "hidden") leftPage = true;
  };
  document.addEventListener("visibilitychange", handleVisibility, { once: true });
  window.location.href = url;
  window.setTimeout(() => {
    document.removeEventListener("visibilitychange", handleVisibility);
    if (!leftPage && appId === "YANDEX_NAVIGATOR") {
      const fallbackUrl = buildNavigationUrl("YANDEX_MAPS", destination, origin);
      if (fallbackUrl) window.location.href = fallbackUrl;
    }
  }, 1400);
  return { ok: true, message: "Navigator ochilmasa Yandex Maps avtomatik ochiladi" };
}

export function requestCurrentLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) { reject(new Error("Qurilmada geolokatsiya mavjud emas")); return; }
    navigator.geolocation.getCurrentPosition((position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }), () => reject(new Error("Joriy joylashuvni olib bo‘lmadi")), { enableHighAccuracy: true, timeout: 9000, maximumAge: 20000, ...options });
  });
}
