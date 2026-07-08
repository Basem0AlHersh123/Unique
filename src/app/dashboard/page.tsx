"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { getAuthOrRefresh, type AuthUser } from "@/lib/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  Brain,
  Target,
  Award,
  BookOpen,
  Flame,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  GraduationCap,
  BarChart2,
  Zap,
  ArrowRight,
  Calendar,
  Sparkles,
} from "lucide-react";

interface SubjectBreakdown {
  _id: string;
  name: string;
  nameEn: string;
  attempts: number;
  avgPct: number;
}

interface WeeklyActivity {
  _id: string;
  count: number;
}

interface UnitExamAttempt {
  unitId: string;
  score: number;
  passed: boolean;
  attemptNumber: number;
  takenAt: string;
}

interface AttemptSummary {
  id: string;
  topicTitle: string;
  topicSlug: string;
  subjectName: string;
  score: number;
  total: number;
  percentage: number;
  completedAt: string;
}

interface ProgressData {
  stats: {
    totalAttempts: number;
    totalScore: number;
    totalQuestions: number;
    averagePercentage: number;
  };
  recent: AttemptSummary[];
  lessonsWatched?: number;
  lessonsPassed?: number;
  subjectBreakdown?: SubjectBreakdown[];
  weeklyActivity?: WeeklyActivity[];
  unitExamAttempts?: UnitExamAttempt[];
}

interface CollegeInfo {
  _id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  color: string;
}

interface SubjectInfo {
  _id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
}

function RadarChart({ data }: { data: { label: string; value: number }[] }) {
  if (!data.length) return null;
  const cx = 100,
    cy = 100,
    r = 75;
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  const points = data.map((d, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const ratio = d.value / 100;
    return {
      x: cx + r * ratio * Math.cos(angle),
      y: cy + r * ratio * Math.sin(angle),
      lx: cx + (r + 18) * Math.cos(angle),
      ly: cy + (r + 18) * Math.sin(angle),
      label: d.label,
      value: d.value,
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");
  const gridPolygons = [0.25, 0.5, 0.75, 1].map((scale) =>
    data
      .map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return `${cx + r * scale * Math.cos(angle)},${
          cy + r * scale * Math.sin(angle)
        }`;
      })
      .join(" ")
  );

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[240px] mx-auto">
      {gridPolygons.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="0.5"
          opacity="0.5"
        />
      ))}
      {data.map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke="var(--color-border)"
            strokeWidth="0.5"
            opacity="0.3"
          />
        );
      })}
      <polygon
        points={polygon}
        fill="var(--color-primary)"
        fillOpacity="0.2"
        stroke="var(--color-primary)"
        strokeWidth="2"
        className="transition-all duration-1000"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="var(--color-primary)"
          className="transition-all duration-1000"
        />
      ))}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.lx}
          y={p.ly}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="8"
          fill="var(--color-text-muted)"
          className="font-medium"
        >
          {p.label.length > 10 ? p.label.slice(0, 8) + "…" : p.label}
        </text>
      ))}
    </svg>
  );
}

