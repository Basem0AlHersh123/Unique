"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Turnstile } from "@marsidev/react-turnstile";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { apiFetch } from "@/lib/api";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import axios from "axios";
import api from "@/lib/api";
import { UserPlus, ArrowLeft, Building2, ChevronLeft, Check } from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageProvider';

interface University {
  _id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  icon?: string;
  color?: string;
}

interface College {
  _id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  icon: string;
  color: string;
  universityId?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { t, isRTL } = useLanguage();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const [universities, setUniversities] = useState<University[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedCollegeId, setSelectedCollegeId] = useState("");

  const [universitiesLoading, setUniversitiesLoading] = useState(false);
  const [collegesLoading, setCollegesLoading] = useState(false);
  const [universitiesEmpty, setUniversitiesEmpty] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    resetField,
    trigger,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { turnstileToken: "" },
  });

  useEffect(() => {
    if (step === 2) {
      setUniversitiesLoading(true);
      setUniversitiesEmpty(false);
      apiFetch<University[]>("/api/admin/universities")
        .then((res) => {
          const data = res.success && res.data ? res.data : [];
          setUniversities(data);
          if (data.length === 0) setUniversitiesEmpty(true);
        })
        .catch(() => { setUniversitiesEmpty(true); })
        .finally(() => setUniversitiesLoading(false));
    }
  }, [step]);

  useEffect(() => {
    if (!universitiesEmpty) return;
    if (!selectedUniversityId) {
      setCollegesLoading(true);
      apiFetch<College[]>("/api/admin/colleges")
        .then((res) => {
          if (res.success && res.data) setColleges(res.data);
        })
        .catch(() => {})
        .finally(() => setCollegesLoading(false));
    }
  }, [universitiesEmpty, selectedUniversityId]);

  useEffect(() => {
    if (!selectedUniversityId) { setColleges([]); return; }
    setCollegesLoading(true);
    apiFetch<College[]>(`/api/admin/colleges?universityId=${selectedUniversityId}`)
      .then((res) => {
        if (res.success && res.data) setColleges(res.data);
      })
      .catch(() => {})
      .finally(() => setCollegesLoading(false));
  }, [selectedUniversityId]);

  function onCaptchaSuccess(token: string) {
    setValue("turnstileToken", token);
  }

  async function handleNext() {
    const valid = await trigger(["name", "email", "password"]);
    if (valid) setStep(2);
  }

  async function onSubmit(data: RegisterInput) {
    const body = {
      ...data,
      collegeId: selectedCollegeId || undefined,
    };

    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post("/api/auth/register", body);
      const result = res.data;

      if (!result.success) {
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
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white text-2xl mb-4 shadow-lg shadow-primary/20">
              <UserPlus className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">{t('auth.register.title')}</h1>
            <p className="text-text-secondary text-sm mt-1">{t('auth.register.subtitle')}</p>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className={`w-2.5 h-2.5 rounded-full ${step === 1 ? "bg-primary" : "bg-primary/30"}`} />
              <div className="w-8 h-px bg-border" />
              <div className={`w-2.5 h-2.5 rounded-full ${step === 2 ? "bg-primary" : "bg-primary/30"}`} />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Step 1: Basic info */}
            {step === 1 && (
              <>
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

                <div>
                  <Input
                    label={t('auth.register.password')}
                    type="password"
                    placeholder="8 أحرف على الأقل"
                    {...register("password")}
                    error={errors.password?.message}
                  />
                  <PasswordStrength password={watch?.("password") ?? ""} />
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

                <Button type="button" onClick={handleNext} className="flex items-center gap-2 mt-2 justify-center">
                  التالي
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Step 2: University & College */}
            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  العودة
                </button>

                {universitiesLoading ? (
                  <LoadingSkeleton />
                ) : universities.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      اختر الجامعة
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {universities.map((u) => {
                        const isSelected = selectedUniversityId === u._id;
                        return (
                          <button
                            key={u._id}
                            type="button"
                            onClick={() => {
                              setSelectedUniversityId(u._id);
                              setSelectedCollegeId("");
                            }}
                            className={`flex items-center gap-2 p-3 rounded-xl border text-right transition-all ${
                              isSelected
                                ? "bg-primary/10 border-primary text-text-primary"
                                : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                            }`}
                          >
                            <span className="text-lg">{u.icon || "🎓"}</span>
                            <span className="text-sm font-medium truncate">{u.name}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary mr-auto shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedUniversityId && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      اختر الكلية
                    </label>
                    {collegesLoading ? (
                      <LoadingSkeleton />
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {colleges.map((c) => {
                          const isSelected = selectedCollegeId === c._id;
                          return (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => setSelectedCollegeId(c._id)}
                              className={`flex items-center gap-2 p-3 rounded-xl border text-right transition-all ${
                                isSelected
                                  ? "bg-primary/10 border-primary text-text-primary"
                                  : "bg-surface border-border text-text-secondary hover:bg-surface-hover"
                              }`}
                            >
                              <Building2 className={`w-5 h-5 ${isSelected ? "text-primary" : "text-text-muted"}`} />
                              <span className="text-sm font-medium truncate">{c.name}</span>
                              {isSelected && <Check className="w-4 h-4 text-primary mr-auto shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {selectedUniversityId && colleges.length === 0 && !collegesLoading && (
                  <p className="text-sm text-text-muted text-center py-2">
                    لا توجد كليات متاحة لهذه الجامعة
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => { setSelectedUniversityId(""); setSelectedCollegeId(""); }}
                  className="text-sm text-text-muted hover:text-text-primary transition-colors text-center"
                >
                  تخطي هذه الخطوة
                </button>

                {serverError && (
                  <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm animate-slide-in-right">
                    {serverError}
                  </div>
                )}

                <Button type="submit" isLoading={isSubmitting} className="flex items-center gap-2 mt-2 justify-center">
                  {t('auth.register.button')}
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </>
            )}
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
