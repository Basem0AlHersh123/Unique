"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
  Users, BookOpen, HelpCircle, Activity, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle, Clock, Zap, Shield, BarChart2,
  GraduationCap, Building2, Layers, MessageCircle, Award,
  ArrowUpRight, RefreshCw, Eye, Database,
} from "lucide-react";

interface AdminStats {
  universities: number;
  colleges: number;
  subjects: number;
  levels: number;
  units: number;
  topics: number;
  questions: number;
  students: number;
  teachers: number;
  attempts: number;
  attemptsToday: number;
  attemptsWeek: number;
  activeToday: number;
  activeWeek: number;
  freeStudents: number;
  paidStudents: number;
  totalGroups: number;
  totalLessonsCompleted: number;
  newStudentsMonth: number;
  registrationByDay: { _id: string; count: number }[];
  activityByDay: { _id: string; count: number }[];
  subjectPerformance: { _id: string; name: string; nameEn: string; attempts: number; avgScore: number }[];
  recentStudents: { id: string; name: string; email: string; tier: string; joinedAt: string }[];
  recentAttempts: { id: string; studentName: string; topicTitle: string; score: number; total: number; pct: number; completedAt: string }[];
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 32;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-80">
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} strokeLinejoin="round" strokeLinecap="round" />
      <polyline fill={color} fillOpacity="0.12" stroke="none"
        points={`0,${h} ${pts} ${w},${h}`} />
    </svg>
  );
}

