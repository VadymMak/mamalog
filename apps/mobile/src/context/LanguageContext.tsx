import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import i18n from "../lib/i18n";
import { get, set } from "../lib/storage";
import {
  DEFAULT_LANGUAGE,
  STORAGE_KEYS,
  type SupportedLanguage,
} from "../lib/constants";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] =
    useState<SupportedLanguage>(DEFAULT_LANGUAGE);

  useEffect(() => {
    async function restore() {
      const saved = await get<SupportedLanguage>(STORAGE_KEYS.LANGUAGE);
      if (saved) {
        setLanguageState(saved);
        await i18n.changeLanguage(saved);
      }
    }
    restore();
  }, []);

  async function setLanguage(lang: SupportedLanguage) {
    await set(STORAGE_KEYS.LANGUAGE, lang);
    await i18n.changeLanguage(lang);
    setLanguageState(lang);
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx)
    throw new Error("useLanguageContext must be used within LanguageProvider");
  return ctx;
}
