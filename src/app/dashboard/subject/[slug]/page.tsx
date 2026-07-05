"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  ChevronDown, ChevronUp, Lock, CheckCircle, PlayCircle,
  ArrowRight, BookOpen, Trophy, Zap, LayoutDashboard,
} from "lucide-react";

interface Level    { _id: string; title: string; titleEn?: string; order: number; isPublished: boolean; }
interface Unit     { _id: string; title: string; titleEn?: string; order: number; examEnabled: boolean; isPublished: boolean; comingSoon?: boolean; }
interface Topic    { _id: string; title: string; slug: string; isFree: boolean; difficulty: string; contentType: string; isPublished: boolean; isEssential?: boolean; }
interface Progress { lessonId: string; passedQuiz: boolean; watchedVideo: boolean; }
interface ExamAttempt { unitId: string; passed: boolean; score: number; }
interface SubjectInfo { _id: string; nameAr: string; nameEn: string; slug: string; }

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

function isLevelUnlocked(
  levelIndex: number,
  levels: Level[],
  allUnits: Record<string, Unit[]>,
  allTopics: Record<string, Record<string, Topic[]>>,
  progress: Progress[],
  examAttempts: ExamAttempt[]
): boolean {
  if (levelIndex === 0) return true;
  const prevLevel = levels[levelIndex - 1];
  if (!prevLevel) return false;
  const prevUnits = allUnits[prevLevel._id] ?? [];
  if (prevUnits.length === 0) return false;
  return prevUnits.every(u => {
    const prevTopics = allTopics[prevLevel._id]?.[u._id] ?? [];
    if (prevTopics.length === 0) return true;
    const allPassed = prevTopics.every(t => progress.some(p => p.lessonId === t._id && p.passedQuiz));
    if (!u.examEnabled) return allPassed;
    return allPassed && examAttempts.some(e => e.unitId === u._id && e.passed);
  });
}

