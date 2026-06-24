"use client";

import { Suspense, useEffect, useState, useCallback, type ComponentType } from "react";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/translations";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronDown, ChevronUp, Edit2, Save, X, Plus, Trash2,
  BookOpen, HelpCircle, MessageCircle, BarChart3, Play, Video,
  ExternalLink, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

interface Topic {
  _id: string;
  title: string;
  slug: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  isPublished: boolean;
  isFree: boolean;
  videoUrl: string;
  videoType: "youtube" | "direct";
  order: number;
  keyPoints: string[];
  vocabulary: { word: string; definition: string }[];
  aiExplanation: string;
  attemptsCount?: number;
}

interface Subject {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  college?: string;
  topics: Topic[];
}

interface Question {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  topicId: string;
  subjectId: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  order: number;
  isPublished: boolean;
}

interface GroupData {
  _id: string;
  name: string;
  type: string;
  members: { _id?: string; name?: string; email?: string }[];
  subjectId?: { _id: string; name: string } | string;
}

interface TeacherStats {
  totalSubjects: number;
  totalTopics: number;
  totalQuestions: number;
  totalAttempts: number;
}

const tabs: { id: string; labelKey: TranslationKey; icon: ComponentType<{ className?: string }> }[] = [
  { id: "stats", labelKey: "teacher.stats", icon: BarChart3 },
  { id: "subjects", labelKey: "teacher.subjects", icon: BookOpen },
  { id: "questions", labelKey: "teacher.questions", icon: HelpCircle },
  { id: "groups", labelKey: "teacher.groups", icon: MessageCircle },
];

const diffStyle: Record<string, string> = {
  beginner: "bg-teal/10 text-teal border-teal/20",
  intermediate: "bg-warning/10 text-warning border-warning/20",
  advanced: "bg-danger/10 text-danger border-danger/20",
};

const diffLabel: Record<string, string> = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
};

const diffLabelEn: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const qDiffStyle: Record<string, string> = {
  easy: "bg-teal/10 text-teal border-teal/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  hard: "bg-danger/10 text-danger border-danger/20",
};

const qDiffLabel: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

const qDiffLabelEn: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const typeKey: Record<string, TranslationKey> = {
  announcement: "chat.type_announcement",
  subject: "chat.type_subject",
  general: "chat.type_general",
};

