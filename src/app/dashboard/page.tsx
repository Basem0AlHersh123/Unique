"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { getAuthOrRefresh, type AuthUser } from "@/lib/auth-client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  Brain, Target, Award, BookOpen, Flame, TrendingUp,
  CheckCircle, XCircle, Clock, AlertCircle, GraduationCap,
  BarChart2, Zap, ArrowRight,
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
  const cx = 100, cy = 100, r = 75;
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

  const polygon = points.map(p => `${p.x},${p.y}`).join(" ");
  const gridPolygons = [0.25, 0.5, 0.75, 1].map(scale =>
    data.map((_, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      return `${cx + r * scale * Math.cos(angle)},${cy + r * scale * Math.sin(angle)}`;
    }).join(" ")
  );

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[240px] mx-auto">
      {gridPolygons.map((pts, i) => (
        <polygon key={i} points={pts} fill="none" stroke="#2d1f6e" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return (
          <line key={i}
            x1={cx} y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke="#2d1f6e" strokeWidth="1" />
        );
      })}
      <polygon points={polygon} fill="#6C63FF" fillOpacity="0.25" stroke="#6C63FF" strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#6C63FF" />
      ))}
      {points.map((p, i) => (
        <text key={i} x={p.lx} y={p.ly}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="9" fill="#94a3b8">
          {p.label}
        </text>
      ))}
    </svg>
  );
}

function WeekBar({ data }: { data: WeeklyActivity[] }) {
  const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-16">
      {days.map((day, i) => {
        const today = new Date();
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split("T")[0];
        const entry = data.find(e => e._id === key);
        const pct = entry ? (entry.count / max) * 100 : 0;
        const isToday = i === 6;
        return (
          <div key={day} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative flex items-end" style={{ height: 48 }}>
              <div
                className={`w-full rounded-t transition-all duration-700 ${isToday ? "bg-primary" : "bg-primary/30"}`}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <span className="text-[9px] text-text-muted truncate w-full text-center">{day.slice(0, 3)}</span>
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
      if (!u) { router.push("/auth/login"); return; }
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
        if (collegesRes.success) setCollege(collegesRes.data?.find(c => c._id === cid) ?? null);
        if (subjectsRes.success) setSubjects(subjectsRes.data ?? []);
      }
      setLoading(false);
    })();
  }, [router]);

  const avg = progress?.stats.averagePercentage ?? 0;
  const radarData = progress?.subjectBreakdown?.map(s => ({
    label: lang === "ar" ? (s.name || s.nameEn) : (s.nameEn || s.name),
    value: s.avgPct,
  })) ?? [];

  const strengthSubjects = (progress?.subjectBreakdown ?? []).filter(s => s.avgPct >= 70);
  const weakSubjects = (progress?.subjectBreakdown ?? []).filter(s => s.avgPct < 70 && s.attempts > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Brain className="w-10 h-10 text-primary animate-pulse" />
          <p className="text-text-secondary text-sm">جاري تحميل بياناتك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1a1040" strokeWidth="12" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#6C63FF" strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 40 * avg / 100} ${2 * Math.PI * 40 * (1 - avg / 100)}`}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-text-primary">{avg}%</span>
              <span className="text-[10px] text-text-muted">معدل</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-right">
            <h1 className="text-xl font-bold text-text-primary">
              أهلاً {user?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {college ? `كلية ${lang === "ar" ? college.nameAr : college.nameEn}` : "لم تختر كليتك بعد"}
            </p>
            {!college && (
              <Link href="/colleges" className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                <GraduationCap className="w-3.5 h-3.5" />
                اختر كليتك
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:border-r sm:border-border sm:pr-6">
            {[
              { label: "المحاولات", value: progress?.stats.totalAttempts ?? 0, icon: Brain, color: "text-primary" },
              { label: "الدروس", value: progress?.lessonsPassed ?? 0, icon: CheckCircle, color: "text-green-400" },
              { label: "الإجابات الصحيحة", value: progress?.stats.totalScore ?? 0, icon: Award, color: "text-yellow-400" },
              { label: "الأسئلة", value: progress?.stats.totalQuestions ?? 0, icon: Target, color: "text-secondary" },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="text-center">
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${k.color}`} />
                  <p className="text-lg font-bold text-text-primary">{k.value}</p>
                  <p className="text-[10px] text-text-muted">{k.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
                <BarChart2 className="w-4 h-4 text-primary" />
                أداء المواد
              </h2>
              {radarData.length > 0 ? (
                <RadarChart data={radarData} />
              ) : (
                <div className="py-8 text-center text-text-muted text-xs">لا بيانات بعد — أكمل بعض الاختبارات</div>
              )}
            </div>

            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-warning" />
                نشاط الأسبوع
              </h2>
              <WeekBar data={progress?.weeklyActivity ?? []} />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-secondary" />
                تفصيل المواد
              </h2>
            </div>
            <div className="divide-y divide-border">
              {(progress?.subjectBreakdown ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-text-muted text-xs">لا بيانات — ابدأ الاختبارات</div>
              ) : (
                progress?.subjectBreakdown?.map((s) => (
                  <div key={String(s._id)} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-primary">
                        {lang === "ar" ? s.name : s.nameEn}
                      </span>
                      <span className={`text-sm font-bold ${s.avgPct >= 70 ? "text-green-400" : s.avgPct >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                        {s.avgPct}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${s.avgPct >= 70 ? "bg-green-500" : s.avgPct >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${s.avgPct}%` }} />
                    </div>
                    <p className="text-[10px] text-text-muted mt-1">{s.attempts} محاولة</p>
                  </div>
                ))
              )}
            </div>

            {(strengthSubjects.length > 0 || weakSubjects.length > 0) && (
              <div className="px-5 py-4 bg-background/50 border-t border-border space-y-3">
                {strengthSubjects.length > 0 && (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-green-400">نقاط قوتك</p>
                      <p className="text-[11px] text-text-muted">{strengthSubjects.map(s => s.name || s.nameEn).join("، ")}</p>
                    </div>
                  </div>
                )}
                {weakSubjects.length > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-red-400">تحتاج تحسيناً</p>
                      <p className="text-[11px] text-text-muted">{weakSubjects.map(s => s.name || s.nameEn).join("، ")}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-info" />
                آخر المحاولات
              </h2>
            </div>
            <div className="divide-y divide-border">
              {(progress?.recent ?? []).length === 0 ? (
                <div className="px-5 py-8 text-center text-text-muted text-xs">لا محاولات بعد</div>
              ) : (
                progress?.recent.map((a) => (
                  <Link key={a.id} href={`/dashboard/topic/${a.topicSlug}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-surface-hover transition-colors">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${a.percentage >= 70 ? "bg-green-400" : a.percentage >= 40 ? "bg-yellow-400" : "bg-red-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{a.topicTitle}</p>
                      <p className="text-[11px] text-text-muted">{a.subjectName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-bold ${a.percentage >= 70 ? "text-green-400" : a.percentage >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                        {a.percentage}%
                      </p>
                      <p className="text-[10px] text-text-muted">{a.score}/{a.total}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {subjects.length > 0 && (
              <div className="p-5 border-t border-border space-y-2">
                <p className="text-xs font-bold text-text-primary mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-warning" /> ابدأ الدراسة
                </p>
                {subjects.map(s => (
                  <Link key={s._id} href={`/dashboard/subject/${s.slug}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-background border border-border hover:border-primary/40 hover:bg-surface-hover transition-all group">
                    <span className="text-xs font-medium text-text-primary">
                      {lang === "ar" ? s.nameAr : s.nameEn}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