export default function SubjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { lang, isRTL } = useLanguage();

  const [subject, setSubject]       = useState<SubjectInfo | null>(null);
  const [levels, setLevels]         = useState<Level[]>([]);
  const [allUnits, setAllUnits]     = useState<Record<string, Unit[]>>({});
  const [allTopics, setAllTopics]   = useState<Record<string, Record<string, Topic[]>>>({});
  const [progress, setProgress]     = useState<Progress[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  const loadSubject = useCallback(async () => {
    try {
      const subjectsRes = await apiFetch<SubjectInfo[]>("/api/admin/subjects");
      const sub = subjectsRes.data?.find(s => s.slug === slug || s._id === slug);
      if (!sub) return;
      setSubject(sub);

      const levelsRes = await apiFetch<Level[]>(`/api/admin/levels?subjectId=${sub._id}`);
      const sortedLevels = (levelsRes.data ?? [])
        .filter(l => l.isPublished)
        .sort((a, b) => a.order - b.order);
      setLevels(sortedLevels);
      if (sortedLevels.length > 0) {
        setExpandedLevel(sortedLevels[0]._id);
      }

      const [progressRes] = await Promise.all([
        apiFetch<Progress[]>(`/api/progress/lesson?subjectId=${sub._id}`),
      ]);
      setProgress(progressRes.data ?? []);

      const attemptsRes = await apiFetch<ExamAttempt[]>(`/api/progress/unit-exam?subjectId=${sub._id}`);
      setExamAttempts(attemptsRes.data ?? []);

      const unitsMap: Record<string, Unit[]> = {};
      const topicsMap: Record<string, Record<string, Topic[]>> = {};

      for (const level of sortedLevels) {
        const unitsRes = await apiFetch<Unit[]>(`/api/admin/units?levelId=${level._id}&subjectId=${sub._id}`);
        const sortedUnits = (unitsRes.data ?? [])
          .filter(u => u.isPublished)
          .sort((a, b) => a.order - b.order);
        unitsMap[level._id] = sortedUnits;

        const topicResults = await Promise.all(
          sortedUnits.map(u => apiFetch<Topic[]>(`/api/admin/topics?unitId=${u._id}`))
        );

        topicsMap[level._id] = {};
        sortedUnits.forEach((u, i) => {
          topicsMap[level._id][u._id] = (topicResults[i].data ?? [])
            .filter(t => t.isPublished)
            .sort((a, b) => (a as any).order - (b as any).order);
        });
      }

      setAllUnits(unitsMap);
      setAllTopics(topicsMap);
    } catch {}
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { loadSubject(); }, [loadSubject]);

  const levelName = (l: Level) => lang === "ar" ? l.title : (l.titleEn || l.title);
  const unitName  = (u: Unit)  => lang === "ar" ? u.title  : (u.titleEn  || u.title);

  const levelColors = [
    "from-[#19D3C5] to-[#22D3EE]",
    "from-[#39C4FF] to-[#4F7CFF]",
    "from-[#6A63FF] to-[#A855F7]",
    "from-[#F59E0B] to-[#F97316]",
    "from-[#22C55E] to-[#10B981]",
    "from-[#EC4899] to-[#F43F5E]",
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      <style jsx global>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 24px rgba(34,211,238,0.25); }
          50%       { box-shadow: 0 0 48px rgba(34,211,238,0.45); }
        }
        .animate-glow-pulse { animation: glow-pulse 2.4s ease-in-out infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes road-draw {
          from { height: 0; opacity: 0; }
          to { height: var(--road-h); opacity: 1; }
        }
        .animate-road { animation: road-draw 0.5s ease-out forwards; }
      `}</style>

      {/* ── Nav ── */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <button onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-text-secondary text-sm hover:text-primary hover:border-primary/40 transition-all">
          <LayoutDashboard className="w-4 h-4" />
          {lang === "ar" ? "لوحتي" : "Dashboard"}
        </button>
        <div className="text-sm font-bold text-text-primary">
          {lang === "ar" ? (subject?.nameAr || subject?.nameEn) : (subject?.nameEn || subject?.nameAr)}
        </div>
        <div className="w-20" />
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* ── Hero ── */}
        <div className="py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white text-2xl mb-4 shadow-lg shadow-primary/20">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">
            {lang === "ar" ? (subject?.nameAr || subject?.nameEn) : (subject?.nameEn || subject?.nameAr)}
          </h1>
          <p className="text-text-muted text-sm">
            {levels.length} {lang === "ar" ? "مستوى" : "levels"}
          </p>
        </div>

        {/* ── Level Road Map ── */}
        <div className="relative flex flex-col items-center gap-0">
          {levels.map((level, levelIndex) => {
            const units = allUnits[level._id] ?? [];
            const totalTopics = units.reduce((sum, u) => sum + (allTopics[level._id]?.[u._id]?.length ?? 0), 0);
            const completedTopics = units.reduce((sum, u) =>
              sum + (allTopics[level._id]?.[u._id]?.filter(t =>
                progress.some(p => p.lessonId === t._id && p.passedQuiz)
              ).length ?? 0), 0);
            const levelPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
            const unlocked = isLevelUnlocked(levelIndex, levels, allUnits, allTopics, progress, examAttempts);
            const completed = levelPct === 100 && totalTopics > 0;
            const isExpanded = expandedLevel === level._id;
            const isCurrent = !completed && unlocked;
            const colorClass = levelColors[levelIndex % levelColors.length];

            return (
              <div key={level._id} className="w-full flex flex-col items-center">
                {/* Connecting line */}
                {levelIndex > 0 && (
                  <div className={`w-1 h-12 rounded-full transition-all duration-500 ${
                    unlocked ? "bg-gradient-to-b from-primary/60 to-primary/20" : "bg-border"
                  }`} />
                )}

                {/* Level circle */}
                <div className="relative flex flex-col items-center w-full">
                  <button
                    onClick={() => {
                      if (!unlocked) return;
                      setExpandedLevel(isExpanded ? null : level._id);
                      setExpandedUnit(null);
                    }}
                    className={`relative w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center gap-1 transition-all duration-500 ${
                      completed
                        ? "bg-success/15 border-success shadow-[0_0_40px_rgba(34,197,94,0.35)] hover:shadow-[0_0_60px_rgba(34,197,94,0.5)]"
                        : isCurrent
                        ? "bg-primary/15 border-primary shadow-[0_0_40px_rgba(34,211,238,0.30)] hover:shadow-[0_0_60px_rgba(34,211,238,0.45)] animate-glow-pulse"
                        : unlocked
                        ? "bg-surface border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/15"
                        : "bg-surface/50 border-border opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {/* Progress ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 140 140">
                      <circle cx="70" cy="70" r="62" fill="none" stroke="currentColor"
                        strokeWidth="5" className="text-border opacity-30" />
                      <circle cx="70" cy="70" r="62" fill="none"
                        stroke={completed ? "#22C55E" : "#22D3EE"}
                        strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 62}`}
                        strokeDashoffset={`${2 * Math.PI * 62 * (1 - levelPct / 100)}`}
                        className="transition-all duration-700"
                      />
                    </svg>

                    {/* Icon + label */}
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      {!unlocked ? (
                        <Lock className="w-8 h-8 text-text-muted" />
                      ) : completed ? (
                        <CheckCircle className="w-8 h-8 text-success" />
                      ) : (
                        <Trophy className="w-8 h-8 text-primary" />
                      )}
                      <span className={`text-xs font-bold ${completed ? "text-success" : isCurrent ? "text-primary" : "text-text-muted"}`}>
                        {levelPct}%
                      </span>
                    </div>
                  </button>

                  {/* Level label */}
                  <div className="mt-4 text-center max-w-[220px]">
                    <p className={`font-bold text-base leading-tight ${
                      completed ? "text-success" : isCurrent ? "text-text-primary" : "text-text-muted"
                    }`}>
                      {levelName(level)}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {units.length} {lang === "ar" ? "وحدة" : "units"} · {totalTopics} {lang === "ar" ? "درس" : "lessons"}
                    </p>
                    {!unlocked && (
                      <p className="text-[11px] text-warning/80 mt-1 flex items-center gap-1 justify-center">
                        <Lock className="w-3 h-3" />
                        {lang === "ar" ? "أكمل المستوى السابق" : "Complete previous level"}
                      </p>
                    )}
                  </div>

                  {/* Expand chevron */}
                  {unlocked && units.length > 0 && (
                    <button
                      onClick={() => {
                        setExpandedLevel(isExpanded ? null : level._id);
                        setExpandedUnit(null);
                      }}
                      className="mt-2 p-1.5 rounded-full text-text-muted hover:text-primary hover:bg-surface-hover transition-all"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  )}
                </div>

                {/* ── Unit Road Map (expanded level) ── */}
                {isExpanded && unlocked && (
                  <div className="w-full animate-fade-in mt-4 mb-2">
                    {units.length === 0 ? (
                      <div className="text-center py-8 text-text-muted text-sm">
                        <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>{lang === "ar" ? "لا توجد وحدات في هذا المستوى بعد" : "No units in this level yet"}</p>
                      </div>
                    ) : (
                      <div className="relative flex flex-col items-center">
                        {units.map((unit, unitIndex) => {
                          const topics = allTopics[level._id]?.[unit._id] ?? [];
                          const pct = unitCompletionPct(topics, progress);
                          const unlockedUnit = isUnitUnlocked(unitIndex, units, allTopics[level._id] ?? {}, progress, examAttempts);
                          const completedUnit = pct === 100;
                          const isExpandedU = expandedUnit === unit._id;
                          const isCurrentU = !completedUnit && unlockedUnit;
                          const examPassed = examAttempts.some(e => e.unitId === unit._id && e.passed);

                          return (
                            <div key={unit._id} className="w-full flex flex-col items-center">
                              {/* Connecting line */}
                              {unitIndex > 0 && (
                                <div className={`w-0.5 h-14 rounded-full transition-all duration-500 ${
                                  unlockedUnit ? "bg-gradient-to-b from-primary/50 to-primary/10" : "bg-border"
                                }`} />
                              )}

                              {/* Exam node between units */}
                              {unit.examEnabled && unitIndex > 0 && (
                                <div className="flex flex-col items-center my-2">
                                  <button
                                    onClick={() => unlockedUnit && !examPassed ? router.push(`/dashboard/unit-exam/${units[unitIndex - 1]._id}`) : undefined}
                                    className={`group relative w-12 h-12 rotate-45 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${
                                      examPassed
                                        ? "bg-success/20 border-success shadow-lg shadow-success/20 cursor-default"
                                        : unlockedUnit
                                        ? "bg-warning/10 border-warning hover:bg-warning/20 hover:shadow-lg hover:shadow-warning/20 cursor-pointer"
                                        : "bg-surface border-border cursor-not-allowed opacity-50"
                                    }`}
                                    title={examPassed ? (lang === "ar" ? "اجتزت الاختبار" : "Exam passed") : (lang === "ar" ? "اختبار الوحدة" : "Unit Exam")}
                                  >
                                    <div className="-rotate-45">
                                      {examPassed ? <Trophy className="w-5 h-5 text-success" /> :
                                       unlockedUnit ? <Zap className="w-5 h-5 text-warning" /> :
                                                     <Lock className="w-4 h-4 text-text-muted" />}
                                    </div>
                                  </button>
                                  <span className={`text-[10px] font-medium mt-1 ${
                                    examPassed ? "text-success" : unlockedUnit ? "text-warning" : "text-text-muted"
                                  }`}>
                                    {lang === "ar" ? "اختبار الوحدة" : "Unit Exam"}
                                  </span>
                                </div>
                              )}

                              {/* Unit circle */}
                              <button
                                onClick={() => {
                                  if (!unlockedUnit) return;
                                  setExpandedUnit(isExpandedU ? null : unit._id);
                                }}
                                className={`relative w-24 h-24 rounded-full border-[3px] flex flex-col items-center justify-center gap-0.5 transition-all duration-400 ${
                                  completedUnit
                                    ? "bg-success/15 border-success shadow-[0_0_24px_rgba(34,197,94,0.30)] hover:shadow-[0_0_40px_rgba(34,197,94,0.45)]"
                                    : isCurrentU
                                    ? "bg-primary/15 border-primary shadow-[0_0_24px_rgba(34,211,238,0.25)] hover:shadow-[0_0_40px_rgba(34,211,238,0.40)] animate-glow-pulse"
                                    : unlockedUnit
                                    ? "bg-surface border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/15"
                                    : "bg-surface/50 border-border opacity-50 cursor-not-allowed"
                                }`}
                              >
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor"
                                    strokeWidth="3" className="text-border opacity-30" />
                                  <circle cx="50" cy="50" r="44" fill="none"
                                    stroke={completedUnit ? "#22C55E" : "#22D3EE"}
                                    strokeWidth="3" strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 44}`}
                                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - pct / 100)}`}
                                    className="transition-all duration-700"
                                  />
                                </svg>
                                <div className="relative z-10 flex flex-col items-center gap-0.5">
                                  {!unlockedUnit ? (
                                    <Lock className="w-5 h-5 text-text-muted" />
                                  ) : completedUnit ? (
                                    <CheckCircle className="w-5 h-5 text-success" />
                                  ) : (
                                    <BookOpen className="w-5 h-5 text-primary" />
                                  )}
                                  <span className={`text-[10px] font-bold ${completedUnit ? "text-success" : isCurrentU ? "text-primary" : "text-text-muted"}`}>
                                    {pct}%
                                  </span>
                                </div>
                              </button>

                              {/* Unit label */}
                              <div className="mt-2 text-center max-w-[180px]">
                                <p className={`font-semibold text-sm leading-tight ${
                                  completedUnit ? "text-success" : isCurrentU ? "text-text-primary" : "text-text-muted"
                                }`}>
                                  {unitName(unit)}
                                </p>
                                <p className="text-[10px] text-text-muted">
                                  {topics.length} {lang === "ar" ? "درس" : "lessons"}
                                </p>
                              </div>

                              {/* Expand chevron */}
                              {unlockedUnit && (
                                <button
                                  onClick={() => setExpandedUnit(isExpandedU ? null : unit._id)}
                                  className="mt-1 p-1 rounded-full text-text-muted hover:text-primary transition-colors"
                                >
                                  {isExpandedU ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}

                              {/* ── Lesson list (expanded unit) ── */}
                              {isExpandedU && unlockedUnit && (
                                <div className="w-full max-w-md mt-3 mb-2 rounded-2xl border border-border bg-surface/60 backdrop-blur-sm overflow-hidden animate-fade-in">
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
                                        const topicPassed = lessonProgress?.passedQuiz ?? false;
                                        const prevPassed = ti === 0 || progress.some(p => p.lessonId === topics[ti - 1]._id && p.passedQuiz);
                                        const topicUnlocked = ti === 0 || prevPassed;

                                        return (
                                          <button
                                            key={topic._id}
                                            disabled={!topicUnlocked}
                                            onClick={() => topicUnlocked && router.push(`/dashboard/topic/${topic.slug}`)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                                              topicUnlocked ? "hover:bg-surface-hover cursor-pointer" : "opacity-40 cursor-not-allowed"
                                            }`}
                                          >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                              topicPassed ? "bg-success/20" : topicUnlocked ? "bg-primary/15" : "bg-border"
                                            }`}>
                                              {topicPassed ? <CheckCircle className="w-4 h-4 text-success" /> :
                                               !topicUnlocked ? <Lock className="w-3.5 h-3.5 text-text-muted" /> :
                                               <PlayCircle className="w-4 h-4 text-primary" />}
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
                                                  {topic.difficulty === "beginner" ? (lang === "ar" ? "مبتدئ" : "Beginner") :
                                                   topic.difficulty === "intermediate" ? (lang === "ar" ? "متوسط" : "Intermediate") :
                                                   (lang === "ar" ? "متقدم" : "Advanced")}
                                                </span>
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
                                  {/* Quick exam button */}
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

                        {/* End of level */}
                        <div className="flex flex-col items-center mt-4 gap-2">
                          <div className="w-0.5 h-8 bg-gradient-to-b from-primary/20 to-transparent rounded-full" />
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${colorClass} flex items-center justify-center shadow-lg`}>
                            <Trophy className="w-5 h-5 text-white" />
                          </div>
                          <p className="text-xs text-text-muted text-center">
                            {lang === "ar" ? `نهاية ${levelName(level)}` : `End of ${levelName(level)}`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Global end */}
          {levels.length > 0 && (
            <div className="flex flex-col items-center mt-6 gap-2">
              <div className="w-1 h-10 bg-gradient-to-b from-primary/20 to-transparent rounded-full" />
              <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#19D3C5] via-[#39C4FF] to-[#6A63FF] flex items-center justify-center shadow-2xl shadow-primary/30">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <p className="text-sm font-bold text-primary mt-1">
                {lang === "ar" ? "مبروك! أكملت جميع المستويات" : "Congratulations! All levels complete"}
              </p>
            </div>
          )}

          {levels.length === 0 && !loading && (
            <div className="text-center py-16 text-text-muted">
              <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="text-lg">{lang === "ar" ? "لا توجد مستويات بعد" : "No levels yet"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
