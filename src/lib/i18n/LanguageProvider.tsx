'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { translations, type TranslationKey } from './translations';

type Language = 'ar' | 'en';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  dir: 'rtl' | 'ltr';
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'unique_lang';

function getInitialLanguage(): Language {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
    const navLang = navigator.language?.slice(0, 2);
    if (navLang === 'ar') return 'ar';
  }
  return 'ar';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLanguage);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const dict = translations[lang] ?? translations.ar;
      return dict[key] ?? key;
    },
    [lang],
  );

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isRTL = lang === 'ar';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
