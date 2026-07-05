"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  ChevronLeft, ChevronRight, Lock, CheckCircle, PlayCircle,
  ArrowRight, BookOpen, Trophy, Zap, LayoutDashboard,
  ChevronDown, ChevronUp,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface Level    { _id: string; title: string; titleEn?: string; order: number; isPublished: boolean; }
interface Unit     { _id: string; title: string; titleEn?: string; order: number; examEnabled: boolean; isPublished: boolean; comingSoon?: boolean; }
interface Topic    { _id: string; title: string; slug: string; isFree: boolean; difficulty: string; contentType: string; isPublished: boolean; isEssential?: boolean; }
interface Progress { lessonId: string; passedQuiz: boolean; watchedVideo: boolean; }
interface ExamAttempt { unitId: string; passed: boolean; score: number; }
interface SubjectInfo { _id: string; nameAr: string; nameEn: string; slug: string; }
interface CollegeInfo { _id: string; nameAr: string; nameEn: string; }

// ── Helpers ────────────────────────────────────────────────────────────────

function unitCompletionPct(topics: Topic[], progress: Progress[]): number {
  if (!topics.length) return 0;
  const passed = topics.filter(t => progress.some(p => p.lessonId === t._id && p.passedQuiz)).length;
  return Math.round((passed / topics.length) * 100);
}

