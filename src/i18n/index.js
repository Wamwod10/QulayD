import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { resources } from "./translations";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "uz",
    fallbackLng: "uz",
    defaultNS: "common",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
export { getLanguageLabel, languageOptions, translateRuntimeText } from "./translations";
