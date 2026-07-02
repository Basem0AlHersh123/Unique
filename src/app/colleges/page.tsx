"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { apiFetch } from "@/lib/api";
import * as Icons from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Search, GraduationCap } from "lucide-react";

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

const iconMap: Record<string, React.ElementType> = Icons as unknown as Record<
  string,
  React.ElementType
>;

export default function CollegesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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

  const filteredColleges = colleges.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (lang === "ar" ? c.nameAr || c.name : c.nameEn || c.name).toLowerCase();
    return name.includes(q);
  });

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

      {/* Header - Enhanced */}
      <section className="border-b border-border/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12 text-center relative">
          <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary mb-4 slide-up">
            {t("colleges.title")}
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto slide-up" style={{ animationDelay: "0.05s" }}>
            {t("colleges.desc")}
          </p>
        </div>
      </section>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-6 -mt-4 relative z-10">
        <div className="relative max-w-md mx-auto">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث عن تخصص..." : "Search specializations..."}
            className="w-full px-4 py-3 pr-12 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
          />
        </div>
      </div>

      {/* Colleges Grid - Enhanced */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {filteredColleges.length === 0 ? (
          <div className="text-center py-20">
            <GraduationCap className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
            <p className="text-text-muted text-lg">
              {search ? (lang === "ar" ? "لا توجد نتائج مطابقة" : "No matching results") : t("colleges.empty")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredColleges.map((college, i) => {
              const IconComponent = iconMap[college.icon] || Icons.BookOpen;
              return (
                <Link
                  key={college._id}
                  href={`/colleges/${college.slug}`}
                  className="group block bg-surface rounded-2xl border border-border p-6 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-300 slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: college.color || "var(--color-primary)" }}
                    >
                      <IconComponent className="w-7 h-7" />
                    </div>
                    {college.comingSoon && (
                      <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium border border-warning/20">
                        {t("colleges.coming_soon")}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-1 group-hover:text-primary transition-colors">
                    {lang === "ar"
                      ? college.nameAr || college.name
                      : college.nameEn || college.name}
                  </h3>
                  <p className="text-sm text-text-muted">
                    {college.subjects.length} {t("colleges.subjects")}
                  </p>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}