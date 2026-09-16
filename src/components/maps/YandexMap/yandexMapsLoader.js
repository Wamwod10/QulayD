let ymapsPromise;

export function loadYandexMaps(apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY) {
  if (typeof window === "undefined") return Promise.reject(new Error("Brauzer mavjud emas"));
  const normalizedKey = String(apiKey || "").trim();
  if (!normalizedKey) return Promise.reject(new Error("Yandex Maps API kaliti sozlanmagan"));
  if (window.ymaps) return new Promise((resolve) => window.ymaps.ready(() => resolve(window.ymaps)));
  if (ymapsPromise) return ymapsPromise;
  ymapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const interfaceLanguage = document.documentElement.lang === "ru" ? "ru_RU" : "en_RU";
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(normalizedKey)}&lang=${interfaceLanguage}`;
    script.async = true;
    script.onload = () => window.ymaps?.ready(() => resolve(window.ymaps));
    script.onerror = () => {
      ymapsPromise = undefined;
      script.remove();
      reject(new Error("Yandex Maps yuklanmadi"));
    };
    document.head.appendChild(script);
  });
  return ymapsPromise;
}
