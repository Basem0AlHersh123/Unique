"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import api from "@/lib/api";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageProvider';

export default function LoginPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  function onCaptchaSuccess(token: string) {
    setValue("turnstileToken", token);
  }

  async function onSubmit(data: LoginInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post("/api/auth/login", data);
      const result = res.data;

      if (!result.success) {
        setServerError(result.error);
        resetField("turnstileToken");
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem("accessToken", result.data.accessToken);
      router.push("/dashboard");
    } catch {
      setServerError("تعذر الاتصال بالخادم، تحقق من اتصالك بالإنترنت");
      setIsSubmitting(false);
    }
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-6 relative">
      <div className="w-full max-w-md flex items-center justify-between mb-4 sm:mb-0 sm:absolute sm:top-6 sm:left-6 sm:w-auto">
        <ThemeToggle />
        <div className="sm:absolute sm:top-0 sm:-right-0">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 ml-1" />
              العودة
            </Button>
          </Link>
        </div>
      </div>

      <div className="w-full max-w-md relative mt-2 sm:mt-0">
        <div className="hidden sm:block absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="hidden sm:block absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="relative glass rounded-3xl p-5 sm:p-8 border border-border/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white text-2xl mb-4 shadow-lg shadow-primary/20">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{t('auth.login.title')}</h1>
            <p className="text-text-secondary text-sm mt-1">{t('auth.login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label={t('auth.login.email')}
              type="email"
              placeholder="example@email.com"
              icon={<Mail className="w-5 h-5" />}
              {...register("email")}
              error={errors.email?.message}
            />

            <Input
              label={t('auth.login.password')}
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-5 h-5" />}
              {...register("password")}
              error={errors.password?.message}
            />
            <div className="text-left -mt-2">
              <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                {t('auth.login.forgot')}
              </Link>
            </div>

            <div className="flex justify-center py-2 overflow-x-auto">
              <div className="scale-[0.85] sm:scale-100 origin-center">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
                  onSuccess={onCaptchaSuccess}
                />
              </div>
            </div>
            {errors.turnstileToken && (
              <p className="text-sm text-danger text-center animate-slide-in-right">
                {errors.turnstileToken.message}
              </p>
            )}

            {serverError && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm animate-slide-in-right">
                {serverError}
              </div>
            )}

            <Button type="submit" isLoading={isSubmitting} className="flex items-center gap-2 mt-2 justify-center">
              {t('auth.login.button')}
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            {t('auth.login.no_account')}{" "}
            <Link href="/auth/register" className="text-primary font-medium hover:underline">
              {t('auth.login.register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
