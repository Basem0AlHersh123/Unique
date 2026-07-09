"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import axios from "axios";
import api from "@/lib/api";
import { Mail, Lock, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function LoginPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivatedEmail, setDeactivatedEmail] = useState<string | null>(null);
  const [deactivatedPassword, setDeactivatedPassword] = useState<string>("");
  const [reactivating, setReactivating] = useState(false);
  const [reactivateError, setReactivateError] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    resetField,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { turnstileToken: "" },
  });

  useEffect(() => {
    if (localStorage.getItem("accessToken")) {
      router.replace("/dashboard");
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  function onCaptchaSuccess(token: string) {
    setValue("turnstileToken", token);
    setTurnstileError(false);
  }

  function onCaptchaError() {
    setTurnstileError(true);
  }

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post("/api/auth/login", data);
      const result = res.data;

      if (!result.success) {
        if (result.error === "DEACTIVATED") {
          setDeactivatedEmail(data.email);
          setDeactivatedPassword(data.password);
          setReactivateError(null);
          setServerError(null);
          resetField("turnstileToken");
          setIsSubmitting(false);
          return;
        }
        setServerError(result.error);
        resetField("turnstileToken");
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem("accessToken", result.data.accessToken);
      router.push("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setServerError(err.response.data.error);
      } else if (axios.isAxiosError(err) && err.response?.data?.message) {
        setServerError(err.response.data.message);
      } else {
        setServerError("تعذر الاتصال بالخادم، تحقق من اتصالك بالإنترنت");
      }
      setIsSubmitting(false);
    }
  }

  async function handleReactivate() {
    if (!deactivatedEmail || !deactivatedPassword) return;
    setReactivating(true);
    setReactivateError(null);
    try {
      await api.post("/api/auth/reactivate", {
        email: deactivatedEmail,
        password: deactivatedPassword,
      });
      setDeactivatedEmail(null);
      setDeactivatedPassword("");
      setServerError("تم إعادة تفعيل الحساب بنجاح. حاول تسجيل الدخول مرة أخرى.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setReactivateError(err.response.data.error);
      } else {
        setReactivateError("فشل إعادة التفعيل. تحقق من كلمة المرور.");
      }
    } finally {
      setReactivating(false);
    }
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-6 relative"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#6C63FF]/12 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#EC4899]/08 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md flex items-center justify-between mb-4 sm:mb-0 sm:absolute sm:top-6 sm:left-6 sm:right-6 sm:max-w-none z-10">
        <ThemeToggle />
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "" : "rotate-180"}`} />
            {isRTL ? "العودة" : "Back"}
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10 mt-2 sm:mt-0">
        <div className="relative glass rounded-3xl p-5 sm:p-8 border border-border/50 shadow-2xl scale-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white text-2xl mb-4 shadow-lg shadow-primary/20">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              {t("auth.login.title")}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {t("auth.login.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label={t("auth.login.email")}
              type="email"
              placeholder="example@email.com"
              icon={<Mail className="w-5 h-5" />}
              {...register("email")}
              error={errors.email?.message}
            />

            <Input
              label={t("auth.login.password")}
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-5 h-5" />}
              {...register("password")}
              error={errors.password?.message}
            />
            <div className="text-left -mt-2">
              <Link
                href="/auth/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                {t("auth.login.forgot")}
              </Link>
            </div>

            <div className="flex justify-center py-2 overflow-x-auto">
              <div className="scale-[0.85] sm:scale-100 origin-center">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
                  onSuccess={onCaptchaSuccess}
                  onError={onCaptchaError}
                />
              </div>
            </div>
            {errors.turnstileToken && (
              <p className="text-sm text-danger text-center animate-slide-in-right">
                {errors.turnstileToken.message}
              </p>
            )}
            {turnstileError && (
              <p className="text-sm text-warning text-center">
                {isRTL
                  ? "تعذر تحميل التحقق الأمني. قد يكون هناك مانع إعلانات أو VPN قيد التشغيل."
                  : "Unable to load security check. Ad blocker or VPN may be active."}
              </p>
            )}

            {serverError && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm animate-slide-in-right">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              isLoading={isSubmitting}
              className="flex items-center gap-2 mt-2 justify-center hover:scale-105 transition-all duration-300"
            >
              {t("auth.login.button")}
              <ArrowLeft className={`w-5 h-5 ${isRTL ? "" : "rotate-180"}`} />
            </Button>
          </form>

          <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-3 text-text-muted">
                {isRTL ? "أو" : "Or"}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <GoogleButton mode="login" onError={(msg) => setServerError(msg)} />
          </div>

          <p className="text-center text-sm text-text-secondary mt-6">
            {t("auth.login.no_account")}{" "}
            <Link
              href="/auth/register"
              className="text-primary font-medium hover:underline"
            >
              {t("auth.login.register")}
            </Link>
          </p>
        </div>
      </div>

      {deactivatedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-surface rounded-2xl border border-border p-6 max-w-md w-full shadow-2xl space-y-4 scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {t("settings.reactivate_title")}
                </h3>
                <p className="text-sm text-text-secondary">
                  {t("settings.reactivate_desc")}
                </p>
              </div>
            </div>
            {reactivateError && (
              <p className="text-sm text-danger">{reactivateError}</p>
            )}
            <div className="flex gap-3">
              <Button
                onClick={handleReactivate}
                isLoading={reactivating}
                className="flex-1"
              >
                {t("settings.reactivate_confirm")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeactivatedEmail(null);
                  setDeactivatedPassword("");
                }}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}