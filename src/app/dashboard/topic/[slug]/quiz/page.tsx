"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  HelpCircle,
  Award,
  ArrowLeft,
  Sparkles,
  Clock,
} from "lucide-react";

interface QuizQuestion {
  _id: string;
  question: string;
  options: string[];
}

interface Answer {
  questionId: string;
  selected: number;
}

interface ResultAnswer {
  questionId: string;
  selected: number;
  correct: number;
  isCorrect: boolean;
  explanation: string;
  question: string;
  options: string[];
}

interface QuizResult {
  attemptId: string;
  score: number;
  total: number;
  percentage: number;
  answers: ResultAnswer[];
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const { t, lang, isRTL } = useLanguage();
  const slug = params.slug as string;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [topicTitle, setTopicTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) {
        router.push("/auth/login");
        return;
      }
    })();
  }, [router]);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch<QuizQuestion[]>(`/api/questions/${slug}`);
        if (!res.success || !res.data) {
          setError(res.error || t("quiz.loading_error"));
        } else if (res.data.length === 0) {
          setError(t("quiz.loading_error"));
        } else {
          setQuestions(res.data);
          setTopicTitle((res as { meta?: { topic?: string } }).meta?.topic ?? "");
        }
      } catch {
        setError(t("quiz.loading_error"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, t]);

  function answerQuestion() {
    if (selectedOption === null) return;

    const newAnswers = [
      ...answers,
      { questionId: questions[currentIndex]._id, selected: selectedOption },
    ];
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
    } else {
      submitQuiz(newAnswers);
    }
  }

  async function submitQuiz(finalAnswers: Answer[]) {
    setSubmitting(true);
    try {
      const res = await apiFetch<QuizResult>(`/api/questions/${slug}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: finalAnswers }),
      });
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || t("common.error"));
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setResult(null);
    setError(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="full" showBack />
        <main className="max-w-2xl mx-auto px-6 py-8">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  if (error && !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <HelpCircle className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
          <p className="text-text-muted text-lg mb-2">{error}</p>
          <p className="text-text-secondary text-sm mb-6">
            {lang === "ar"
              ? "لا توجد أسئلة منشورة لهذا الدرس"
              : "No published questions for this lesson"}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href={`/dashboard/topic/${slug}`}>
              <Button variant="secondary">{t("quiz.back_to_topic")}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const passed = result.percentage >= 70;
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="full" />

        <main className="max-w-2xl mx-auto px-6 py-8">
          <div className="text-center mb-8 slide-up">
            <div
              className={`w-20 h-20 mx-auto mb-4 rounded-full ${
                passed ? "bg-teal/10" : "bg-danger/10"
              } flex items-center justify-center`}
            >
              {passed ? (
                <Award className="w-10 h-10 text-teal" />
              ) : (
                <XCircle className="w-10 h-10 text-danger" />
              )}
            </div>
            <h1 className="text-3xl font-extrabold text-text-primary mb-1">
              {lang === "ar" ? "النتيجة" : "Results"}
            </h1>
            <p className="text-text-secondary mb-1">{topicTitle}</p>
            <div
              className={`text-5xl font-bold ${
                passed ? "text-teal" : "text-danger"
              } my-4 tabular-nums`}
            >
              {result.percentage}%
            </div>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-teal tabular-nums">
                  {result.score}
                </p>
                <p className="text-xs text-text-muted">
                  {lang === "ar" ? "صحيح" : "Correct"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-danger tabular-nums">
                  {result.total - result.score}
                </p>
                <p className="text-xs text-text-muted">
                  {lang === "ar" ? "خاطئ" : "Wrong"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-text-primary tabular-nums">
                  {result.total}
                </p>
                <p className="text-xs text-text-muted">
                  {lang === "ar" ? "الإجمالي" : "Total"}
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-center mt-6">
              <Button onClick={restart} className="hover:scale-105 transition-all">
                {lang === "ar" ? "إعادة المحاولة" : "Retry"}
              </Button>
              <Link href={`/dashboard/topic/${slug}`}>
                <Button variant="secondary">{t("quiz.back_to_topic")}</Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {result.answers.map((a, i) => (
              <div
                key={a.questionId}
                className={`rounded-2xl border-2 p-5 transition-all slide-up ${
                  a.isCorrect
                    ? "border-teal/30 bg-teal/5"
                    : "border-danger/30 bg-danger/5"
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start gap-3 mb-3">
                  {a.isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-teal shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-text-primary mb-1">
                      {lang === "ar" ? "سؤال" : "Question"} {i + 1}:
                    </p>
                    <MarkdownRenderer content={a.question} className="mb-2" />
                    <div className="space-y-1 text-sm">
                      {a.options.map((opt, j) => (
                        <div
                          key={j}
                          className={`px-3 py-1.5 rounded-lg ${
                            j === a.correct
                              ? "bg-teal/10 text-teal font-medium border border-teal/20"
                              : j === a.selected && !a.isCorrect
                              ? "bg-danger/10 text-danger border border-danger/20"
                              : "text-text-muted"
                          }`}
                        >
                          {String.fromCharCode(65 + j)}.{" "}
                          <MarkdownRenderer content={opt} className="inline" />
                          {j === a.correct && " ✓"}
                          {j === a.selected && a.isCorrect && " ✓"}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {a.explanation && (
                  <div className="mr-8 mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-medium text-text-muted mb-1">
                      {lang === "ar" ? "شرح" : "Explanation"}:
                    </p>
                    <MarkdownRenderer content={a.explanation} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const question = questions[currentIndex];
  const progress = (currentIndex / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="full" showBack />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex justify-between text-sm text-text-muted mb-2">
            <span>{topicTitle}</span>
            <span className="tabular-nums">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
          <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 mb-6 animate-slide-in-right">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10 shrink-0">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-text-primary leading-relaxed">
              <MarkdownRenderer content={question.question} />
            </h2>
          </div>

          <div className="space-y-3">
            {question.options.map((opt, i) => {
              const isSelected = selectedOption === i;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedOption(i)}
                  className={`w-full text-right px-4 py-3.5 rounded-xl border-2 transition-all duration-300 flex items-center gap-3 group ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all duration-300 ${
                      isSelected
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "bg-surface-hover text-text-muted group-hover:bg-primary/10"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-text-primary font-medium">
                    <MarkdownRenderer content={opt} className="inline" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="secondary" onClick={() => router.back()}>
            {t("quiz.cancel")}
          </Button>
          <Button
            onClick={answerQuestion}
            disabled={selectedOption === null}
            isLoading={submitting}
            className="hover:scale-105 transition-all duration-300"
          >
            {currentIndex < questions.length - 1
              ? `${lang === "ar" ? "التالي" : "Next"} →`
              : lang === "ar"
              ? "إنهاء"
              : "Finish"}
          </Button>
        </div>
      </main>
    </div>
  );
}