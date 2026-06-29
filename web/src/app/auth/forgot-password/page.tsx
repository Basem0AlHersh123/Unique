"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { apiFetch } from "@/lib/api";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
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
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 border border-border/50 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal/10 text-teal mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary">{t("auth.forgot.title")}</h1>
              <p className="text-text-secondary text-sm">{t("auth.forgot.sent")}</p>
              <Link href="/auth/login" className="inline-flex items-center gap-2 text-primary text-sm hover:underline mt-4">
                <ArrowLeft className="w-4 h-4" />
                {t("auth.forgot.back")}
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white text-2xl mb-4 shadow-lg shadow-primary/20">
                  <Mail className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary">{t("auth.forgot.title")}</h1>
                <p className="text-text-secondary text-sm mt-1">{t("auth.forgot.subtitle")}</p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.forgot.email")}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />

                {error && (
                  <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" isLoading={loading} className="w-full justify-center">
                  {t("auth.forgot.button")}
                </Button>
              </form>

              <p className="text-center text-sm text-text-secondary mt-6">
                <Link href="/auth/login" className="text-primary font-medium hover:underline">
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
