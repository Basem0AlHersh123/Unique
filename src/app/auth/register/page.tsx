"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import api from "@/lib/api";
import { UserPlus, ArrowLeft } from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageProvider';

export default function RegisterPage() {
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
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { turnstileToken: "" },
  });

  function onCaptchaSuccess(token: string) {
    setValue("turnstileToken", token);
  }

  async function onSubmit(data: RegisterInput) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post("/api/auth/register", data);
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
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen flex items-center justify-center px-4 py-6 relative">
      <div className="absolute top-6 left-6">
        <ThemeToggle />
      </div>
      <div className="absolute top-6 right-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 ml-1" />
            العودة
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-md relative">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative glass rounded-3xl p-8 border border-border/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white text-2xl mb-4 shadow-lg shadow-primary/20">
              <UserPlus className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{t('auth.register.title')}</h1>
            <p className="text-text-secondary text-sm mt-1">{t('auth.register.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label={t('auth.register.name')}
              placeholder="مثال: أحمد محمد"
              {...register("name")}
              error={errors.name?.message}
            />

            <Input
              label={t('auth.register.email')}
              type="email"
              placeholder="example@email.com"
              {...register("email")}
              error={errors.email?.message}
            />

            <Input
              label={t('auth.register.password')}
              type="password"
              placeholder="8 أحرف على الأقل"
              {...register("password")}
              error={errors.password?.message}
            />

            <div className="flex justify-center py-2">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string}
                onSuccess={onCaptchaSuccess}
              />
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
              {t('auth.register.button')}
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            {t('auth.register.has_account')}{" "}
            <Link href="/auth/login" className="text-primary font-medium hover:underline">
              {t('auth.register.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
