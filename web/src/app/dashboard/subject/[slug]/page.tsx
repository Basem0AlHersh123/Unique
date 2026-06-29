"use client";

import { useEffect, useState, useCallback } from "react";
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
  BookOpen, ArrowLeft, Layers, Play, ChevronDown, ChevronLeft,
  CheckCircle, GraduationCap, FileQuestion, Award, Lock,
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

interface Level {
  _id: string;
  title: string;
  titleEn?: string;
  subjectId: string;
  order: number;
  isPublished: boolean;
  comingSoon: boolean;
  description?: string;
}

interface Unit {
  _id: string;
  title: string;
  titleEn?: string;
  levelId: string;
  subjectId: string;
  order: number;
  isPublished: boolean;
  comingSoon: boolean;
  examEnabled: boolean;
}

interface Topic {
  _id: string;
  title: string;
  slug: string;
  subjectId: string;
  unitId: string;
  videoUrl: string;
  order: number;
  isFree: boolean;
  isPublished: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
}

interface LessonProgressData {
  _id: string;
  lessonId: string;
  watchedVideo: boolean;
  passedQuiz: boolean;
  score?: number;
  completedAt?: string;
}

interface UnitExamAttemptData {
  _id: string;
  unitId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  attemptNumber: number;
  takenAt: string;
}

const difficultyMeta: Record<string, { label: string; color: "success" | "warning" | "danger" }> = {
  beginner: { label: "مبتدئ", color: "success" },
  intermediate: { label: "متوسط", color: "warning" },
  advanced: { label: "متقدم", color: "danger" },
};