function StatCard({
  label, value, sub, icon: Icon, color, sparkData, trend, href,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; sparkData?: number[]; trend?: "up" | "down" | "neutral";
  href?: string;
}) {
  const inner = (
    <div className={`relative bg-surface border border-border rounded-xl p-5 overflow-hidden hover:border-${color}/40 transition-all duration-300 group cursor-pointer`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-${color} to-transparent opacity-60`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg bg-${color}/10 border border-${color}/20`}>
          <Icon className={`w-4 h-4 text-${color}`} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-text-muted"}`}>
            {trend === "up" ? <TrendingUp className="w-3 h-3" /> : trend === "down" ? <TrendingDown className="w-3 h-3" /> : null}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-text-primary tabular-nums">{value}</p>
          <p className="text-xs text-text-muted mt-0.5">{label}</p>
          {sub && <p className="text-[11px] text-text-muted/70 mt-0.5">{sub}</p>}
        </div>
        {sparkData && <MiniSparkline data={sparkData} color={`#6C63FF`} />}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function PctBar({ pct, color = "primary" }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-${color} transition-all duration-700`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}

export default function AdminHome() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function load() {
    setLoading(true);
    const res = await apiFetch<AdminStats>("/api/admin/stats");
    if (res.success && res.data) setStats(res.data);
    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const sparkActivity = stats?.activityByDay.map(d => d.count) ?? [];
  const sparkReg = stats?.registrationByDay.map(d => d.count) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            لوحة التحكم — SIEM
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            آخر تحديث: {lastRefresh.toLocaleTimeString("ar")}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-text-secondary text-xs hover:bg-surface-hover transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 shimmer rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="الطلاب" value={stats?.students ?? 0}
              sub={`${stats?.activeToday ?? 0} نشط اليوم`}
              icon={Users} color="primary" sparkData={sparkReg} trend="up"
              href="/admin/students" />
            <StatCard label="المحاولات اليوم" value={stats?.attemptsToday ?? 0}
              sub={`${stats?.attemptsWeek ?? 0} هذا الأسبوع`}
              icon={Activity} color="teal" sparkData={sparkActivity}
              trend={stats && stats.attemptsToday > 0 ? "up" : "neutral"} />
            <StatCard label="الدروس" value={stats?.topics ?? 0}
              sub={`${stats?.totalLessonsCompleted ?? 0} مكتمل`}
              icon={BookOpen} color="secondary" href="/admin/topics" />
            <StatCard label="الأسئلة" value={stats?.questions ?? 0}
              icon={HelpCircle} color="warning" href="/admin/questions" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="المعلمون" value={stats?.teachers ?? 0}
              icon={GraduationCap} color="info" href="/admin/teachers" />
            <StatCard label="الجامعات" value={stats?.universities ?? 0}
              icon={Building2} color="accent" href="/admin/universities" />
            <StatCard label="الكليات" value={stats?.colleges ?? 0}
              icon={Layers} color="pink" href="/admin/colleges" />
            <StatCard label="طلاب مدفوعون" value={stats?.paidStudents ?? 0}
              sub={`${stats?.freeStudents ?? 0} مجاني`}
              icon={Award} color="success" />
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              آخر المحاولات
            </h2>
            <Link href="/admin/students" className="text-xs text-primary hover:underline">عرض الكل</Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 shimmer rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 shimmer rounded w-3/4" />
                    <div className="h-2.5 shimmer rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : stats?.recentAttempts.length === 0 ? (
              <div className="px-5 py-8 text-center text-text-muted text-sm">لا توجد محاولات بعد</div>
            ) : (
              stats?.recentAttempts.map((a) => (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${a.pct >= 70 ? "bg-green-400" : a.pct >= 40 ? "bg-yellow-400" : "bg-red-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{a.studentName}</p>
                    <p className="text-[11px] text-text-muted truncate">{a.topicTitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold ${a.pct >= 70 ? "text-green-400" : a.pct >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                      {a.pct}%
                    </p>
                    <p className="text-[10px] text-text-muted">{timeAgo(a.completedAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-secondary" />
                أداء المواد
              </h2>
            </div>
            <div className="p-5 space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 shimmer rounded w-1/2" />
                    <div className="h-1.5 shimmer rounded" />
                  </div>
                ))
              ) : stats?.subjectPerformance.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">لا بيانات بعد</p>
              ) : (
                stats?.subjectPerformance.map((s) => (
                  <div key={String(s._id)}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-primary font-medium truncate">{s.name || s.nameEn}</span>
                      <span className={`text-xs font-bold ml-2 shrink-0 ${s.avgScore >= 70 ? "text-green-400" : s.avgScore >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                        {s.avgScore}%
                      </span>
                    </div>
                    <PctBar pct={s.avgScore} color={s.avgScore >= 70 ? "teal" : s.avgScore >= 40 ? "warning" : "danger"} />
                    <p className="text-[10px] text-text-muted mt-0.5">{s.attempts} محاولة</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Zap className="w-4 h-4 text-warning" />
                طلاب جدد
              </h2>
              <span className="text-xs text-warning font-bold">{stats?.newStudentsMonth ?? 0} هذا الشهر</span>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 shimmer rounded-full" />
                    <div className="flex-1 h-3 shimmer rounded" />
                  </div>
                ))
              ) : (
                stats?.recentStudents.map((s) => (
                  <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {s.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{s.name}</p>
                      <p className="text-[10px] text-text-muted">{timeAgo(s.joinedAt)}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${s.tier === "paid" ? "bg-yellow-500/10 text-yellow-400" : "bg-border text-text-muted"}`}>
                      {s.tier === "paid" ? "مدفوع" : "مجاني"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إدارة الطلاب", href: "/admin/students", icon: Users, color: "primary" },
          { label: "إدارة المحتوى", href: "/admin/topics", icon: BookOpen, color: "secondary" },
          { label: "الأسئلة", href: "/admin/questions", icon: HelpCircle, color: "warning" },
          { label: "المجموعات", href: "/admin/groups", icon: MessageCircle, color: "teal" },
        ].map((q) => {
          const Icon = q.icon;
          return (
            <Link key={q.href} href={q.href}
              className={`flex items-center gap-3 p-4 rounded-xl bg-surface border border-border hover:border-${q.color}/40 hover:bg-surface-hover transition-all group`}>
              <div className={`p-2 rounded-lg bg-${q.color}/10 group-hover:bg-${q.color}/20 transition-colors`}>
                <Icon className={`w-4 h-4 text-${q.color}`} />
              </div>
              <span className="text-sm font-medium text-text-primary">{q.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
