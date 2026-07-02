"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getAuthOrRefresh } from "@/lib/auth-client";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  CheckCircle,
  XCircle,
  Award,
  ArrowLeft,
  AlertCircle,
  Clock,
  ChevronLeft,
  HelpCircle,
  Target,
  Sparkles,
} from "lucide-react";

interface ExamQuestion {
  _id: string;
  question: string;
  options: string[];
  difficulty: string;
}

interface ExamData {
  unitId: string;
  subjectId: string;
  totalQuestions: number;
  questions: ExamQuestion[];
}

interface Answer {
  questionId: string;
  answer: number;
}

interface ExamResult {
  passed: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  attemptNumber: number;
  nextAttemptAt: string | null;
}

export default function UnitExamPage() {
  const params = useParams();
  const router = useRouter();
  const { t, isRTL, lang } = useLanguage();
  const unitId = params.unitId as string;

  const [examData, setExamData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

  const fetchQuestions = useCallback(async () => {
    try {
      const res = await apiFetch<ExamData>(
        `/api/progress/unit-exam/questions?unitId=${unitId}`
      );
      if (!res.success || !res.data || !res.data.questions.length) {
        setError(res.error || "لا توجد أسئلة متاحة");
      } else {
        setExamData(res.data);
      }
    } catch {
      setError("فشل تحميل الأسئلة");
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) {
        router.push("/auth/login");
        return;
      }
      fetchQuestions();
    })();
  }, [router, fetchQuestions]);

  function answerQuestion() {
    if (selectedOption === null) return;
    const newAnswers = [
      ...answers,
      { questionId: examData!.questions[currentIndex]._id, answer: selectedOption },
    ];
    setAnswers(newAnswers);

    if (currentIndex < examData!.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
    } else {
      handleSubmit(newAnswers);
    }
  }

  async function handleSubmit(finalAnswers: Answer[]) {
    if (!examData) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<ExamResult>("/api/progress/unit-exam", {
        method: "POST",
        body: JSON.stringify({
          unitId: examData.unitId,
          subjectId: examData.subjectId,
          answers: finalAnswers,
        }),
      });
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || "فشل تسجيل المحاولة");
      }
    } catch {
      setError("حدث خطأ في تسجيل الإجابات");
    } finally {
      setSubmitting(false);
    }
  }

  const current = examData?.questions[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="minimal" />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-danger mx-auto mb-4" />
          <p className="text-text-muted text-lg mb-4">{error}</p>
          <Button variant="secondary" onClick={() => router.back()}>
            {lang === "ar" ? "العودة" : "Back"}
          </Button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="minimal" />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div
            className={`glass rounded-3xl p-8 border ${
              result.passed ? "border-teal/30" : "border-danger/30"
            } text-center scale-in`}
          >
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
                result.passed ? "bg-teal/10" : "bg-danger/10"
              }`}
            >
              {result.passed ? (
                <Award className="w-10 h-10 text-teal" />
              ) : (
                <XCircle className="w-10 h-10 text-danger" />
              )}
            </div>
            <h2
              className={`text-2xl font-bold mb-2 ${
                result.passed ? "text-teal" : "text-danger"
              }`}
            >
              {result.passed
                ? lang === "ar"
                  ? "تهانينا! لقد نجحت في الاختبار"
                  : "Congratulations! You passed!"
                : lang === "ar"
                ? "لم تنجح في الاختبار"
                : "You didn't pass"}
            </h2>
            <p className="text-text-secondary mb-6">
              {lang === "ar"
                ? `المحاولة رقم ${result.attemptNumber}`
                : `Attempt #${result.attemptNumber}`}
            </p>
            <div className="flex items-center justify-center gap-8 mb-8">
              <div>
                <p
                  className={`text-3xl font-extrabold ${
                    result.passed ? "text-teal" : "text-danger"
                  } tabular-nums`}
                >
                  {result.score}%
                </p>
                <p className="text-sm text-text-muted">
                  {lang === "ar" ? "النتيجة" : "Score"}
                </p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div>
                <p className="text-3xl font-extrabold text-text-primary tabular-nums">
                  {result.correctAnswers}/{result.totalQuestions}
                </p>
                <p className="text-sm text-text-muted">
                  {lang === "ar" ? "الإجابات الصحيحة" : "Correct Answers"}
                </p>
              </div>
            </div>
            {!result.passed && result.nextAttemptAt && (
              <div className="flex items-center justify-center gap-2 text-sm text-warning mb-6 bg-warning/5 rounded-xl p-3 border border-warning/20">
                <Clock className="w-4 h-4" />
                {lang === "ar"
                  ? `يمكنك المحاولة مرة أخرى بعد ${Math.ceil(
                      (new Date(result.nextAttemptAt).getTime() - Date.now()) /
                        60000
                    )} دقيقة`
                  : `You can retry in ${Math.ceil(
                      (new Date(result.nextAttemptAt).getTime() - Date.now()) /
                        60000
                    )} minutes`}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button onClick={() => router.back()}>
                {lang === "ar" ? "العودة" : "Back"}
              </Button>
              {!result.passed && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setResult(null);
                    setAnswers([]);
                    setCurrentIndex(0);
                    setSelectedOption(null);
                    setError(null);
                    fetchQuestions();
                  }}
                >
                  {lang === "ar" ? "إعادة المحاولة" : "Retry"}
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!examData || !current) return null;

  const labels = isRTL ? ["أ", "ب", "ج", "د", "هـ", "و"] : ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="minimal" />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className={`w-4 h-4 ml-1 ${isRTL ? "" : "rotate-180"}`} />
            {lang === "ar" ? "العودة" : "Back"}
          </Button>
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8 border border-border/50 scale-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Target className="w-4 h-4 text-primary" />
              <span>
                {lang === "ar" ? "سؤال" : "Question"} {currentIndex + 1}{" "}
                {lang === "ar" ? "من" : "of"} {examData.questions.length}
              </span>
            </div>
            <div className="flex gap-1">
              {examData.questions.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentIndex
                      ? "bg-primary"
                      : answers.find((a) => a.questionId === examData.questions[i]._id)
                      ? "bg-teal"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="w-full h-1.5 bg-border rounded-full mb-6 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-500"
              style={{
                width: `${((currentIndex + 1) / examData.questions.length) * 100}%`,
              }}
            />
          </div>

          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10 shrink-0">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-text-primary leading-relaxed">
              <MarkdownRenderer content={current.question} />
            </h3>
          </div>

          <div className="space-y-3 mb-8">
            {current.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedOption(i)}
                className={`w-full text-right flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedOption === i
                    ? "bg-primary/10 border-primary text-text-primary shadow-lg shadow-primary/10"
                    : "bg-surface border-border text-text-secondary hover:bg-surface-hover hover:border-primary/30"
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                    selectedOption === i
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-surface-hover text-text-muted"
                  }`}
                >
                  {labels[i] || i + 1}
                </span>
                <span className="text-sm">
                  <MarkdownRenderer content={opt} className="inline" />
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => {
                if (currentIndex > 0) {
                  setCurrentIndex((i) => i - 1);
                  setSelectedOption(null);
                }
              }}
              className="flex items-center gap-1"
            >
              <ChevronLeft
                className={`w-4 h-4 ${isRTL ? "" : "rotate-180"}`}
              />
              {lang === "ar" ? "السابق" : "Previous"}
            </Button>
            <Button
              onClick={answerQuestion}
              disabled={selectedOption === null || submitting}
              isLoading={submitting && currentIndex === examData.questions.length - 1}
              className="hover:scale-105 transition-all duration-300"
            >
              {currentIndex < examData.questions.length - 1
                ? lang === "ar"
                  ? "التالي"
                  : "Next"
                : lang === "ar"
                ? "إنهاء الاختبار"
                : "Finish Exam"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}