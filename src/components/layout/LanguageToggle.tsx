"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Languages, Globe } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang, isRTL } = useLanguage();

  return (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="relative p-2 rounded-xl text-text-muted hover:text-primary hover:bg-primary/10 transition-all duration-200 group"
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Globe className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
      <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold bg-gradient-to-r from-primary to-secondary text-white px-1 rounded-sm leading-none shadow-sm">
        {lang === "ar" ? "EN" : "AR"}
      </span>
    </button>
  );
}