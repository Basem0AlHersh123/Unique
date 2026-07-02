"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ArrowLeft, Home, BookOpen } from "lucide-react";

export default function NotFound() {
  const { t, isRTL } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4">
      <div className="relative max-w-lg w-full">
        {/* Decorative elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative glass rounded-3xl p-8 sm:p-12 text-center border border-border/50 shadow-2xl">
          <div className="text-8xl sm:text-9xl font-extrabold gradient-text mb-2 animate-float">
            404
          </div>
          <div className="w-20 h-1 mx-auto bg-gradient-to-r from-primary to-secondary rounded-full mb-6" />

          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
            {isRTL ? "الصفحة غير موجودة" : "Page Not Found"}
          </h1>

          <p className="text-text-secondary mb-8 max-w-sm mx-auto leading-relaxed">
            {isRTL
              ? "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
              : "Sorry, the page you're looking for doesn't exist or has been moved."}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 font-medium"
            >
              <Home className="w-5 h-5" />
              {isRTL ? "العودة للرئيسية" : "Back to Home"}
            </Link>
            <Link
              href="/colleges"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface border-2 border-border text-text-primary hover:bg-surface-hover hover:border-primary/30 transition-all duration-300 font-medium"
            >
              <BookOpen className="w-5 h-5" />
              {isRTL ? "تصفح التخصصات" : "Browse Specializations"}
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-text-muted">
            <span className="w-8 h-px bg-border" />
            <span>{isRTL ? "UNIQUE — منصة التعلم الذكي" : "UNIQUE — Smart Learning Platform"}</span>
            <span className="w-8 h-px bg-border" />
          </div>
        </div>
      </div>
    </div>
  );
}