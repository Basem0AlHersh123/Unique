"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { apiFetch } from "@/lib/api";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const { t, isRTL } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiFetch(`/api/auth/reset-password/${token}`)
      .then((res) => setValid(res.success))
      .catch(() => setValid(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("كلمة المرور غير متطابقة");
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (valid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="shimmer w-48 h-6 rounded" />
      </div>
    );
  }

  if (!valid) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="glass rounded-3xl p-8 border border-border/50 shadow-2xl max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-danger/10 text-danger mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">{t("auth.reset.title")}</h1>
          <p className="text-text-secondary text-sm mb-6">{t("auth.reset.invalid")}</p>
          <Link href="/auth/forgot-password">
            <Button variant="secondary">{t("auth.forgot.button")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center px-4 py-6">
        <div className="glass rounded-3xl p-8 border border-border/50 shadow-2xl max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal/10 text-teal mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">{t("auth.reset.title")}</h1>
          <p className="text-text-secondary text-sm">{t("auth.reset.success")}</p>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 border border-border/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white text-2xl mb-4 shadow-lg shadow-primary/20">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{t("auth.reset.title")}</h1>
            <p className="text-text-secondary text-sm mt-1">{t("auth.reset.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.reset.password")}
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <PasswordStrength password={password} />
            </div>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t("auth.reset.confirm")}
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm">
                {error}
              </div>
            )}

            <Button type="submit" isLoading={loading} className="w-full justify-center">
              {t("auth.reset.button")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
