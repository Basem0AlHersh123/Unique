"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ClipboardList, CheckCircle, XCircle, TrendingUp, Users, RefreshCw } from "lucide-react";

interface ExamAttempt {
  _id: string;
  userId: { _id: string; name: string; email: string; tier: string } | null;
  unitId: { _id: string; title: string } | null;
  subjectId: { _id: string; nameAr: string; nameEn: string } | null;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  attemptNumber: number;
  takenAt: string;
}

interface Stats {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  avgScore: number;
}

export default function ExamResultsPage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [passFilter, setPassFilter] = useState<"all" | "true" | "false">("all");
  const [searchUser, setSearchUser] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (passFilter !== "all") params.set("passed", passFilter);
      const res = await apiFetch<{ attempts: ExamAttempt[]; stats: Stats }>(
        `/api/admin/exam-results?${params}`
      );
      if (res.success && res.data) {
        setAttempts(res.data.attempts);
        setStats(res.data.stats);
      }
    } catch {
      showToast("فشل تحميل نتائج الاختبارات", "error");
    } finally {
      setLoading(false);
    }
  }, [passFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = searchUser
    ? attempts.filter((a) =>
        a.userId?.name.toLowerCase().includes(searchUser.toLowerCase()) ||
        a.userId?.email.toLowerCase().includes(searchUser.toLowerCase())
      )
    : attempts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {lang === "ar" ? "نتائج اختبارات الوحدات" : "Unit Exam Results"}
            </h1>
            <p className="text-xs text-text-muted">
              {lang === "ar" ? "جميع محاولات الاختبارات للطلاب" : "All student exam attempts"}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-text-secondary hover:border-primary hover:text-primary transition-all text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          {lang === "ar" ? "تحديث" : "Refresh"}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, label: lang === "ar" ? "إجمالي المحاولات" : "Total Attempts", value: stats.total, color: "text-primary" },
            { icon: CheckCircle, label: lang === "ar" ? "نجح" : "Passed", value: stats.passed, color: "text-green-400" },
            { icon: XCircle, label: lang === "ar" ? "رسب" : "Failed", value: stats.failed, color: "text-red-400" },
            { icon: TrendingUp, label: lang === "ar" ? "متوسط الدرجة" : "Avg Score", value: `${stats.avgScore}%`, color: "text-yellow-400" },
          ].map((s, i) => (
            <Card key={i} className="p-4 flex items-center gap-3">
              <s.icon className={`w-7 h-7 ${s.color} shrink-0`} />
              <div>
                <p className="text-xs text-text-muted">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {stats && stats.total > 0 && (
        <Card className="p-4">
          <div className="flex justify-between text-sm text-text-secondary mb-2">
            <span>{lang === "ar" ? "نسبة النجاح" : "Pass Rate"}</span>
            <span className="font-bold text-green-400">{stats.passRate}%</span>
          </div>
          <div className="h-3 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${stats.passRate}%` }}
            />
          </div>
        </Card>
      )}

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-2">
          {(["all", "true", "false"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPassFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                passFilter === f
                  ? "bg-primary text-white"
                  : "bg-surface text-text-secondary border border-border hover:border-primary/40"
              }`}
            >
              {f === "all"
                ? lang === "ar" ? "الكل" : "All"
                : f === "true"
                ? lang === "ar" ? "ناجح" : "Passed"
                : lang === "ar" ? "راسب" : "Failed"}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          placeholder={lang === "ar" ? "بحث بالاسم أو الإيميل..." : "Search by name or email..."}
          className="flex-1 min-w-[200px] px-4 py-2 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 shimmer rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardList className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-text-muted">{lang === "ar" ? "لا توجد نتائج" : "No results found"}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <Card key={a._id} className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {a.passed
                  ? <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                  : <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                }

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary text-sm truncate">
                    {a.userId?.name ?? "مستخدم محذوف"}
                  </p>
                  <p className="text-xs text-text-muted truncate">{a.userId?.email}</p>
                </div>

                <div className="text-sm text-text-secondary min-w-0 max-w-[160px] truncate">
                  {a.unitId?.title ?? "وحدة محذوفة"}
                </div>

                <span className={`text-lg font-bold min-w-[52px] text-center ${
                  a.passed ? "text-green-400" : "text-red-400"
                }`}>
                  {a.score}%
                </span>

                <span className="text-xs text-text-muted">
                  {a.correctAnswers}/{a.totalQuestions}
                </span>

                <Badge variant={a.attemptNumber === 1 ? "success" : a.attemptNumber === 2 ? "warning" : "danger"}>
                  {lang === "ar" ? `محاولة ${a.attemptNumber}` : `Attempt ${a.attemptNumber}`}
                </Badge>

                {a.userId?.tier === "paid" && (
                  <Badge variant="primary">Premium</Badge>
                )}

                <span className="text-xs text-text-muted hidden md:block">
                  {new Date(a.takenAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
