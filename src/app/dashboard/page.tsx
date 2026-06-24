"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { getAuthOrRefresh, type AuthUser } from "@/lib/auth-client";
import { 
  BookOpen, 
  Award, 
  TrendingUp, 
  Calendar,
  Clock,
  Sparkles,
  Brain,
  Target,
} from "lucide-react";

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
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) { router.push("/auth/login"); return; }
      if (!cancelled) setUser(u);
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<ProgressData>("/api/dashboard/progress");
        if (res.success && res.data) {
          setProgress(res.data);
        }
      } catch {
        // silent — dashboard still renders with defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = progress ? [
    { label: t('dashboard.stat.attempts'), value: String(progress.stats.totalAttempts), icon: Brain, color: "from-primary to-primary-dark" },
    { label: t('dashboard.stat.correct'), value: String(progress.stats.totalScore), icon: Award, color: "from-secondary to-teal" },
    { label: t('dashboard.stat.avg'), value: `${progress.stats.averagePercentage}%`, icon: Target, color: "from-warning to-accent" },
    { label: t('dashboard.stat.questions'), value: String(progress.stats.totalQuestions), icon: BookOpen, color: "from-danger to-accent" },
  ] : [
    { label: t('dashboard.stat.attempts'), value: "0", icon: Brain, color: "from-primary to-primary-dark" },
    { label: t('dashboard.stat.correct'), value: "0", icon: Award, color: "from-secondary to-teal" },
    { label: t('dashboard.stat.avg'), value: "0%", icon: Target, color: "from-warning to-accent" },
    { label: t('dashboard.stat.questions'), value: "0", icon: BookOpen, color: "from-danger to-accent" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-text-secondary">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-4">
        <div className="space-y-8">
          {/* Welcome + Browse */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
                {t('dashboard.welcome')} {user?.name || ""} 👋
              </h1>
              <p className="text-text-secondary mt-1 text-sm sm:text-base">
                {t('dashboard.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link href="/colleges">
                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <BookOpen className="w-4 h-4" />
                  {t('dashboard.browse_colleges')}
                </button>
              </Link>
              <div className="flex items-center gap-2 px-4 py-2 bg-teal/10 rounded-xl border border-teal/20">
                <Award className="w-5 h-5 text-teal" />
                <span className="text-sm font-medium text-teal">{t('dashboard.level')}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} withGlass withHover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-text-secondary text-sm">{stat.label}</p>
                      <p className="text-2xl font-bold text-text-primary mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Progress Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card withGlass>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {t('dashboard.recent')}
                  </h2>
                </div>
                {progress && progress.recent.length > 0 ? (
                  <div className="space-y-3">
                    {progress.recent.map((a) => (
                      <Link
                        key={a.id}
                        href={`/dashboard/topic/${a.topicSlug}/quiz`}
                        className="block p-4 rounded-xl bg-surface-hover/50 hover:bg-surface-hover transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-text-primary text-sm">
                            {a.topicTitle}
                          </span>
                          <span className={`text-sm font-bold ${
                            a.percentage >= 70 ? "text-teal" : a.percentage >= 40 ? "text-warning" : "text-danger"
                          }`}>
                            {a.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              a.percentage >= 70 ? "bg-teal" : a.percentage >= 40 ? "bg-warning" : "bg-danger"
                            }`}
                            style={{ width: `${a.percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-text-muted">{a.subjectName}</span>
                          <span className="text-xs text-text-muted">{a.score}/{a.total}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    <Brain className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('dashboard.no_attempts')}</p>
                    <Link href="/colleges">
                      <button className="mt-3 text-sm text-primary hover:underline">
                        {t('dashboard.visit')}
                      </button>
                    </Link>
                  </div>
                )}
              </Card>
            </div>

            <div>
              <Card withGlass>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-secondary/10">
                    <Calendar className="w-5 h-5 text-secondary" />
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {t('dashboard.daily_tasks')}
                  </h2>
                </div>
                <div className="space-y-3">
                  {[
                    { task: t('dashboard.task1'), time: t('dashboard.task1_time') },
                    { task: t('dashboard.task2'), time: t('dashboard.task2_time') },
                    { task: t('dashboard.task3'), time: t('dashboard.task3_time') },
                  ].map((task, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface-hover/50 hover:bg-surface-hover transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm text-text-primary">
                          {task.task}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-text-muted">
                        <Clock className="w-3 h-3" />
                        {task.time}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-4">
            <Link href="/colleges">
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                <BookOpen className="w-5 h-5" />
                {t('dashboard.browse_colleges')}
              </button>
            </Link>
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-surface border border-border text-text-primary hover:bg-surface-hover transition-all duration-300">
              <Brain className="w-5 h-5" />
              {t('dashboard.start_quiz')}
            </button>
          </div>
        </div>
      </main>

    </div>
  );
}
