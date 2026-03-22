import enTranslation from "@/shared/locales/en/translation.json";
import frTranslation from "@/shared/locales/fr/translation.json";
import type { Locale } from "@/shared/types/Locale";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const SUPPORTED_LOCALES: Locale[] = ["en", "fr"];
export const STORAGE_KEY = "canopy-locale";
export const DEFAULT_LOCALE: Locale = "en";

// Resolve locale before React mounts so loaders get the correct language
function resolveInitialLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
    return stored as Locale;
  }

  const browserLang = navigator.language.split("-")[0];
  if (SUPPORTED_LOCALES.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }

  return DEFAULT_LOCALE;
}

const resources = {
  en: {
    translation: enTranslation,
  },
  fr: {
    translation: frTranslation,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
