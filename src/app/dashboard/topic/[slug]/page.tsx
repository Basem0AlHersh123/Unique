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
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Trophy,
  FileText,
  Zap,
  ClipboardCheck,
  Bot,
} from "lucide-react";

interface Topic {
  _id: string;
  title: string;
  slug: string;
  subjectId: string;
  videoUrl: string;
  aiExplanation?: string;
  summaryText?: string;
  keyPoints: string[];
  vocabulary: { word: string; definition: string }[];
  order: number;
  isFree: boolean;
  isPublished: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
  contentType: string;
}

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const slug = params.slug as string;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

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
        const res = await apiFetch<Topic>(`/api/topics/${slug}`);
        if (!res.success || !res.data) {
          setError(res.error || "لم يتم العثور على الدرس");
        } else {
          setTopic(res.data);
        }
      } catch {
        setError("حدث خطأ في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  async function handleAskAi() {
    const q = aiQuestion.trim();
    if (!q || !topic || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiAnswer(null);
    try {
      const res = await apiFetch<{ answer: string }>("/api/ai/lesson", {
        method: "POST",
        body: JSON.stringify({ lessonId: topic._id, question: q }),
      });
      if (res.success && res.data) {
        setAiAnswer(res.data.answer);
        setAiQuestion("");
      } else {
        setAiError(res.error || t("lesson.ask_ai_error"));
      }
    } catch {
      setAiError(t("lesson.ask_ai_error"));
    } finally {
      setAiLoading(false);
    }
  }

  function extractYoutubeId(url: string): string {
    const match = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? "";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="minimal" />
        <main className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 ml-1" />
              {t("topic.back")}
            </Button>
          </div>
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
          <p className="text-text-muted text-lg mb-4">
            {error || "لم يتم العثور على الدرس"}
          </p>
          <Button variant="secondary" onClick={() => router.back()}>
            {t("topic.back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === "ar" ? "رجوع" : "Back"}
        </button>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/20">
            <CheckCircle className="w-3 h-3" />
            {lang === "ar" ? "شاهدت الفيديو" : "Video watched"}
          </span>
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20">
            <Trophy className="w-3 h-3" />
            {lang === "ar" ? "أجبت الاختبار" : "Quiz passed"}
          </span>
        </div>

        <Link href="/dashboard" className="text-xs text-text-muted hover:text-primary transition-colors">
          {lang === "ar" ? "لوحتي" : "Dashboard"}
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* ── Lesson title & meta ── */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {topic.isFree && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-success/15 text-success font-medium border border-success/20">
                {lang === "ar" ? "مجاني" : "Free"}
              </span>
            )}
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
              topic.difficulty === "beginner"
                ? "bg-primary/10 text-primary border-primary/20"
                : topic.difficulty === "intermediate"
                ? "bg-warning/10 text-warning border-warning/20"
                : "bg-danger/10 text-danger border-danger/20"
            }`}>
              {topic.difficulty === "beginner"    ? (lang === "ar" ? "مبتدئ"   : "Beginner")    :
               topic.difficulty === "intermediate"? (lang === "ar" ? "متوسط"   : "Intermediate") :
                                                    (lang === "ar" ? "متقدم"   : "Advanced")}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-surface border border-border text-text-muted capitalize">
              {topic.contentType}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary leading-snug">
            {topic.title}
          </h1>
        </div>

        {/* ── VIDEO — always first ── */}
        {topic.videoUrl && (
          <div className="rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/40">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${extractYoutubeId(topic.videoUrl)}?rel=0&modestbranding=1`}
                title={topic.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* ── Summary ── */}
        {topic.summaryText && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-primary" />
              {lang === "ar" ? "ملخص الدرس" : "Summary"}
            </h2>
            <div className="text-text-secondary text-sm leading-relaxed prose-sm max-w-none">
              <MarkdownRenderer content={topic.summaryText} />
            </div>
          </div>
        )}

        {/* ── Key Points ── */}
        {topic.keyPoints && topic.keyPoints.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-warning" />
              {lang === "ar" ? "النقاط الرئيسية" : "Key Points"}
            </h2>
            <div className="space-y-3">
              {topic.keyPoints.map((kp: string, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-warning/15 border border-warning/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-warning">{i + 1}</span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{kp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Vocabulary ── */}
        {topic.vocabulary && topic.vocabulary.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-secondary" />
              {lang === "ar" ? "المفردات" : "Vocabulary"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topic.vocabulary.map((v: { word: string; definition: string }, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-background border border-border">
                  <span className="text-sm font-bold text-primary shrink-0">{v.word}</span>
                  <span className="text-sm text-text-muted">— {v.definition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI Explanation ── */}
        {topic.aiExplanation && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2 mb-4">
              <span className="text-lg">✨</span>
              {lang === "ar" ? "شرح الذكاء الاصطناعي" : "AI Explanation"}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">{topic.aiExplanation}</p>
          </div>
        )}

        {/* ── Quiz section — always last ── */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              {lang === "ar" ? "اختبار الدرس" : "Lesson Quiz"}
            </h2>
          </div>
          <div className="p-6">
            <div className="text-center py-4">
              <p className="text-text-secondary text-sm mb-4">
                {lang === "ar"
                  ? "شاهد الفيديو واقرأ الدرس جيداً قبل بدء الاختبار"
                  : "Watch the video and study the lesson before starting the quiz"}
              </p>
              <Link href={`/dashboard/topic/${slug}/quiz`}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#19D3C5] via-[#39C4FF] to-[#6A63FF] text-white font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:brightness-110 transition-all">
                <ClipboardCheck className="w-4 h-4" />
                {lang === "ar" ? "ابدأ الاختبار" : "Start Quiz"}
              </Link>
            </div>
          </div>
        </div>

        {/* ── Ask AI Assistant ── */}
        <div className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/10 p-6">
          <button
            onClick={() => setAiOpen(!aiOpen)}
            className="flex items-center gap-2 w-full text-right"
          >
            <div className="p-2 rounded-xl bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-text-primary flex-1">
              {lang === "ar" ? "اسأل المساعد الذكي" : "Ask AI Assistant"}
            </h2>
            <span
              className={`text-text-muted transition-transform duration-300 ${
                aiOpen ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {aiOpen && (
            <div className="mt-4 space-y-4">
              <div className="flex items-end gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAskAi();
                    }
                  }}
                  placeholder={lang === "ar" ? "اسأل عن هذا الدرس..." : "Ask about this lesson..."}
                  className="flex-1 bg-surface border-2 border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                <button
                  onClick={handleAskAi}
                  disabled={!aiQuestion.trim() || aiLoading}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/20 transition-all shrink-0 hover:scale-105 active:scale-95"
                >
                  <Bot className="w-5 h-5" />
                </button>
              </div>

              {aiLoading && (
                <div className="flex items-center gap-2 text-text-muted text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>{lang === "ar" ? "جاري التفكير..." : "Thinking..."}</span>
                </div>
              )}

              {aiError && (
                <div className="text-sm text-danger bg-danger/5 rounded-xl p-3 border border-danger/20">
                  {aiError}
                </div>
              )}

              {aiAnswer && (
                <div className="bg-surface rounded-xl border border-border p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-primary">
                      {lang === "ar" ? "المساعد" : "AI Assistant"}
                    </span>
                  </div>
                  <MarkdownRenderer content={aiAnswer} />
                </div>
              )}

              {aiAnswer && (
                <button
                  onClick={() => { setAiAnswer(null); setAiQuestion(""); setAiError(null); }}
                  className="text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  {lang === "ar" ? "مسح" : "Clear"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}