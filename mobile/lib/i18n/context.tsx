import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
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

const STORAGE_KEY = "unique_mobile_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored === "ar" || stored === "en") {
        setLangState(stored);
      }
      setReady(true);
    });
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    SecureStore.setItemAsync(STORAGE_KEY, newLang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key] ?? key,
    [lang],
  );

  if (!ready) return null;

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";
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
