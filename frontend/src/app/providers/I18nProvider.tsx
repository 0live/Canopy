import { DEFAULT_LOCALE, STORAGE_KEY } from "@/app/config/i18n";
import type { Locale } from "@/shared/types/Locale";
import { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type I18nProviderProps = {
  children: React.ReactNode;
  defaultLocale?: Locale;
  storageKey?: string;
};

type I18nProviderState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const initialState: I18nProviderState = {
  locale: "en",
  setLocale: () => null,
};

const I18nProviderContext = createContext<I18nProviderState>(initialState);

export function I18nProvider({
  children,
  defaultLocale = DEFAULT_LOCALE,
  storageKey = STORAGE_KEY,
  ...props
}: I18nProviderProps) {
  const { i18n } = useTranslation();

  const [locale, setLocaleState] = useState<Locale>(() => {
    const storedValue = localStorage.getItem(storageKey);
    // Determine initial locale taking into account stored preference or user's browser default if no preference is stored
    if (storedValue === "en" || storedValue === "fr") {
      return storedValue;
    }
    
    // Check if browser preference matches supported languages if no storage
    const browserLang = navigator.language.split('-')[0];
    if(browserLang === "fr") {
      return "fr";
    }

    return defaultLocale;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.lang = locale;
    
    // Ensure i18next is synced with the state
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  const value = {
    locale,
    setLocale: (newLocale: Locale) => {
      localStorage.setItem(storageKey, newLocale);
      setLocaleState(newLocale);
    },
  };

  return (
    <I18nProviderContext.Provider {...props} value={value}>
      {children}
    </I18nProviderContext.Provider>
  );
}

export const useI18n = () => {
  const context = useContext(I18nProviderContext);

  if (context === undefined)
    throw new Error("useI18n must be used within a I18nProvider");

  return context;
};
