"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { getAuthOrRefresh } from "@/lib/auth-client";
import {
  BookOpen, ArrowLeft, Layers, Play,
} from "lucide-react";

interface College {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
}

interface Subject {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  collegeId: string;
  isShared: boolean;
}

interface Topic {
  _id: string;
  title: string;
  slug: string;
  subjectId: string;
  videoUrl: string;
  order: number;
  isFree: boolean;
  isPublished: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
}

const difficultyMeta: Record<string, { label: string; color: "success" | "warning" | "danger" }> = {
  beginner: { label: "مبتدئ", color: "success" },
  intermediate: { label: "متوسط", color: "warning" },
  advanced: { label: "متقدم", color: "danger" },
};

export default function SubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const slug = params.slug as string;

  useEffect(() => {
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) { router.push("/auth/login"); return; }
    })();
  }, [router]);

  const [subject, setSubject] = useState<Subject | null>(null);
  const [college, setCollege] = useState<College | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [subjectsRes, collegesRes] = await Promise.all([
          apiFetch<Subject[]>("/api/admin/subjects"),
          apiFetch<College[]>("/api/admin/colleges"),
        ]);
        const found = (subjectsRes.data ?? []).find((s: Subject) => s.slug === slug);
        if (!found) {
          setError("لم يتم العثور على المادة");
          setLoading(false);
          return;
        }
        setSubject(found);

        const collegeMatch = (collegesRes.data ?? []).find(
          (c: College) => c._id === found.collegeId
        );
        if (collegeMatch) setCollege(collegeMatch);

        const topicsRes = await apiFetch<Topic[]>(
          `/api/admin/topics?subjectId=${found._id}`
        );
        setTopics((topicsRes.data ?? []).filter((t: Topic) => t.isPublished));
      } catch {
        setError("حدث خطأ في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="minimal" />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 ml-1" />
              {t('topic.back')}
            </Button>
          </div>
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted text-lg mb-4">{error || "لم يتم العثور على المادة"}</p>
          <Button variant="secondary" onClick={() => router.push("/dashboard")}>
            {t('nav.dashboard')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="minimal" />

      {/* Subject Header */}
      <section className="border-b border-border/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/colleges")}>
              <ArrowLeft className="w-4 h-4 ml-1" />
              {t('nav.colleges')}
            </Button>
          </div>
          <p className="text-sm text-text-muted mb-2">
            {lang === 'ar' ? (college?.nameAr || college?.name || "") : (college?.nameEn || college?.name || "")}
          </p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-xl shrink-0">
              <Layers className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary">
                {lang === 'ar' ? (subject.nameAr || subject.name) : (subject.nameEn || subject.name)}
              </h1>
              <p className="text-text-secondary mt-1">
                {topics.length} درس{topics.length !== 1 ? "" : ""}
                {subject.isShared && " · مادة مشتركة"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Topics List */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {topics.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">لا توجد دروس متاحة بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((topic, index) => {
              const diff = difficultyMeta[topic.difficulty] || difficultyMeta.beginner;
              return (
                <Link
                  key={topic._id}
                  href={`/dashboard/topic/${topic.slug}`}
                  className="flex items-center gap-4 bg-surface rounded-2xl border border-border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  {/* Order Number */}
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-text-primary truncate">{topic.title}</h3>
                      {topic.isFree && <Badge variant="success">{t('topic.free')}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Badge variant={diff.color}>{diff.label}</Badge>
                      {topic.videoUrl && (
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          فيديو
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowLeft className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