export default function SubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, lang, isRTL } = useLanguage();
  const slug = params.slug as string;

  useEffect(() => {
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) { router.push("/auth/login"); return; }
    })();
  }, [router]);

  const [subject, setSubject] = useState<Subject | null>(null);
  const [college, setCollege] = useState<College | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<LessonProgressData[]>([]);
  const [examAttempts, setExamAttempts] = useState<UnitExamAttemptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
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

      const [levelsRes, unitsRes, topicsRes, progressRes, examRes] = await Promise.all([
        apiFetch<Level[]>(`/api/admin/levels?subjectId=${found._id}`),
        apiFetch<Unit[]>(`/api/admin/units?subjectId=${found._id}`),
        apiFetch<Topic[]>(`/api/admin/topics?subjectId=${found._id}`),
        apiFetch<LessonProgressData[]>(`/api/progress/lesson?subjectId=${found._id}`),
        apiFetch<UnitExamAttemptData[]>(`/api/progress/unit-exam?subjectId=${found._id}`),
      ]);

      setLevels((levelsRes.data ?? []).filter((l) => l.isPublished).sort((a, b) => a.order - b.order));
      setUnits((unitsRes.data ?? []).filter((u) => u.isPublished).sort((a, b) => a.order - b.order));
      setTopics((topicsRes.data ?? []).filter((t) => t.isPublished).sort((a, b) => a.order - b.order));
      setProgress(progressRes.data ?? []);
      setExamAttempts(examRes.data ?? []);

      const initialLevels = new Set<string>();
      (levelsRes.data ?? []).filter((l) => l.isPublished).forEach((l) => initialLevels.add(l._id));
      setExpandedLevels(initialLevels);
    } catch {
      setError("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleLevel(id: string) {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleUnit(id: string) {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function getTopicsForUnit(unitId: string) {
    return topics.filter((t) => t.unitId === unitId);
  }

  function getUnitsForLevel(levelId: string) {
    return units.filter((u) => u.levelId === levelId);
  }

  function getProgress(lessonId: string) {
    return progress.find((p) => p.lessonId === lessonId);
  }

  function getLatestExamAttempt(unitId: string) {
    const attempts = examAttempts.filter((a) => a.unitId === unitId);
    return attempts.length > 0 ? attempts[0] : null;
  }

  function unitProgressCount(unitId: string) {
    const unitTopics = getTopicsForUnit(unitId);
    const completed = unitTopics.filter((t) => {
      const p = getProgress(t._id);
      return p?.watchedVideo && p?.passedQuiz;
    });
    return { completed: completed.length, total: unitTopics.length };
  }

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
                {levels.length} مستوى · {units.length} وحدة · {topics.length} درس
                {subject.isShared && " · مادة مشتركة"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {levels.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted text-lg">لا توجد مستويات متاحة بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {levels.map((level) => {
              const levelUnits = getUnitsForLevel(level._id);
              const isExpanded = expandedLevels.has(level._id);
              const levelTopics = levelUnits.reduce((sum, u) => sum + getTopicsForUnit(u._id).length, 0);
              const levelCompleted = levelUnits.reduce((sum, u) => sum + unitProgressCount(u._id).completed, 0);

              return (
                <div key={level._id} className="glass rounded-2xl border border-border/50 overflow-hidden">
                  <button
                    onClick={() => toggleLevel(level._id)}
                    className="w-full flex items-center gap-4 p-5 hover:bg-surface-hover/50 transition-colors text-right"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text-primary text-base">
                        {lang === 'ar' ? level.title : (level.titleEn || level.title)}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        {levelUnits.length} وحدات · {levelTopics} دروس
                        {levelCompleted > 0 && ` · تم ${levelCompleted}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {levelTopics > 0 && (
                        <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${levelTopics > 0 ? (levelCompleted / levelTopics) * 100 : 0}%` }}
                          />
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-text-muted" />
                      ) : (
                        <ChevronLeft className="w-5 h-5 text-text-muted" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/30 px-5 pb-4 space-y-3">
                      {levelUnits.length === 0 ? (
                        <p className="text-sm text-text-muted text-center py-4">لا توجد وحدات متاحة</p>
                      ) : (
                        levelUnits.map((unit) => {
                          const unitTopics = getTopicsForUnit(unit._id);
                          const unitExpanded = expandedUnits.has(unit._id);
                          const { completed, total } = unitProgressCount(unit._id);
                          const examAttempt = getLatestExamAttempt(unit._id);

                          return (
                            <div key={unit._id} className="mt-3">
                              <button
                                onClick={() => toggleUnit(unit._id)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface-hover/50 transition-colors text-right border border-border/20"
                              >
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <BookOpen className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-text-primary text-sm">
                                    {lang === 'ar' ? unit.title : (unit.titleEn || unit.title)}
                                  </h4>
                                  <p className="text-xs text-text-muted mt-0.5">
                                    {unitTopics.length} دروس
                                    {completed > 0 && ` · تم ${completed}/${total}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {total > 0 && (
                                    <div className="w-16 h-1 bg-border rounded-full overflow-hidden hidden sm:block">
                                      <div
                                        className="h-full bg-teal rounded-full transition-all"
                                        style={{ width: `${(completed / total) * 100}%` }}
                                      />
                                    </div>
                                  )}
                                  {examAttempt?.passed && (
                                    <Badge variant="success">ناجح</Badge>
                                  )}
                                  {unitExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-text-muted" />
                                  ) : (
                                    <ChevronLeft className="w-4 h-4 text-text-muted" />
                                  )}
                                </div>
                              </button>

                              {unitExpanded && (
                                <div className="mr-10 mt-2 space-y-1.5">
                                  {unitTopics.length === 0 ? (
                                    <p className="text-sm text-text-muted py-2">لا توجد دروس متاحة</p>
                                  ) : (
                                    unitTopics.map((topic, idx) => {
                                      const p = getProgress(topic._id);
                                      const completedBoth = p?.watchedVideo && p?.passedQuiz;
                                      const diff = difficultyMeta[topic.difficulty] || difficultyMeta.beginner;

                                      return (
                                        <Link
                                          key={topic._id}
                                          href={`/dashboard/topic/${topic.slug}`}
                                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 group ${
                                            completedBoth
                                              ? "bg-teal/5 border-teal/10 hover:border-teal/20"
                                              : "bg-surface border-border/30 hover:border-primary/20 hover:bg-surface-hover/50"
                                          }`}
                                        >
                                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                            completedBoth
                                              ? "bg-teal/20 text-teal"
                                              : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors"
                                          }`}>
                                            {completedBoth ? (
                                              <CheckCircle className="w-4 h-4" />
                                            ) : (
                                              idx + 1
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className={`text-sm font-medium truncate ${
                                                completedBoth ? "text-teal" : "text-text-primary"
                                              }`}>
                                                {topic.title}
                                              </span>
                                              {topic.isFree && <Badge variant="success">مجاني</Badge>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                              <Badge variant={diff.color}>{diff.label}</Badge>
                                              {topic.videoUrl && (
                                                <span className="flex items-center gap-0.5 text-[10px] text-text-muted">
                                                  <Play className="w-2.5 h-2.5" />
                                                  فيديو
                                                </span>
                                              )}
                                              {p?.watchedVideo && !p?.passedQuiz && (
                                                <span className="text-[10px] text-warning">مشاهَد</span>
                                              )}
                                              {completedBoth && (
                                                <span className="text-[10px] text-teal">مكتمل</span>
                                              )}
                                            </div>
                                          </div>
                                          <ArrowLeft className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors shrink-0" />
                                        </Link>
                                      );
                                    })
                                  )}

                                  {unit.examEnabled && (
                                    <Link
                                      href={`/dashboard/unit-exam/${unit._id}`}
                                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 group ${
                                        examAttempt?.passed
                                          ? "bg-teal/5 border-teal/10 hover:border-teal/20"
                                          : "bg-gradient-to-r from-warning/5 to-accent/5 border-warning/20 hover:border-warning/40"
                                      }`}
                                    >
                                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                        examAttempt?.passed
                                          ? "bg-teal/20 text-teal"
                                          : "bg-warning/20 text-warning"
                                      }`}>
                                        {examAttempt?.passed ? (
                                          <Award className="w-4 h-4" />
                                        ) : (
                                          <FileQuestion className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-sm font-medium ${
                                          examAttempt?.passed ? "text-teal" : "text-text-primary"
                                        }`}>
                                          {examAttempt?.passed ? "اختبار الوحدة - تم بنجاح" : "اختبار الوحدة"}
                                        </span>
                                        {examAttempt && (
                                          <p className="text-xs text-text-muted mt-0.5">
                                            {examAttempt.passed
                                              ? `النتيجة: ${examAttempt.score}%`
                                              : `آخر محاولة: ${examAttempt.score}% (المحاولة ${examAttempt.attemptNumber})`}
                                          </p>
                                        )}
                                      </div>
                                      <ArrowLeft className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors shrink-0" />
                                    </Link>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
