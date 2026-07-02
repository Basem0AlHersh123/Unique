"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { translations, type TranslationKey } from "./translations";

type Language = "ar" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  dir: "rtl" | "ltr";
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = "unique_lang";

function formatEnglishKey(key: TranslationKey): string {
  const parts = key.split(".");
  return parts[parts.length - 1]
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      /* noop */
    }
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      if (lang === "en") {
        const enDict = translations.en;
        return enDict[key] ?? formatEnglishKey(key);
      }
      const arDict = translations.ar;
      return arDict[key] ?? key;
    },
    [lang]
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "ar" || stored === "en") {
        setLangState(stored);
        document.documentElement.lang = stored;
        document.documentElement.dir = stored === "ar" ? "rtl" : "ltr";
        return;
      }
    } catch {
      /* noop */
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, []);

  const dir = lang === "ar" ? "rtl" : "ltr";
  const isRTL = lang === "ar";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}