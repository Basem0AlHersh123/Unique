"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { apiFetch } from "@/lib/api";
import { Mail, ArrowLeft, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen flex items-center justify-center px-4 py-6 relative"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass rounded-3xl p-8 border border-border/50 shadow-2xl scale-in">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal/10 text-teal mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary">
                {t("auth.forgot.title")}
              </h1>
              <p className="text-text-secondary text-sm">{t("auth.forgot.sent")}</p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-primary text-sm hover:underline mt-4"
              >
                <ArrowLeft className={`w-4 h-4 ${isRTL ? "" : "rotate-180"}`} />
                {t("auth.forgot.back")}
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white text-2xl mb-4 shadow-lg shadow-primary/20">
                  <Mail className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">
                  {t("auth.forgot.title")}
                </h1>
                <p className="text-text-secondary text-sm mt-1">
                  {t("auth.forgot.subtitle")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.forgot.email")}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-border bg-surface text-text-primary text-sm focus:outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                  />
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={loading}
                  className="w-full justify-center hover:scale-[1.02] transition-all duration-300"
                >
                  {t("auth.forgot.button")}
                </Button>
              </form>

              <p className="text-center text-sm text-text-secondary mt-6">
                <Link
                  href="/auth/login"
                  className="text-primary font-medium hover:underline"
                >
                  {t("auth.forgot.back")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}