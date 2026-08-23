import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import {
  FALLBACK_LOCALE,
  SUPPORTED_LOCALE_CODES,
} from "@/i18n/locales";
import en from "@/i18n/locales/en.json";
import pa from "@/i18n/locales/pa.json";

const resources = {
  en: { translation: en },
  pa: { translation: pa },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: FALLBACK_LOCALE,
  fallbackLng: FALLBACK_LOCALE,
  supportedLngs: SUPPORTED_LOCALE_CODES,
  load: "currentOnly",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
