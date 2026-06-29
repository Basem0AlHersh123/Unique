"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { apiFetch } from "@/lib/api";
import * as Icons from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageProvider';

interface College {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  isActive: boolean;
  comingSoon: boolean;
  icon: string;
  color: string;
  subjects: string[];
}

const iconMap: Record<string, React.ElementType> = Icons as unknown as Record<string, React.ElementType>;

export default function CollegesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useLanguage();

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<College[]>("/api/admin/colleges");
        setColleges((res.data ?? []).filter((c) => c.isActive));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="minimal" />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="minimal" />

      {/* Header */}
      <section className="border-b border-border/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary mb-4">
            {t('colleges.title')}
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {t('colleges.desc')}
          </p>
        </div>
      </section>

      {/* Colleges Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {colleges.length === 0 ? (
          <div className="text-center py-20">
            <Icons.GraduationCap className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">{t('colleges.empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {colleges.map((college) => {
              const IconComponent = iconMap[college.icon] || Icons.BookOpen;
              return (
                <Link
                  key={college._id}
                  href={`/colleges/${college.slug}`}
                  className="group block bg-surface rounded-2xl border border-border p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: college.color || "var(--color-primary)" }}
                    >
                      <IconComponent className="w-7 h-7" />
                    </div>
                    {college.comingSoon && (
                      <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                        {t('colleges.coming_soon')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-1">
                    {lang === 'ar'
                      ? (college.nameAr || college.name)
                      : (college.nameEn || college.name)}
                  </h3>
                  <p className="text-sm text-text-muted">
                    {college.subjects.length} {t('colleges.subjects')}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
