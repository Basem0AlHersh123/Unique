"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import * as Icons from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { getAuthOrRefresh } from "@/lib/auth-client";

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

interface Subject {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  collegeId: string;
  isShared: boolean;
  topics: string[];
}

const iconMap: Record<string, React.ElementType> = Icons as unknown as Record<string, React.ElementType>;

export default function CollegeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [college, setCollege] = useState<College | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [chooseMsg, setChooseMsg] = useState<string | null>(null);
  const { t, lang } = useLanguage();

  useEffect(() => {
    async function load() {
      try {
        const collegesRes = await apiFetch<College[]>("/api/admin/colleges");
        const found = (collegesRes.data ?? []).find(
          (c: College) => c.slug === slug && c.isActive
        );
        if (!found) {
          setError(t('college.not_found'));
          setLoading(false);
          return;
        }
        setCollege(found);

        const subjectsRes = await apiFetch<Subject[]>(
          `/api/admin/subjects?collegeId=${found._id}`
        );
        setSubjects(subjectsRes.data ?? []);
      } catch {
        setError(t('college.load_error'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  async function handleChooseCollege() {
    if (!college) return;
    const u = await getAuthOrRefresh();
    if (!u) {
      router.push("/auth/login");
      return;
    }
    setChoosing(true);
    setChooseMsg(null);
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ collegeId: college._id }),
      });
      if (res.success) {
        setChooseMsg(`تم اختيار ${college.name} بنجاح`);
        setTimeout(() => router.push("/dashboard"), 1500);
      } else {
        setChooseMsg(res.error || "فشل اختيار الكلية");
      }
    } catch {
      setChooseMsg("حدث خطأ");
    } finally {
      setChoosing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/colleges")}>
              <Icons.ArrowLeft className="w-4 h-4 ml-1" />
              {t('college.back')}
            </Button>
          </div>
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  if (error || !college) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icons.GraduationCap className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted text-lg mb-4">{error || t('college.not_found')}</p>
          <Link href="/colleges">
            <Button variant="secondary">{t('college.view_colleges')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const IconComponent = iconMap[college.icon] || Icons.BookOpen;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* College Header */}
      <section
        className="border-b border-border/20"
        style={{ background: `linear-gradient(135deg, ${college.color}15, transparent)` }}
      >
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/colleges")}>
              <Icons.ArrowLeft className="w-4 h-4 ml-1" />
              {t('college.back')}
            </Button>
          </div>
          <div className="flex items-center gap-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl shrink-0"
              style={{ backgroundColor: college.color || "var(--color-primary)" }}
            >
              <IconComponent className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold text-text-primary">
                {lang === 'ar'
                  ? (college.nameAr || college.name)
                  : (college.nameEn || college.name)}
              </h1>
              <p className="text-text-secondary mt-1">
                {t('college.subjects_desc')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Button
                onClick={handleChooseCollege}
                isLoading={choosing}
                className="flex items-center gap-2"
              >
                <Icons.Check className="w-4 h-4" />
                اختر هذه الكلية
              </Button>
              {chooseMsg && (
                <span className={`text-sm ${chooseMsg.includes("بنجاح") ? "text-teal" : "text-danger"}`}>
                  {chooseMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Subjects Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {subjects.length === 0 ? (
          <div className="text-center py-16">
            <Icons.BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">{t('college.subjects')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <Link
                key={subject._id}
                href={`/dashboard/subject/${subject.slug}`}
                className="group block bg-surface rounded-2xl border border-border p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Icons.Layers className="w-7 h-7" />
                  </div>
                  {subject.isShared && (
                    <span className="px-3 py-1 rounded-full bg-teal/10 text-teal text-xs font-medium">
                      {t('college.shared')}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-1">
                  {lang === 'ar'
                    ? (subject.nameAr || subject.name)
                    : (subject.nameEn || subject.name)}
                </h3>
                <p className="text-sm text-text-muted">
                  {subject.topics.length} {t('college.topics')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
