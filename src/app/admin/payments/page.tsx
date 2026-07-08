"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { CreditCard, RefreshCw, TrendingUp, Users, CheckCircle, Clock, XCircle, Infinity } from "lucide-react";

interface Payment {
  _id: string;
  userId: { _id: string; name: string; email: string } | null;
  orderId: string;
  plan: "monthly" | "quarterly" | "lifetime";
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "expired";
  paidAt?: string;
  expiresAt?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  successful: number;
  pending: number;
  revenue: number;
  paidStudents: number;
}

const PLAN_LABELS: Record<string, string> = {
  monthly: "شهري",
  quarterly: "ربع سنوي",
  lifetime: "مدى الحياة",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "danger" | "secondary"; icon: React.ElementType }> = {
  success: { label: "ناجح", variant: "success", icon: CheckCircle },
  pending: { label: "معلق", variant: "warning", icon: Clock },
  failed: { label: "فاشل", variant: "danger", icon: XCircle },
  expired: { label: "منتهي", variant: "secondary", icon: Clock },
};

export default function PaymentsPage() {
  const { lang } = useLanguage();
  const { showToast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, statsRes] = await Promise.all([
        apiFetch<Payment[]>("/api/admin/payments"),
        apiFetch<Stats>("/api/admin/payments/stats"),
      ]);
      if (paymentsRes.success) setPayments(paymentsRes.data ?? []);
      if (statsRes.success) setStats(statsRes.data ?? null);
    } catch {
      showToast("فشل تحميل بيانات المدفوعات", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function grantPaid(userId: string, userName: string) {
    setGrantingId(userId);
    try {
      await apiFetch(`/api/admin/students/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ tier: "paid" }),
      });
      showToast(`تم ترقية ${userName} إلى مدفوع`, "success");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "حدث خطأ", "error");
    } finally {
      setGrantingId(null);
    }
  }

  const filtered = statusFilter === "all"
    ? payments
    : payments.filter(p => p.status === statusFilter);

  const formatYER = (amount: number) =>
    new Intl.NumberFormat("ar-YE", { style: "currency", currency: "YER", maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {lang === "ar" ? "المدفوعات والاشتراكات" : "Payments & Subscriptions"}
            </h1>
            <p className="text-xs text-text-muted">
              {lang === "ar" ? "إدارة مدفوعات الطلاب وترقية الحسابات" : "Manage student payments and account upgrades"}
            </p>
          </div>
        </div>
        <Button onClick={load} variant="secondary" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {lang === "ar" ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: TrendingUp, label: lang === "ar" ? "إجمالي الإيرادات" : "Total Revenue", value: formatYER(stats.revenue), color: "text-green-400" },
            { icon: CheckCircle, label: lang === "ar" ? "مدفوعات ناجحة" : "Successful", value: String(stats.successful), color: "text-green-400" },
            { icon: Clock, label: lang === "ar" ? "معلقة" : "Pending", value: String(stats.pending), color: "text-yellow-400" },
            { icon: Users, label: lang === "ar" ? "طلاب مدفوعون" : "Paid Students", value: String(stats.paidStudents), color: "text-primary" },
          ].map((s, i) => (
            <Card key={i} className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color} shrink-0`} />
              <div>
                <p className="text-xs text-text-muted">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["all", "success", "pending", "failed", "expired"].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === f
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary border border-border hover:border-primary/40"
            }`}
          >
            {f === "all" ? (lang === "ar" ? "الكل" : "All") : STATUS_CONFIG[f]?.label ?? f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 shimmer rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-text-muted">{lang === "ar" ? "لا توجد مدفوعات" : "No payments found"}</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const statusCfg = STATUS_CONFIG[p.status];
            const StatusIcon = statusCfg?.icon ?? Clock;
            return (
              <Card key={p._id} className="p-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <StatusIcon className={`w-5 h-5 shrink-0 ${
                    p.status === "success" ? "text-green-400" :
                    p.status === "pending" ? "text-yellow-400" : "text-red-400"
                  }`} />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">
                      {p.userId?.name ?? "مستخدم محذوف"}
                    </p>
                    <p className="text-xs text-text-muted truncate">{p.userId?.email ?? "—"}</p>
                  </div>

                  <span className="text-sm text-text-secondary">
                    {PLAN_LABELS[p.plan] ?? p.plan}
                  </span>

                  <span className="text-sm font-semibold text-text-primary">
                    {formatYER(p.amount)}
                  </span>

                  <span className="text-xs text-text-muted hidden md:block">
                    {p.plan === "lifetime" ? (
                      <span className="flex items-center gap-1"><Infinity className="w-3 h-3" /> مدى الحياة</span>
                    ) : p.expiresAt ? (
                      new Date(p.expiresAt).toLocaleDateString("ar-SA")
                    ) : "—"}
                  </span>

                  <Badge variant={statusCfg?.variant ?? "secondary"}>
                    {statusCfg?.label ?? p.status}
                  </Badge>

                  <span className="text-xs text-text-muted hidden lg:block">
                    {new Date(p.createdAt).toLocaleDateString("ar-SA")}
                  </span>

                  {p.userId && p.status !== "success" && (
                    <button
                      onClick={() => grantPaid(p.userId!._id, p.userId!.name)}
                      disabled={grantingId === p.userId._id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
                    >
                      {grantingId === p.userId._id ? "..." : lang === "ar" ? "ترقية يدوية" : "Manual Grant"}
                    </button>
                  )}
                </div>

                <p className="text-xs text-text-muted mt-1 font-mono opacity-50">{p.orderId}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
