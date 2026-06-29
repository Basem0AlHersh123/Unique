'use client';

import { useLanguage } from '@/lib/i18n/LanguageProvider';

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-surface-hover transition-colors"
      aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
    >
      {lang === 'ar' ? 'English' : 'العربية'}
    </button>
  );
}
