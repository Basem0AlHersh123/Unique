"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getAuthOrRefresh } from "@/lib/auth-client";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Lightbulb,
  Sparkles,
  ClipboardCheck,
  Bot,
  Play,
  Star,
  GraduationCap,
} from "lucide-react";

interface Topic {
  _id: string;
  title: string;
  slug: string;
  subjectId: string;
  videoUrl: string;
  aiExplanation?: string;
  keyPoints: string[];
  vocabulary: { word: string; definition: string }[];
  order: number;
  isFree: boolean;
  isPublished: boolean;
  difficulty: "beginner" | "intermediate" | "advanced";
}

const difficultyLabels: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

const difficultyLabelsEn: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, lang, isRTL } = useLanguage();
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

  function getYouTubeEmbedUrl(url: string): string | null {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
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

  const embedUrl = topic.videoUrl ? getYouTubeEmbedUrl(topic.videoUrl) : null;
  const diffLabel = lang === "ar" ? difficultyLabels[topic.difficulty] : difficultyLabelsEn[topic.difficulty];
  const diffColor =
    topic.difficulty === "beginner"
      ? "success"
      : topic.difficulty === "intermediate"
      ? "warning"
      : "danger";

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="minimal" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className={`w-4 h-4 ml-1 ${isRTL ? "" : "rotate-180"}`} />
            {t("topic.back")}
          </Button>
        </div>

        {/* Header - Enhanced */}
        <div className="mb-8 slide-up">
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2 flex-wrap">
            <Badge variant={diffColor}>{diffLabel}</Badge>
            {topic.isFree && (
              <Badge variant="success">
                {lang === "ar" ? "مجاني" : "Free"}
              </Badge>
            )}
            <Badge variant="info">
              {lang === "ar" ? `الدرس #${topic.order}` : `Lesson #${topic.order}`}
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary">
            {topic.title}
          </h1>
        </div>

        {/* Quiz CTA - Enhanced */}
        <Link href={`/dashboard/topic/${slug}/quiz`}>
          <Button
            size="lg"
            className="w-full sm:w-auto mb-8 flex items-center gap-2 hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/20"
          >
            <ClipboardCheck className="w-5 h-5" />
            {lang === "ar" ? "ابدأ الاختبار" : "Start Quiz"}
          </Button>
        </Link>

        {/* Video - Enhanced */}
        {embedUrl && (
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border mb-8 bg-surface hover:shadow-3xl transition-all duration-300 slide-up">
            <div className="relative aspect-video">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full border border-white/10">
                <Play className="w-3 h-3 inline ml-1" />
                {lang === "ar" ? "شاهد الفيديو" : "Watch video"}
              </div>
            </div>
          </div>
        )}

        {/* AI Explanation - Enhanced */}
        {topic.aiExplanation && (
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/10 p-6 mb-8 slide-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-text-primary">
                {lang === "ar" ? "شرح تفاعلي" : "Interactive Explanation"}
              </h2>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MarkdownRenderer content={topic.aiExplanation} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Key Points - Enhanced */}
          {topic.keyPoints.length > 0 && (
            <div className="bg-surface rounded-2xl border border-border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 slide-up">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-warning/10">
                  <Lightbulb className="w-5 h-5 text-warning" />
                </div>
                <h2 className="text-lg font-bold text-text-primary">
                  {lang === "ar" ? "النقاط الرئيسية" : "Key Points"}
                </h2>
              </div>
              <ul className="space-y-3">
                {topic.keyPoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 slide-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <CheckCircle className="w-5 h-5 text-teal mt-0.5 shrink-0" />
                    <span className="text-text-secondary">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vocabulary - Enhanced */}
          {topic.vocabulary.length > 0 && (
            <div className="bg-surface rounded-2xl border border-border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-text-primary">
                  {lang === "ar" ? "المفردات" : "Vocabulary"}
                </h2>
              </div>
              <div className="space-y-4">
                {topic.vocabulary.map((v, i) => (
                  <div
                    key={i}
                    className="pb-3 border-b border-border last:border-0 last:pb-0 slide-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <p className="font-bold text-text-primary flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary">
                        {i + 1}
                      </span>
                      {v.word}
                    </p>
                    <p className="text-sm text-text-secondary mt-0.5 mr-8">
                      {v.definition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ask AI Section - Enhanced */}
        <div className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/10 p-6 slide-up">
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
            <div className="mt-4 space-y-4 animate-slide-in-right">
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
                    <div
                      className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
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
                <div className="bg-surface rounded-xl border border-border p-4 scale-in">
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
                  onClick={() => {
                    setAiAnswer(null);
                    setAiQuestion("");
                    setAiError(null);
                  }}
                  className="text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  {lang === "ar" ? "مسح" : "Clear"}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}