function WeekBar({ data }: { data: WeeklyActivity[] }) {
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5 h-16">
      {days.map((day, i) => {
        const today = new Date();
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split("T")[0];
        const entry = data.find((e) => e._id === key);
        const pct = entry ? (entry.count / max) * 100 : 0;
        const isToday = i === 6;
        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="w-full relative flex items-end" style={{ height: 48 }}>
              <div
                className={`w-full rounded-t transition-all duration-700 group-hover:scale-y-110 origin-bottom ${
                  isToday
                    ? "bg-gradient-to-t from-primary to-primary-dark"
                    : "bg-primary/30"
                }`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
              {pct > 0 && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-bold text-text-primary">
                  {Math.round(pct)}%
                </div>
              )}
            </div>
            <span className="text-[8px] text-text-muted truncate w-full text-center">
              {day.slice(0, 3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [college, setCollege] = useState<CollegeInfo | null>(null);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);

  useEffect(() => {
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) {
        router.push("/auth/login");
        return;
      }
      setUser(u);

      const [progressRes, profileRes] = await Promise.all([
        apiFetch<ProgressData>("/api/dashboard/progress"),
        apiFetch<{ collegeId?: string }>("/api/auth/profile"),
      ]);
      if (progressRes.success && progressRes.data) setProgress(progressRes.data);

      if (profileRes.success && profileRes.data?.collegeId) {
        const cid = profileRes.data.collegeId;
        const [collegesRes, subjectsRes] = await Promise.all([
          apiFetch<CollegeInfo[]>("/api/admin/colleges"),
          apiFetch<SubjectInfo[]>(`/api/admin/subjects?collegeId=${cid}`),
        ]);
        if (collegesRes.success)
          setCollege(collegesRes.data?.find((c) => c._id === cid) ?? null);
        if (subjectsRes.success) setSubjects(subjectsRes.data ?? []);
      }
      setLoading(false);
    })();
  }, [router]);

  const avg = progress?.stats.averagePercentage ?? 0;
  const radarData =
    progress?.subjectBreakdown?.map((s) => ({
      label: lang === "ar" ? s.name || s.nameEn : s.nameEn || s.name,
      value: s.avgPct,
    })) ?? [];

  const strengthSubjects = (progress?.subjectBreakdown ?? []).filter(
    (s) => s.avgPct >= 70
  );
  const weakSubjects = (progress?.subjectBreakdown ?? []).filter(
    (s) => s.avgPct < 70 && s.attempts > 0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-text-secondary text-sm animate-pulse">
            {lang === "ar" ? "جاري تحميل بياناتك..." : "Loading your data..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* First-time college selection blocker */}
      {!college && !loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-surface rounded-3xl border border-border/50 shadow-2xl max-w-md w-full p-8 scale-in text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
              <GraduationCap className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">
                {lang === "ar" ? "اختر كليتك" : "Choose Your College"}
              </h2>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                {lang === "ar"
                  ? "يجب اختيار الكلية قبل البدء. هذا يساعدنا في تخصيص المحتوى المناسب لك."
                  : "You need to select a college before proceeding. This helps us personalize your content."}
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300"
            >
              <GraduationCap className="w-5 h-5" />
              {lang === "ar" ? "اختر الكلية" : "Select College"}
            </Link>
            <p className="text-xs text-text-muted">
              {lang === "ar"
                ? "يمكنك تغيير الكلية لاحقاً من الإعدادات"
                : "You can change your college later from settings"}
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome Card - Enhanced */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 rounded-2xl border border-primary/10 p-6 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
          </div>

          <div className="relative flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--color-border)"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="10"
                  strokeDasharray={`${
                    2 * Math.PI * 40 * (avg / 100)
                  } ${2 * Math.PI * 40 * (1 - avg / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-text-primary">
                  {avg}%
                </span>
                <span className="text-[9px] text-text-muted font-medium">
                  {lang === "ar" ? "معدل" : "Avg"}
                </span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-right">
              <h1 className="text-xl font-bold text-text-primary flex items-center justify-center sm:justify-start gap-2">
                {lang === "ar" ? "أهلاً" : "Welcome"}{" "}
                {user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-text-secondary text-sm mt-1">
                {college
                  ? `${lang === "ar" ? "كلية" : "College"} ${
                      lang === "ar" ? college.nameAr : college.nameEn
                    }`
                  : lang === "ar"
                  ? "لم تختر كليتك بعد"
                  : "You haven't chosen a college yet"}
              </p>
              {!college && (
                <Link
                  href="/colleges"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  {lang === "ar" ? "اختر كليتك" : "Choose your college"}
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:border-r sm:border-border sm:pr-6">
              {[
                {
                  label: lang === "ar" ? "المحاولات" : "Attempts",
                  value: progress?.stats.totalAttempts ?? 0,
                  icon: Brain,
                  color: "text-primary",
                },
                {
                  label: lang === "ar" ? "الدروس" : "Lessons",
                  value: progress?.lessonsPassed ?? 0,
                  icon: CheckCircle,
                  color: "text-green-400",
                },
                {
                  label: lang === "ar" ? "الإجابات الصحيحة" : "Correct",
                  value: progress?.stats.totalScore ?? 0,
                  icon: Award,
                  color: "text-yellow-400",
                },
                {
                  label: lang === "ar" ? "الأسئلة" : "Questions",
                  value: progress?.stats.totalQuestions ?? 0,
                  icon: Target,
                  color: "text-secondary",
                },
              ].map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className="text-center">
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${k.color}`} />
                    <p className="text-lg font-bold text-text-primary tabular-nums">
                      {k.value}
                    </p>
                    <p className="text-[10px] text-text-muted">{k.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Radar Chart Card */}
          <div className="bg-surface border border-border rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-primary" />
              {lang === "ar" ? "أداء المواد" : "Subject Performance"}
            </h2>
            {radarData.length > 0 ? (
              <RadarChart data={radarData} />
            ) : (
              <div className="py-8 text-center text-text-muted text-xs">
                {lang === "ar"
                  ? "لا بيانات — أكمل بعض الاختبارات"
                  : "No data yet — complete some quizzes"}
              </div>
            )}
          </div>

          {/* Subject Breakdown */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-secondary" />
                {lang === "ar" ? "تفصيل المواد" : "Subject Details"}
              </h2>
              {strengthSubjects.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">
                  {lang === "ar" ? "نقاط قوة" : "Strengths"}
                </span>
              )}
            </div>
            <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
              {(progress?.subjectBreakdown ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-text-muted text-xs">
                  {lang === "ar"
                    ? "لا بيانات — ابدأ الاختبارات"
                    : "No data — start taking quizzes"}
                </div>
              ) : (
                progress?.subjectBreakdown?.map((s) => {
                  const isStrong = s.avgPct >= 70;
                  const isMedium = s.avgPct >= 40 && s.avgPct < 70;
                  return (
                    <div key={String(s._id)} className="px-5 py-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-text-primary">
                          {lang === "ar" ? s.name : s.nameEn}
                        </span>
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            isStrong
                              ? "text-green-400"
                              : isMedium
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {s.avgPct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isStrong
                              ? "bg-gradient-to-r from-green-400 to-teal"
                              : isMedium
                              ? "bg-gradient-to-r from-yellow-400 to-warning"
                              : "bg-gradient-to-r from-red-400 to-danger"
                          }`}
                          style={{ width: `${s.avgPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {s.attempts}{" "}
                        {lang === "ar" ? "محاولة" : "attempts"}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {(strengthSubjects.length > 0 || weakSubjects.length > 0) && (
              <div className="px-5 py-4 bg-background/50 border-t border-border space-y-3">
                {strengthSubjects.length > 0 && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-green-400">
                        {lang === "ar" ? "نقاط قوتك" : "Your Strengths"}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {strengthSubjects.map((s) => s.name || s.nameEn).join("، ")}
                      </p>
                    </div>
                  </div>
                )}
                {weakSubjects.length > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-red-400">
                        {lang === "ar" ? "تحتاج تحسيناً" : "Needs Improvement"}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {weakSubjects.map((s) => s.name || s.nameEn).join("، ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Attempts + Quick Start */}
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Clock className="w-4 h-4 text-info" />
                  {lang === "ar" ? "آخر المحاولات" : "Recent Attempts"}
                </h2>
                <span className="text-[10px] text-text-muted">
                  {progress?.recent?.length ?? 0}{" "}
                  {lang === "ar" ? "محاولة" : "attempts"}
                </span>
              </div>
              <div className="divide-y divide-border max-h-[220px] overflow-y-auto">
                {(progress?.recent ?? []).length === 0 ? (
                  <div className="px-5 py-8 text-center text-text-muted text-xs">
                    {lang === "ar"
                      ? "لا محاولات بعد"
                      : "No attempts yet"}
                  </div>
                ) : (
                  progress?.recent.map((a) => (
                    <Link
                      key={a.id}
                      href={`/dashboard/topic/${a.topicSlug}`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-surface-hover transition-colors group"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          a.percentage >= 70
                            ? "bg-green-400"
                            : a.percentage >= 40
                            ? "bg-yellow-400"
                            : "bg-red-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary truncate group-hover:text-primary transition-colors">
                          {a.topicTitle}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {a.subjectName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-xs font-bold tabular-nums ${
                            a.percentage >= 70
                              ? "text-green-400"
                              : a.percentage >= 40
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {a.percentage}%
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {a.score}/{a.total}
                        </p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Quick Start */}
            {subjects.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <p className="text-xs font-bold text-text-primary mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-warning" />
                  {lang === "ar" ? "ابدأ الدراسة" : "Start Studying"}
                </p>
                <div className="space-y-2">
                  {subjects.slice(0, 3).map((s) => (
                    <Link
                      key={s._id}
                      href={`/dashboard/subject/${s.slug}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-background border border-border hover:border-primary/40 hover:bg-surface-hover transition-all group"
                    >
                      <span className="text-xs font-medium text-text-primary">
                        {lang === "ar" ? s.nameAr : s.nameEn}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                  {subjects.length > 3 && (
                    <Link
                      href={`/colleges/${college?.slug}`}
                      className="text-[10px] text-primary hover:underline block text-center"
                    >
                      {lang === "ar"
                        ? `+${subjects.length - 3} مواد أخرى`
                        : `+${subjects.length - 3} more subjects`}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-surface border border-border rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Flame className="w-4 h-4 text-warning" />
              {lang === "ar" ? "نشاط الأسبوع" : "Weekly Activity"}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-text-muted">
              <Calendar className="w-3 h-3" />
              {lang === "ar"
                ? "آخر 7 أيام"
                : "Last 7 days"}
            </div>
          </div>
          <WeekBar data={progress?.weeklyActivity ?? []} />
          <div className="flex items-center justify-between mt-3 text-[10px] text-text-muted">
            <span>
              {lang === "ar" ? "إجمالي المحاولات" : "Total attempts"}:{" "}
              <span className="font-bold text-text-primary">
                {progress?.weeklyActivity?.reduce((sum, d) => sum + d.count, 0) ??
                  0}
              </span>
            </span>
            <span>
              {lang === "ar" ? "أعلى يوم" : "Best day"}:{" "}
              <span className="font-bold text-text-primary">
                {Math.max(
                  ...(progress?.weeklyActivity?.map((d) => d.count) ?? [0])
                )}
              </span>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}