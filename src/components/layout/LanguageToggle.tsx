'use client';

import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className="group p-2 rounded-xl text-text-muted hover:text-primary hover:bg-primary/10 transition-all duration-200 relative"
      aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      <Languages className="w-5 h-5 shrink-0" />
      <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-primary text-white px-0.5 rounded-sm leading-none">
        {lang === 'ar' ? 'EN' : 'AR'}
      </span>
    </button>
  );
}