function TeacherDashboardInner() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const tabFromUrl = searchParams.get("tab") || "stats";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    const tab = searchParams.get("tab") || "stats";
    setActiveTab(tab); // eslint-disable-line react-hooks/set-state-in-effect
  }, [searchParams]);

  function switchTab(tabId: string) {
    setActiveTab(tabId);
    if (tabId === "stats") {
      router.push("/teacher/dashboard");
    } else {
      router.push(`/teacher/dashboard?tab=${tabId}`);
    }
  }

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    videoUrl: "",
    videoType: "youtube" as "youtube" | "direct",
    difficulty: "beginner" as "beginner" | "intermediate" | "advanced",
  });
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<TeacherStats | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedSubjectForQ, setSelectedSubjectForQ] = useState("");
  const [selectedTopicForQ, setSelectedTopicForQ] = useState("");

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [qForm, setQForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
  });
  const [savingQ, setSavingQ] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const loadSubjects = useCallback(async () => {
    try {
      const res = await apiFetch<Subject[]>("/api/teacher/subjects");
      setSubjects(res.data ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (activeTab === "stats") {
      apiFetch<TeacherStats>("/api/teacher/stats").then((res) => {
        if (res.success && res.data) setStats(res.data);
      });
    }
    if (activeTab === "questions") {
      setQuestionsLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
      const params = new URLSearchParams();
      if (selectedTopicForQ) params.set("topicId", selectedTopicForQ);
      apiFetch<Question[]>(`/api/teacher/questions?${params}`).then((res) => {
        if (res.success && res.data) setQuestions(res.data);
        setQuestionsLoading(false);
      });
    }
    if (activeTab === "groups") {
      setGroupsLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
      apiFetch<GroupData[]>("/api/groups").then((res) => {
        if (res.success && res.data) {
          setGroups(res.data);
        }
        setGroupsLoading(false);
      });
    }
  }, [activeTab, selectedTopicForQ, subjects, selectedSubjectForQ]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
    setEditingTopicId(null);
  }

  function startEdit(topic: Topic) {
    setEditingTopicId(topic._id);
    setEditForm({
      title: topic.title,
      videoUrl: topic.videoUrl,
      videoType: topic.videoType || "youtube",
      difficulty: topic.difficulty || "beginner",
    });
  }

  function cancelEdit() {
    setEditingTopicId(null);
  }

  async function saveEdit(topicId: string) {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/teacher/topics/${topicId}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      if (res.success) {
        setEditingTopicId(null);
        showToast(t("teacher.saved"), "success");
        loadSubjects();
      } else {
          showToast(res.error || t("teacher.save_failed"), "error");
      }
    } catch (err) {
      showToast((err as Error).message || t("teacher.error"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(topicId: string, current: boolean) {
    try {
      const res = await apiFetch(`/api/teacher/topics/${topicId}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !current }),
      });
      if (res.success) {
        showToast(current ? t("teacher.draft_status") : t("teacher.published_status"), "success");
        loadSubjects();
      }
    } catch (err) {
      showToast((err as Error).message || t("teacher.error"), "error");
    }
  }

  async function loadQuestions() {
    setQuestionsLoading(true);
    const params = new URLSearchParams();
    if (selectedTopicForQ) params.set("topicId", selectedTopicForQ);
    try {
      const res = await apiFetch<Question[]>(`/api/teacher/questions?${params}`);
      if (res.success && res.data) setQuestions(res.data);
    } catch (err) {
      showToast((err as Error).message || t("teacher.error"), "error");
    } finally {
      setQuestionsLoading(false);
    }
  }

  function openAddQuestion() {
    setEditingQuestion(null);
    setQForm({
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      difficulty: "medium",
    });
    setShowQuestionForm(true);
  }

  function openEditQuestion(q: Question) {
    setEditingQuestion(q._id);
    setQForm({
      question: q.question,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
      difficulty: q.difficulty || "medium",
    });
    setShowQuestionForm(true);
  }

  async function saveQuestion() {
    if (!qForm.question.trim() || qForm.options.some((o) => !o.trim())) return;
    if (!selectedTopicForQ) {
      showToast(t("teacher.please_select_topic"), "error");
      return;
    }
    setSavingQ(true);
    try {
      const subjId = subjects.find((s) =>
        s.topics.some((t) => t._id === selectedTopicForQ)
      )?._id;
      if (!subjId) {
        showToast(t("teacher.subject_not_found"), "error");
        return;
      }
      const payload = {
        ...qForm,
        topicId: selectedTopicForQ,
        subjectId: subjId,
        options: qForm.options.filter((o) => o.trim()),
      };
      if (editingQuestion) {
        const res = await apiFetch(`/api/teacher/questions/${editingQuestion}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (res.success) {
          showToast(t("teacher.question_saved"), "success");
          setShowQuestionForm(false);
          loadQuestions();
        } else {
          showToast(res.error || t("teacher.save_failed"), "error");
        }
      } else {
        const res = await apiFetch("/api/teacher/questions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.success) {
          showToast(t("teacher.question_added"), "success");
          setShowQuestionForm(false);
          loadQuestions();
        } else {
          showToast(res.error || t("teacher.save_failed"), "error");
        }
      }
    } catch (err) {
      showToast((err as Error).message || t("teacher.error"), "error");
    } finally {
      setSavingQ(false);
    }
  }

  async function confirmDeleteQuestion() {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch(`/api/teacher/questions/${deleteTarget}`, {
        method: "DELETE",
      });
      if (res.success) {
        showToast(t("teacher.question_deleted"), "success");
        setDeleteTarget(null);
        loadQuestions();
      } else {
        showToast(res.error || t("teacher.delete_failed"), "error");
        setDeleteTarget(null);
      }
    } catch (err) {
      showToast((err as Error).message || t("teacher.error"), "error");
      setDeleteTarget(null);
    }
  }

  const topTopics = subjects.flatMap((s) => s.topics);

  const statCards = stats
    ? [
        {
          label: t("teacher.total_subjects"),
          value: stats.totalSubjects,
          icon: BookOpen,
          color: "bg-primary",
        },
        {
          label: t("teacher.total_topics"),
          value: stats.totalTopics,
          icon: Play,
          color: "bg-teal",
        },
        {
          label: t("teacher.total_questions"),
          value: stats.totalQuestions,
          icon: HelpCircle,
          color: "bg-warning",
        },
        {
          label: t("teacher.total_attempts"),
          value: stats.totalAttempts,
          icon: BarChart3,
          color: "bg-info",
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-secondary">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
          {t("teacher.title")}
        </h1>
        <p className="text-text-secondary mt-1">{t("teacher.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-surface text-text-secondary border border-border hover:bg-surface-hover"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Stats Tab */}
      {activeTab === "stats" && (
        <div>
          {!stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 shimmer rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="bg-surface rounded-xl border border-border p-5 flex items-center gap-4"
                  >
                    <div
                      className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center text-white shrink-0`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">
                        {card.value}
                      </p>
                      <p className="text-text-secondary text-sm">{card.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {topTopics.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-text-primary mb-4">
                {lang === "ar" ? "أحدث الدروس" : "Latest Lessons"}
              </h2>
              <div className="grid gap-3">
                {topTopics.slice(0, 5).map((topic) => {
                  const subj = subjects.find((s) =>
                    s.topics.some((t) => t._id === topic._id)
                  );
                  return (
                    <div
                      key={topic._id}
                      className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary text-sm truncate">
                          {topic.title}
                        </p>
                        <p className="text-xs text-text-muted">
                          {subj
                            ? lang === "ar"
                              ? subj.nameAr || subj.name
                              : subj.nameEn || subj.name
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 mr-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            diffStyle[topic.difficulty] ||
                            diffStyle.beginner
                          }`}
                        >
                          {lang === "ar"
                            ? diffLabel[topic.difficulty] ||
                              diffLabel.beginner
                            : diffLabelEn[topic.difficulty] ||
                              diffLabelEn.beginner}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            topic.isPublished
                              ? "bg-teal/10 text-teal"
                              : "bg-text-muted/10 text-text-muted"
                          }`}
                        >
                          {topic.isPublished
                            ? t("teacher.published")
                            : t("teacher.draft")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === "subjects" && (
        <div>
          {subjects.length === 0 ? (
            <Card withGlass className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
              <p className="text-text-secondary">{t("teacher.no_subjects")}</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {subjects.map((subject) => {
                const subjName =
                  lang === "ar"
                    ? subject.nameAr || subject.name
                    : subject.nameEn || subject.name;
                return (
                  <div
                    key={subject._id}
                    className="bg-surface rounded-2xl border border-border overflow-hidden"
                  >
                    <button
                      onClick={() => toggleExpand(subject._id)}
                      className="w-full flex items-center justify-between p-4 sm:p-6 hover:bg-surface-hover transition-colors"
                    >
                      <h2 className="text-base sm:text-lg font-semibold text-text-primary">
                        {subjName}
                      </h2>
                      {expandedId === subject._id ? (
                        <ChevronUp className="w-5 h-5 text-text-muted" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-text-muted" />
                      )}
                    </button>

                    {expandedId === subject._id && (
                      <div className="border-t border-border divide-y divide-border">
                        {subject.topics.map((topic) => (
                          <div key={topic._id} className="p-4 sm:p-6">
                            {editingTopicId === topic._id ? (
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-medium text-text-primary">
                                      {topic.title}
                                    </h3>
                                    <p className="text-sm text-text-muted mt-1">
                                      {t("teacher.edit_topic")}
                                    </p>
                                  </div>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                                    <label className="text-sm font-medium text-text-secondary">
                                      {t("teacher.topic_title")}
                                    </label>
                                    <input
                                      type="text"
                                      value={editForm.title}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          title: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border text-text-primary outline-none focus:border-primary transition-all text-sm"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-text-secondary">
                                      {t("teacher.video_url")}
                                    </label>
                                    <input
                                      type="text"
                                      value={editForm.videoUrl}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          videoUrl: e.target.value,
                                        })
                                      }
                                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border text-text-primary outline-none focus:border-primary transition-all text-sm"
                                      placeholder="https://..."
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-text-secondary">
                                      {t("teacher.video_type")}
                                    </label>
                                    <select
                                      value={editForm.videoType}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          videoType: e.target.value as
                                            | "youtube"
                                            | "direct",
                                        })
                                      }
                                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border text-text-primary outline-none focus:border-primary transition-all text-sm"
                                    >
                                      <option value="youtube">YouTube</option>
                                      <option value="direct">
                                        {lang === "ar"
                                          ? "رابط مباشر"
                                          : "Direct Link"}
                                      </option>
                                    </select>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-medium text-text-secondary">
                                      {t("teacher.difficulty")}
                                    </label>
                                    <select
                                      value={editForm.difficulty}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          difficulty: e.target.value as
                                            | "beginner"
                                            | "intermediate"
                                            | "advanced",
                                        })
                                      }
                                      className="w-full px-4 py-3 rounded-xl bg-background border-2 border-border text-text-primary outline-none focus:border-primary transition-all text-sm"
                                    >
                                      <option value="beginner">
                                        {lang === "ar" ? "مبتدئ" : "Beginner"}
                                      </option>
                                      <option value="intermediate">
                                        {lang === "ar" ? "متوسط" : "Intermediate"}
                                      </option>
                                      <option value="advanced">
                                        {lang === "ar" ? "متقدم" : "Advanced"}
                                      </option>
                                    </select>
                                  </div>
                                </div>

                                <div className="flex gap-3">
                                  <button
                                    onClick={() => saveEdit(topic._id)}
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
                                  >
                                    <Save className="w-4 h-4" />
                                    {saving
                                      ? t("teacher.saving")
                                      : t("common.save")}
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="px-6 py-2.5 rounded-xl bg-surface text-text-secondary font-medium border border-border hover:bg-surface-hover transition-colors text-sm"
                                  >
                                    {t("common.cancel")}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                      <h3 className="font-medium text-text-primary text-sm sm:text-base">
                                        {topic.title}
                                      </h3>
                                      <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                          diffStyle[topic.difficulty] ||
                                          diffStyle.beginner
                                        }`}
                                      >
                                        {lang === "ar"
                                          ? diffLabel[topic.difficulty] ||
                                            diffLabel.beginner
                                          : diffLabelEn[topic.difficulty] ||
                                            diffLabelEn.beginner}
                                      </span>
                                      <button
                                        onClick={() =>
                                          togglePublish(
                                            topic._id,
                                            topic.isPublished
                                          )
                                        }
                                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                                          topic.isPublished
                                            ? "bg-teal/10 text-teal border-teal/20 hover:bg-teal/20"
                                            : "bg-text-muted/10 text-text-muted border-border hover:bg-surface-hover"
                                        }`}
                                      >
                                        {topic.isPublished
                                          ? t("teacher.published")
                                          : t("teacher.draft")}
                                      </button>
                                    </div>

                                    <div className="mt-2 sm:mt-3 space-y-1 text-xs sm:text-sm text-text-secondary">
                                      <p>
                                        <span className="font-medium text-text-primary">
                                          <Video className="w-3 h-3 inline ml-1" />
                                        </span>
                                        {topic.videoUrl
                                          ? topic.videoUrl.length > 50
                                            ? topic.videoUrl.substring(0, 50) +
                                              "..."
                                            : topic.videoUrl
                                          : lang === "ar"
                                            ? "غير محدد"
                                            : "Not set"}
                                      </p>
                                      {topic.keyPoints?.length > 0 && (
                                        <p>
                                          <Sparkles className="w-3 h-3 inline ml-1 text-secondary" />
                                          {topic.keyPoints.length}{" "}
                                          {lang === "ar"
                                            ? "نقطة رئيسية"
                                            : "key points"}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex gap-1 shrink-0 mr-2">
                                    <button
                                      onClick={() => startEdit(topic)}
                                      className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all"
                                      title={t("common.edit")}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              value={selectedSubjectForQ}
              onChange={(e) => {
                setSelectedSubjectForQ(e.target.value);
                setSelectedTopicForQ("");
              }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface border-2 border-border text-text-primary text-sm outline-none focus:border-primary transition-all"
            >
              <option value="">
                {t("teacher.all_subjects")}
              </option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {lang === "ar" ? s.nameAr || s.name : s.nameEn || s.name}
                </option>
              ))}
            </select>
            <select
              value={selectedTopicForQ}
              onChange={(e) => setSelectedTopicForQ(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface border-2 border-border text-text-primary text-sm outline-none focus:border-primary transition-all"
            >
              <option value="">
                {t("teacher.all_topics")}
              </option>
              {subjects
                .filter((s) => !selectedSubjectForQ || s._id === selectedSubjectForQ)
                .flatMap((s) => s.topics)
                .map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.title}
                  </option>
                ))}
            </select>
            <Button onClick={openAddQuestion} disabled={!selectedTopicForQ}>
              <Plus className="w-4 h-4 ml-1" />
              {t("teacher.add_question")}
            </Button>
          </div>

          {questionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 shimmer rounded-xl" />
              ))}
            </div>
          ) : questions.length === 0 ? (
            <Card withGlass className="p-12 text-center">
              <HelpCircle className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
              <p className="text-text-secondary">
                {t("teacher.no_questions")}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q._id}
                  className="bg-surface rounded-xl border border-border p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs text-text-muted shrink-0">
                          #{idx + 1}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            qDiffStyle[q.difficulty] || qDiffStyle.medium
                          }`}
                        >
                          {lang === "ar"
                            ? qDiffLabel[q.difficulty] || qDiffLabel.medium
                            : qDiffLabelEn[q.difficulty] ||
                              qDiffLabelEn.medium}
                        </span>
                      </div>
                      <p className="font-medium text-text-primary text-sm sm:text-base mb-2">
                        {q.question}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {q.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm ${
                              oi === q.correctAnswer
                                ? "bg-teal/10 text-teal border border-teal/20"
                                : "bg-background text-text-secondary border border-border"
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-surface-hover flex items-center justify-center text-[10px] font-bold shrink-0">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {opt}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="mt-2 text-xs text-text-muted bg-background rounded-lg p-2 border border-border">
                          <span className="font-medium text-text-secondary">
                            {lang === "ar" ? "شرح: " : "Explanation: "}
                          </span>
                          {q.explanation}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 mr-2">
                      <button
                        onClick={() => openEditQuestion(q)}
                        className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-all"
                        title={t("common.edit")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(q._id)}
                        className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-all"
                        title={t("common.delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Question Form Dialog */}
          {showQuestionForm && (
            <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-12 sm:pt-20">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setShowQuestionForm(false)}
              />
              <Card withGlass className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto p-4 sm:p-6 space-y-4 mx-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-bold text-text-primary">
                    {editingQuestion
                      ? t("teacher.edit_question")
                      : t("teacher.add_question")}
                  </h3>
                  <button
                    onClick={() => setShowQuestionForm(false)}
                    className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm text-text-secondary">
                    {t("teacher.question_text")}
                  </label>
                  <textarea
                    value={qForm.question}
                    onChange={(e) =>
                      setQForm({ ...qForm, question: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary text-sm outline-none focus:border-primary resize-none"
                    placeholder={
                      lang === "ar" ? "أدخل نص السؤال..." : "Enter question..."
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm text-text-secondary">
                    {t("teacher.options")}
                  </label>
                  {qForm.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-surface-hover flex items-center justify-center text-xs font-bold text-text-secondary shrink-0">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const opts = [...qForm.options];
                          opts[oi] = e.target.value;
                          setQForm({ ...qForm, options: opts });
                        }}
                        className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-text-primary text-sm outline-none focus:border-primary"
                        placeholder={
                          lang === "ar"
                            ? `خيار ${String.fromCharCode(65 + oi)}...`
                            : `Option ${String.fromCharCode(65 + oi)}...`
                        }
                      />
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={qForm.correctAnswer === oi}
                        onChange={() =>
                          setQForm({ ...qForm, correctAnswer: oi })
                        }
                        className="accent-primary"
                      />
                    </div>
                  ))}
                  <p className="text-[10px] text-text-muted">
                    {lang === "ar"
                      ? "اختر الإجابة الصحيحة باستخدام زر الراديو"
                      : "Select the correct answer using the radio button"}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm text-text-secondary">
                    {t("teacher.difficulty")}
                  </label>
                  <select
                    value={qForm.difficulty}
                    onChange={(e) =>
                      setQForm({
                        ...qForm,
                        difficulty: e.target.value as "easy" | "medium" | "hard",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary text-sm outline-none focus:border-primary"
                  >
                    <option value="easy">
                      {lang === "ar" ? "سهل" : "Easy"}
                    </option>
                    <option value="medium">
                      {lang === "ar" ? "متوسط" : "Medium"}
                    </option>
                    <option value="hard">
                      {lang === "ar" ? "صعب" : "Hard"}
                    </option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm text-text-secondary">
                    {t("teacher.explanation")}
                  </label>
                  <textarea
                    value={qForm.explanation}
                    onChange={(e) =>
                      setQForm({ ...qForm, explanation: e.target.value })
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-text-primary text-sm outline-none focus:border-primary resize-none"
                    placeholder={
                      lang === "ar"
                        ? "شرح الإجابة..."
                        : "Explanation..."
                    }
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setShowQuestionForm(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    onClick={saveQuestion}
                    isLoading={savingQ}
                    disabled={
                      !qForm.question.trim() ||
                      qForm.options.some((o) => !o.trim())
                    }
                  >
                    {editingQuestion
                      ? t("common.save")
                      : t("teacher.add_question")}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === "groups" && (
        <div>
          {groupsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 shimmer rounded-xl" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Card withGlass className="p-12 text-center">
              <MessageCircle className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
              <p className="text-text-secondary">{t("teacher.no_groups")}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((g) => {
                return (
                  <div
                    key={g._id}
                    className="bg-surface rounded-xl border border-border p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-text-primary text-sm">
                        {g.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                        {t(typeKey[g.type] || typeKey.general)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>
                        {t("teacher.members")}
                        {g.members?.length || 0}
                      </span>
                    </div>
                    <a
                      href={`/chat?group=${g._id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t("teacher.open_chat")}
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("teacher.delete_question_title")}
        message={t("teacher.delete_question_msg")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function TeacherDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-text-secondary">جاري التحميل...</p>
      </div>
    }>
      <TeacherDashboardInner />
    </Suspense>
  );
}
