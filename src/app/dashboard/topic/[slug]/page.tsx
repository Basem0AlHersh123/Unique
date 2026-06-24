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
import {
  ArrowLeft, BookOpen, CheckCircle, Lightbulb, Sparkles, ClipboardCheck,
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
            <p className="text-text-secondary leading-relaxed whitespace-pre-line">
              {topic.aiExplanation}
            </p>
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
      </main>
    </div>
  );
}
