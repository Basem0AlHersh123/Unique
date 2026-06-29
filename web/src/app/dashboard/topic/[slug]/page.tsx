"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { getAuthOrRefresh } from "@/lib/auth-client";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import {
  ArrowLeft, BookOpen, CheckCircle, Lightbulb, Sparkles, ClipboardCheck, Bot,
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

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
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
      if (!u) { router.push("/auth/login"); return; }
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
        setAiError(res.error || t('lesson.ask_ai_error'));
      }
    } catch {
      setAiError(t('lesson.ask_ai_error'));
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
              {t('topic.back')}
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
          <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted text-lg mb-4">{error || "لم يتم العثور على الدرس"}</p>
          <Button variant="secondary" onClick={() => router.back()}>
            {t('topic.back')}
          </Button>
        </div>
      </div>
    );
  }

  const embedUrl = topic.videoUrl ? getYouTubeEmbedUrl(topic.videoUrl) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="minimal" />

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 ml-1" />
            {t('topic.back')}
          </Button>
        </div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
            <Badge variant={topic.difficulty === "beginner" ? "success" : topic.difficulty === "intermediate" ? "warning" : "danger"}>
              {difficultyLabels[topic.difficulty]}
            </Badge>
            {topic.isFree && <Badge variant="success">{t('topic.free')}</Badge>}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary">
            {topic.title}
          </h1>
        </div>

        {/* Quiz CTA */}
        <Link href={`/dashboard/topic/${slug}/quiz`}>
          <Button size="lg" className="w-full sm:w-auto mb-8 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            {t('dashboard.start_quiz')}
          </Button>
        </Link>

        {/* Video */}
        {embedUrl && (
          <div className="rounded-2xl overflow-hidden shadow-xl border border-border mb-8 bg-surface">
            <div className="relative aspect-video">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* AI Explanation */}
        {topic.aiExplanation && (
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/10 p-6 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-text-primary">{t('topic.explanation')}</h2>
            </div>
            <MarkdownRenderer content={topic.aiExplanation ?? ""} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Key Points */}
          {topic.keyPoints.length > 0 && (
            <div className="bg-surface rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-warning" />
                <h2 className="text-lg font-bold text-text-primary">{t('topic.key_points')}</h2>
              </div>
              <ul className="space-y-3">
                {topic.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-teal mt-0.5 shrink-0" />
                    <span className="text-text-secondary">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vocabulary */}
          {topic.vocabulary.length > 0 && (
            <div className="bg-surface rounded-2xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-text-primary">{t('topic.vocabulary')}</h2>
              </div>
              <div className="space-y-4">
                {topic.vocabulary.map((v, i) => (
                  <div key={i} className="pb-3 border-b border-border last:border-0 last:pb-0">
                    <p className="font-bold text-text-primary">{v.word}</p>
                    <p className="text-sm text-text-secondary mt-0.5">{v.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ask AI Section */}
        <div className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-primary/10 p-6">
          <button
            onClick={() => setAiOpen(!aiOpen)}
            className="flex items-center gap-2 w-full text-right"
          >
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-text-primary flex-1">{t('lesson.ask_ai')}</h2>
            <span className={`text-text-muted transition-transform ${aiOpen ? "rotate-180" : ""}`}>
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
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAskAi(); } }}
                  placeholder={t('lesson.ask_ai_placeholder')}
                  className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                <button
                  onClick={handleAskAi}
                  disabled={!aiQuestion.trim() || aiLoading}
                  className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-dark transition-all shrink-0"
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
                  <span>{t('lesson.asking')}</span>
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
                    <span className="text-xs font-semibold text-primary">{t('ai_chat.ai')}</span>
                  </div>
                  <MarkdownRenderer content={aiAnswer ?? ""} />
                </div>
              )}

              {aiAnswer && (
                <button
                  onClick={() => { setAiAnswer(null); setAiQuestion(""); setAiError(null); }}
                  className="text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  {t('common.clear') || "مسح"}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
