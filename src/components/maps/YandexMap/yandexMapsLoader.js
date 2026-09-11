let ymapsPromise;

export function loadYandexMaps(apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY) {
  if (typeof window === "undefined") return Promise.reject(new Error("Brauzer mavjud emas"));
  if (window.ymaps) return new Promise((resolve) => window.ymaps.ready(() => resolve(window.ymaps)));
  if (ymapsPromise) return ymapsPromise;
  ymapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const interfaceLanguage = document.documentElement.lang === "ru" ? "ru_RU" : "en_RU";
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=${interfaceLanguage}`;
    script.async = true;
    script.onload = () => window.ymaps?.ready(() => resolve(window.ymaps));
    script.onerror = () => reject(new Error("Yandex Maps yuklanmadi"));
    document.head.appendChild(script);
  });
  return ymapsPromise;
}