function isUnitUnlocked(
  unitIndex: number,
  units: Unit[],
  unitTopics: Record<string, Topic[]>,
  progress: Progress[],
  examAttempts: ExamAttempt[]
): boolean {
  if (unitIndex === 0) return true;
  const prevUnit = units[unitIndex - 1];
  if (!prevUnit) return false;
  if (!prevUnit.examEnabled) {
    const prevTopics = unitTopics[prevUnit._id] ?? [];
    return prevTopics.every(t => progress.some(p => p.lessonId === t._id && p.passedQuiz));
  }
  return examAttempts.some(e => e.unitId === prevUnit._id && e.passed);
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SubjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { lang, isRTL } = useLanguage();

  const [subject, setSubject]             = useState<SubjectInfo | null>(null);
  const [college, setCollege]             = useState<CollegeInfo | null>(null);
  const [levels, setLevels]               = useState<Level[]>([]);
  const [activeLevelId, setActiveLevelId] = useState<string>("");
  const [units, setUnits]                 = useState<Unit[]>([]);
  const [unitTopics, setUnitTopics]       = useState<Record<string, Topic[]>>({});
  const [progress, setProgress]           = useState<Progress[]>([]);
  const [examAttempts, setExamAttempts]   = useState<ExamAttempt[]>([]);
  const [expandedUnit, setExpandedUnit]   = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);

  // ── Load subject & levels ───────────────────────────────────────────────

  const loadSubject = useCallback(async () => {
    try {
      const [subjectsRes, collegesRes] = await Promise.all([
        apiFetch<SubjectInfo[]>("/api/admin/subjects"),
        apiFetch<CollegeInfo[]>("/api/admin/colleges"),
      ]);
      const sub = subjectsRes.data?.find(s => s.slug === slug || s._id === slug);
      if (!sub) return;
      setSubject(sub);
      const col = collegesRes.data?.find(c =>
        (subjectsRes.data ?? []).find(s => s._id === sub._id)
      );
      if (col) setCollege(col);

      const levelsRes = await apiFetch<Level[]>(`/api/admin/levels?subjectId=${sub._id}`);
      const sortedLevels = (levelsRes.data ?? [])
        .filter(l => l.isPublished)
        .sort((a, b) => a.order - b.order);
      setLevels(sortedLevels);
      if (sortedLevels.length > 0) setActiveLevelId(sortedLevels[0]._id);
    } catch {}
  }, [slug]);

  // ── Load units for active level ─────────────────────────────────────────

  const loadUnits = useCallback(async (levelId: string, subjectId: string) => {
    if (!levelId || !subjectId) return;
    try {
      const [unitsRes, progressRes] = await Promise.all([
        apiFetch<Unit[]>(`/api/admin/units?levelId=${levelId}&subjectId=${subjectId}`),
        apiFetch<Progress[]>(`/api/progress/lesson?subjectId=${subjectId}`),
      ]);
      const sorted = (unitsRes.data ?? [])
        .filter(u => u.isPublished)
        .sort((a, b) => a.order - b.order);
      setUnits(sorted);
      setProgress(progressRes.data ?? []);

      const attemptsRes = await apiFetch<ExamAttempt[]>(`/api/progress/unit-exam?subjectId=${subjectId}`);
      setExamAttempts(attemptsRes.data ?? []);

      const topicResults = await Promise.all(
        sorted.map(u => apiFetch<Topic[]>(`/api/admin/topics?unitId=${u._id}`))
      );
      const map: Record<string, Topic[]> = {};
      sorted.forEach((u, i) => { map[u._id] = (topicResults[i].data ?? []).filter(t => t.isPublished).sort((a, b) => (a as any).order - (b as any).order); });
      setUnitTopics(map);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSubject(); }, [loadSubject]);
  useEffect(() => {
    if (activeLevelId && subject) loadUnits(activeLevelId, subject._id);
  }, [activeLevelId, subject, loadUnits]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const levelName = (l: Level) => lang === "ar" ? l.title : (l.titleEn || l.title);
  const unitName  = (u: Unit)  => lang === "ar" ? u.title  : (u.titleEn  || u.title);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ── Nav ── */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-text-secondary text-sm hover:text-primary hover:border-primary/40 transition-all">
            <LayoutDashboard className="w-4 h-4" />
            {lang === "ar" ? "لوحتي" : "Dashboard"}
          </button>
          <span className="text-text-muted text-sm">/</span>
          <Link href="/colleges" className="text-text-muted text-sm hover:text-text-primary transition-colors">
            {lang === "ar" ? "الكليات" : "Colleges"}
          </Link>
        </div>
        <div className="text-sm font-bold text-text-primary">
          {lang === "ar" ? (subject?.nameAr || subject?.nameEn) : (subject?.nameEn || subject?.nameAr)}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* ── Subject hero ── */}
        <div className="py-8 text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            {lang === "ar" ? (subject?.nameAr || subject?.nameEn) : (subject?.nameEn || subject?.nameAr)}
          </h1>
          <p className="text-text-muted text-sm">
            {levels.length} {lang === "ar" ? "مستويات" : "levels"} · {units.length} {lang === "ar" ? "وحدات" : "units"}
          </p>
        </div>

        {/* ── Level selector ── */}
        {levels.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-8 no-scrollbar justify-center flex-wrap">
            {levels.map(lvl => (
              <button key={lvl._id}
                onClick={() => { setActiveLevelId(lvl._id); setExpandedUnit(null); setLoading(true); }}
                className={`flex-none px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeLevelId === lvl._id
                    ? "bg-gradient-to-r from-[#19D3C5] via-[#39C4FF] to-[#6A63FF] text-white shadow-lg shadow-primary/30"
                    : "bg-surface border border-border text-text-secondary hover:border-primary/40 hover:text-primary"
                }`}>
                {levelName(lvl)}
              </button>
            ))}
          </div>
        )}

        {/* ── Road map ── */}
        <div className="relative flex flex-col items-center gap-0">
          {units.map((unit, index) => {
            const topics      = unitTopics[unit._id] ?? [];
            const pct         = unitCompletionPct(topics, progress);
            const unlocked    = isUnitUnlocked(index, units, unitTopics, progress, examAttempts);
            const completed   = pct === 100;
            const isExpanded  = expandedUnit === unit._id;
            const isCurrent   = !completed && unlocked;
            const examPassed  = examAttempts.some(e => e.unitId === unit._id && e.passed);

            return (
              <div key={unit._id} className="w-full flex flex-col items-center">
                {/* ── Connecting line from previous ── */}
                {index > 0 && (
                  <div className="relative flex flex-col items-center">
                    <div className={`w-1 h-16 rounded-full transition-all duration-500 ${
                      unlocked
                        ? "bg-gradient-to-b from-primary/60 to-primary/20"
                        : "bg-border"
                    }`} />
                    {unit.examEnabled && index > 0 && (
                      <div className={`relative flex flex-col items-center my-2`}>
                        {/* Exam node between units */}
                        <button
                          onClick={() => unlocked && !examPassed ? router.push(`/dashboard/unit-exam/${units[index-1]._id}`) : undefined}
                          className={`group relative w-14 h-14 rotate-45 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                            examPassed
                              ? "bg-success/20 border-success shadow-lg shadow-success/20 cursor-default"
                              : unlocked
                              ? "bg-warning/10 border-warning hover:bg-warning/20 hover:shadow-lg hover:shadow-warning/20 cursor-pointer animate-pulse-slow"
                              : "bg-surface border-border cursor-not-allowed opacity-50"
                          }`}
                          title={examPassed ? (lang === "ar" ? "اجتزت الاختبار" : "Exam passed") : (lang === "ar" ? "اختبار الوحدة" : "Unit Exam")}
                        >
                          <div className="-rotate-45">
                            {examPassed ? <Trophy className="w-5 h-5 text-success" /> :
                             unlocked   ? <Zap    className="w-5 h-5 text-warning" /> :
                                          <Lock   className="w-4 h-4 text-text-muted" />}
                          </div>
                        </button>
                        <span className={`text-xs font-medium mt-2 ${
                          examPassed ? "text-success" : unlocked ? "text-warning" : "text-text-muted"
                        }`}>
                          {lang === "ar" ? "اختبار الوحدة" : "Unit Exam"}
                        </span>
                        <div className="w-1 h-8 bg-gradient-to-b from-primary/20 to-transparent rounded-full mt-2" />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Unit circle ── */}
                <div className="relative flex flex-col items-center w-full">
                  <button
                    onClick={() => {
                      if (!unlocked) return;
                      setExpandedUnit(isExpanded ? null : unit._id);
                    }}
                    className={`relative w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center gap-1 transition-all duration-400 ${
                      completed
                        ? "bg-success/15 border-success shadow-[0_0_32px_rgba(34,197,94,0.35)] hover:shadow-[0_0_48px_rgba(34,197,94,0.5)]"
                        : isCurrent
                        ? "bg-primary/15 border-primary shadow-[0_0_32px_rgba(34,211,238,0.30)] hover:shadow-[0_0_48px_rgba(34,211,238,0.45)] animate-glow-pulse"
                        : unlocked
                        ? "bg-surface border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/15"
                        : "bg-surface/50 border-border opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {/* Circular progress ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor"
                        strokeWidth="4" className="text-border opacity-30" />
                      <circle cx="60" cy="60" r="54" fill="none"
                        stroke={completed ? "#22C55E" : "#22D3EE"}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 54}`}
                        strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct / 100)}`}
                        className="transition-all duration-700"
                      />
                    </svg>

                    {/* Icon */}
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      {!unlocked ? (
                        <Lock className="w-7 h-7 text-text-muted" />
                      ) : completed ? (
                        <CheckCircle className="w-7 h-7 text-success" />
                      ) : (
                        <BookOpen className="w-7 h-7 text-primary" />
                      )}
                      <span className={`text-[11px] font-bold ${completed ? "text-success" : isCurrent ? "text-primary" : "text-text-muted"}`}>
                        {pct}%
                      </span>
                    </div>
                  </button>

                  {/* Unit label */}
                  <div className="mt-3 text-center max-w-[200px]">
                    <p className={`font-bold text-sm leading-tight ${
                      completed ? "text-success" : isCurrent ? "text-text-primary" : "text-text-muted"
                    }`}>
                      {unitName(unit)}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {topics.length} {lang === "ar" ? "درس" : "lessons"}
                    </p>
                    {!unlocked && (
                      <p className="text-[11px] text-warning/80 mt-1 flex items-center gap-1 justify-center">
                        <Lock className="w-3 h-3" />
                        {lang === "ar" ? "أكمل الوحدة السابقة" : "Complete previous unit"}
                      </p>
                    )}
                  </div>

                  {/* Expand / collapse chevron */}
                  {unlocked && (
                    <button
                      onClick={() => setExpandedUnit(isExpanded ? null : unit._id)}
                      className="mt-2 p-1 rounded-full text-text-muted hover:text-primary transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* ── Expanded lesson list ── */}
                {isExpanded && unlocked && (
                  <div className="w-full max-w-lg mt-4 mb-2 rounded-2xl border border-border bg-surface/60 backdrop-blur-sm overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-bold text-text-primary">{unitName(unit)}</h3>
                    </div>
                    {topics.length === 0 ? (
                      <div className="px-4 py-6 text-center text-text-muted text-sm">
                        {lang === "ar" ? "لا توجد دروس بعد" : "No lessons yet"}
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {topics.map((topic, ti) => {
                          const lessonProgress = progress.find(p => p.lessonId === topic._id);
                          const topicPassed    = lessonProgress?.passedQuiz ?? false;
                          const prevPassed     = ti === 0 || progress.some(p => p.lessonId === topics[ti - 1]._id && p.passedQuiz);
                          const topicUnlocked  = ti === 0 || prevPassed;

                          return (
                            <button
                              key={topic._id}
                              disabled={!topicUnlocked}
                              onClick={() => topicUnlocked && router.push(`/dashboard/topic/${topic.slug}`)}
                              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
                                topicUnlocked
                                  ? "hover:bg-surface-hover cursor-pointer"
                                  : "opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                topicPassed ? "bg-success/20" : topicUnlocked ? "bg-primary/15" : "bg-border"
                              }`}>
                                {topicPassed
                                  ? <CheckCircle className="w-4 h-4 text-success" />
                                  : !topicUnlocked
                                  ? <Lock className="w-3.5 h-3.5 text-text-muted" />
                                  : <PlayCircle className="w-4 h-4 text-primary" />}
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <p className={`text-sm font-medium truncate ${
                                  topicPassed ? "text-success" : topicUnlocked ? "text-text-primary" : "text-text-muted"
                                }`}>
                                  {topic.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap justify-end">
                                  {topic.isFree && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-medium">
                                      {lang === "ar" ? "مجاني" : "Free"}
                                    </span>
                                  )}
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    topic.difficulty === "beginner" ? "bg-primary/10 text-primary" :
                                    topic.difficulty === "intermediate" ? "bg-warning/10 text-warning" :
                                    "bg-danger/10 text-danger"
                                  }`}>
                                    {topic.difficulty === "beginner"    ? (lang === "ar" ? "مبتدئ"   : "Beginner")    :
                                     topic.difficulty === "intermediate"? (lang === "ar" ? "متوسط"   : "Intermediate") :
                                                                          (lang === "ar" ? "متقدم"   : "Advanced")}
                                  </span>
                                  <span className="text-[10px] text-text-muted capitalize">{topic.contentType}</span>
                                </div>
                              </div>
                              {topicUnlocked && (
                                <ArrowRight className="w-4 h-4 text-text-muted shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Quick exam button if enabled */}
                    {unit.examEnabled && (
                      <div className="px-4 py-3 border-t border-border bg-warning/5">
                        <button
                          onClick={() => router.push(`/dashboard/unit-exam/${unit._id}`)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-warning/20 to-warning/5 border border-warning/30 text-warning text-sm font-bold hover:from-warning/30 hover:shadow-lg hover:shadow-warning/10 transition-all"
                        >
                          <Trophy className="w-4 h-4" />
                          {lang === "ar" ? "اختبار الوحدة النهائي" : "Unit Final Exam"}
                          {examPassed && <CheckCircle className="w-4 h-4 text-success ml-1" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* End of road */}
          {units.length > 0 && (
            <div className="flex flex-col items-center mt-4 gap-2">
              <div className="w-1 h-10 bg-gradient-to-b from-primary/20 to-transparent rounded-full" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#19D3C5] to-[#6A63FF] flex items-center justify-center shadow-lg shadow-primary/30">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-text-muted text-center mt-1">
                {lang === "ar" ? "نهاية المستوى" : "End of level"}
              </p>
            </div>
          )}

          {units.length === 0 && !loading && (
            <div className="text-center py-16 text-text-muted">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{lang === "ar" ? "لا توجد وحدات في هذا المستوى بعد" : "No units in this level yet"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Global animation styles */}
      <style jsx global>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 24px rgba(34,211,238,0.25); }
          50%       { box-shadow: 0 0 48px rgba(34,211,238,0.45); }
        }
        .animate-glow-pulse { animation: glow-pulse 2.4s ease-in-out infinite; }
        .animate-pulse-slow  { animation: pulse 3s ease-in-out infinite; }
        .animate-fade-in     { animation: fadeIn 0.25s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
