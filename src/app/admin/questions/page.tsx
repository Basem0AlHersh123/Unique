"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import JsonImport from "@/components/ui/JsonImport";
import BulkImportModal from "@/components/ui/BulkImportModal";
import {
  Plus, Edit2, Trash2, HelpCircle, Filter, Eye, EyeOff, PlusCircle, MinusCircle, FileText, FileQuestion,
  Loader2, Upload, X,
} from "lucide-react";

interface Subject {
  _id: string;
  name: string;
  collegeId: string;
}

interface Topic {
  _id: string;
  title: string;
  subjectId: string;
  isEssential?: boolean;
}

interface Unit {
  _id: string;
  title: string;
  subjectId: string;
}

interface Question {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  topicId?: string;
  unitId?: string;
  subjectId: string;
  difficulty: string;
  explanation: string;
  order: number;
  isPublished: boolean;
}

interface FormData {
  question: string;
  options: string[];
  correctAnswer: number;
  topicId: string;
  unitId: string;
  subjectId: string;
  difficulty: string;
  explanation: string;
  order: number;
}

const emptyForm: FormData = {
  question: "",
  options: ["", "", "", ""],
  correctAnswer: 0,
  topicId: "",
  unitId: "",
  subjectId: "",
  difficulty: "medium",
  explanation: "",
  order: 0,
};

export default function QuestionsPage() {
  const { showToast } = useToast();
  const { t, isRTL, lang } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTopic, setFilterTopic] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterEssential, setFilterEssential] = useState<"" | "essential" | "non-essential">("");
  const [questionType, setQuestionType] = useState<"topic" | "exam">("topic");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [queue, setQueue] = useState<FormData[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [questionsRes, subjectsRes, topicsRes, unitsRes] = await Promise.all([
        apiFetch<Question[]>("/api/admin/questions"),
        apiFetch<Subject[]>("/api/admin/subjects"),
        apiFetch<Topic[]>("/api/admin/topics"),
        apiFetch<Unit[]>("/api/admin/units"),
      ]);
      setQuestions(questionsRes.data ?? []);
      setSubjects(subjectsRes.data ?? []);
      const allTopics = topicsRes.data ?? [];
      setTopics(allTopics);
      setFilteredTopics(allTopics);
      const allUnits = unitsRes.data ?? [];
      setUnits(allUnits);
      setFilteredUnits(allUnits);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (form.subjectId) {
      setFilteredTopics(topics.filter((t) => t.subjectId === form.subjectId));
      setFilteredUnits(units.filter((u) => u.subjectId === form.subjectId));
    } else {
      setFilteredTopics(topics);
      setFilteredUnits(units);
    }
  }, [form.subjectId, topics, units]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError(null);
    setQuestionType("topic");
  }

  function openEdit(q: Question) {
    const isExam = !!q.unitId;
    setQuestionType(isExam ? "exam" : "topic");
    setForm({
      question: q.question,
      options: q.options.length >= 2 ? q.options : ["", ""],
      correctAnswer: q.correctAnswer,
      topicId: q.topicId || "",
      unitId: q.unitId || "",
      subjectId: q.subjectId,
      difficulty: q.difficulty,
      explanation: q.explanation,
      order: q.order,
    });
    setEditingId(q._id);
    setShowForm(true);
  }

  function updateOption(index: number, value: string) {
    const opts = [...form.options];
    opts[index] = value;
    setForm({ ...form, options: opts });
  }

  function addOption() {
    if (form.options.length >= 6) return;
    setForm({ ...form, options: [...form.options, ""] });
  }

  function removeOption(index: number) {
    if (form.options.length <= 2) return;
    const opts = form.options.filter((_, i) => i !== index);
    if (index === form.correctAnswer) {
      setForm({ ...form, options: opts, correctAnswer: -1 });
      return;
    }
    const newCorrect = form.correctAnswer > index
      ? form.correctAnswer - 1
      : form.correctAnswer >= opts.length
        ? opts.length - 1
        : form.correctAnswer;
    setForm({ ...form, options: opts, correctAnswer: newCorrect });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const filteredOpts = form.options.filter((o) => o.trim() !== "");
      if (filteredOpts.length < 2) {
        setError(t('admin.options_min_error'));
        setSaving(false);
        return;
      }
      const body: Record<string, unknown> = {
        question: form.question,
        options: filteredOpts,
        correctAnswer: form.correctAnswer,
        subjectId: form.subjectId,
        difficulty: form.difficulty,
        explanation: form.explanation,
        order: form.order,
      };
      if (form.correctAnswer < 0 || form.correctAnswer >= filteredOpts.length) {
        setError(t('admin.correct_answer_error'));
        setSaving(false);
        return;
      }
      if (questionType === "exam") {
        body.unitId = form.unitId;
      } else {
        body.topicId = form.topicId;
      }
      if (editingId) {
        await apiFetch(`/api/admin/questions/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/admin/questions", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteTarget(id);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/admin/questions/${deleteTarget}`, { method: "DELETE" });
      showToast(t('admin.question_deleted'), "success");
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
      setDeleteTarget(null);
    }
  }

  function addToQueue() {
    setError(null);
    const filteredOpts = form.options.filter((o) => o.trim() !== "");
    if (!form.question.trim()) { setError("نص السؤال مطلوب"); return; }
    if (filteredOpts.length < 2) { setError(t("admin.options_min_error")); return; }
    if (form.correctAnswer < 0 || form.correctAnswer >= filteredOpts.length) {
      setError(t("admin.correct_answer_error")); return;
    }
    if (!form.subjectId) { setError("يجب اختيار المادة"); return; }
    if (questionType === "topic" && !form.topicId) { setError("يجب اختيار الدرس"); return; }
    if (questionType === "exam" && !form.unitId) { setError("يجب اختيار الوحدة"); return; }
    const normalised = { ...form, options: filteredOpts };
    setQueue((prev) => [...prev, normalised]);
    const keepContext = {
      ...emptyForm,
      subjectId: form.subjectId,
      topicId: form.topicId,
      unitId: form.unitId,
      difficulty: form.difficulty,
      order: form.order + 1,
    };
    setForm(keepContext);
    setError(null);
  }

  async function saveAllQueued() {
    if (queue.length === 0) return;
    setSavingAll(true);
    setError(null);
    try {
      const items = queue.map((q) => ({
        question: q.question,
        options: q.options.filter((o) => o.trim() !== ""),
        correctAnswer: q.correctAnswer,
        subjectId: q.subjectId,
        difficulty: q.difficulty,
        explanation: q.explanation,
        order: q.order,
        ...(q.unitId ? { unitId: q.unitId } : { topicId: q.topicId }),
      }));
      const res = await apiFetch<{ created: number; errors: { index: number; error: string }[] }>(
        "/api/admin/questions/bulk",
        { method: "POST", body: JSON.stringify({ items }) }
      );
      if (res.success) {
        const created = res.data?.created ?? 0;
        const errs = res.data?.errors ?? [];
        if (errs.length > 0) {
          showToast(`تم حفظ ${created} سؤال. ${errs.length} أخطاء.`, "warning");
        } else {
          showToast(`✅ تم حفظ ${created} سؤال بنجاح!`, "success");
          setQueue([]);
          resetForm();
        }
        await fetchData();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingAll(false);
    }
  }

  async function togglePublish(q: Question) {
    try {
      await apiFetch(`/api/admin/questions/${q._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !q.isPublished }),
      });
      await fetchData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function getTopicName(id: string): string {
    return topics.find((t) => t._id === id)?.title ?? id;
  }

  function getUnitName(id: string): string {
    return units.find((u) => u._id === id)?.title ?? id;
  }

  function getSubjectName(id: string): string {
    return subjects.find((s) => s._id === id)?.name ?? id;
  }

  const topicEssentialMap = Object.fromEntries(topics.map(t => [t._id, t.isEssential ?? true]));
  const filteredQuestions = questions.filter((q) => {
    if (filterTopic && q.topicId !== filterTopic) return false;
    if (filterUnit && q.unitId !== filterUnit) return false;
    if (filterEssential === "essential" && !topicEssentialMap[q.topicId ?? ""]) return false;
    if (filterEssential === "non-essential" && topicEssentialMap[q.topicId ?? ""]) return false;
    return true;
  });

  const QUESTION_FIELDS = [
    { name: "question", label: lang === "ar" ? "نص السؤال" : "Question", required: true, type: "string" as const },
    { name: "options", label: lang === "ar" ? "الخيارات" : "Options", required: true, type: "array" as const },
    { name: "correctAnswer", label: lang === "ar" ? "الإجابة الصحيحة (رقم)" : "Correct Answer (index)", required: true, type: "number" as const },
    { name: "subjectId", label: lang === "ar" ? "المادة (ID)" : "Subject ID", required: true, type: "string" as const },
    { name: "topicId", label: lang === "ar" ? "الدرس (ID)" : "Topic ID", required: false, type: "string" as const },
    { name: "unitId", label: lang === "ar" ? "الوحدة (ID)" : "Unit ID", required: false, type: "string" as const },
    { name: "difficulty", label: lang === "ar" ? "الصعوبة" : "Difficulty", required: false, type: "string" as const },
    { name: "explanation", label: lang === "ar" ? "الشرح" : "Explanation", required: false, type: "string" as const },
  ];

  const difficultyLabels: Record<string, { label: string; color: "success" | "warning" | "danger" }> = {
    easy: { label: t('admin.easy'), color: "success" },
    medium: { label: t('admin.medium'), color: "warning" },
    hard: { label: t('admin.hard'), color: "danger" },
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('admin.questions')}</h2>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">{t('admin.questions_desc')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <JsonImport
            fields={QUESTION_FIELDS}
            entityLabel={lang === "ar" ? "سؤال" : "Question"}
            onFill={(data) => {
              setForm({
                question: String(data.question ?? ""),
                options: Array.isArray(data.options) ? data.options.map(String) : ["", "", "", ""],
                correctAnswer: Number(data.correctAnswer ?? 0),
                topicId: String(data.topicId ?? ""),
                unitId: String(data.unitId ?? ""),
                subjectId: String(data.subjectId ?? ""),
                difficulty: String(data.difficulty ?? "medium"),
                explanation: String(data.explanation ?? ""),
                order: Number(data.order ?? 0),
              });
              setShowForm(true);
            }}
          />
          <BulkImportModal
            apiEndpoint="/api/admin/questions/bulk"
            fields={QUESTION_FIELDS}
            entityLabel={lang === "ar" ? "أسئلة" : "Questions"}
            onSuccess={fetchData}
          />
          <Button onClick={() => { resetForm(); setShowForm(true); }} withRipple>
            <Plus className="w-5 h-5 ml-2" />
            {t("admin.add_question")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm animate-slide-in-right">
          {error}
        </div>
      )}

      {showForm && (
        <Card withGlass className="p-6 animate-slide-in-right">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            {editingId ? t('admin.edit_question') : t('admin.add_question')}
          </h3>

          <div className="space-y-4 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">{t('admin.question')}</label>
              <textarea
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder={t('admin.question_placeholder')}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10 resize-none"
              />
            </div>

            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="radio"
                  name="questionType"
                  checked={questionType === "topic"}
                  onChange={() => { setQuestionType("topic"); setForm({ ...form, topicId: "", unitId: "" }); }}
                  className="accent-primary w-4 h-4"
                />
                <FileText className="w-4 h-4" />
                {lang === "ar" ? "سؤال درس" : "Lesson Question"}
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="radio"
                  name="questionType"
                  checked={questionType === "exam"}
                  onChange={() => { setQuestionType("exam"); setForm({ ...form, topicId: "", unitId: "" }); }}
                  className="accent-primary w-4 h-4"
                />
                <FileQuestion className="w-4 h-4" />
                {lang === "ar" ? "سؤال اختبار الوحدة" : "Unit Exam Question"}
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">{t('admin.subject')}</label>
                <select
                  value={form.subjectId}
                  onChange={(e) => {
                    setForm({ ...form, subjectId: e.target.value, topicId: "", unitId: "" });
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                >
                  <option value="">{t('admin.select_subject')}</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {questionType === "topic" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">{t('admin.topic')}</label>
                  <select
                    value={form.topicId}
                    onChange={(e) => setForm({ ...form, topicId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                  >
                    <option value="">{t('admin.select_topic')}</option>
                    {filteredTopics.map((t) => (
                      <option key={t._id} value={t._id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">{lang === "ar" ? "الوحدة" : "Unit"}</label>
                  <select
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                  >
                    <option value="">{lang === "ar" ? "اختر وحدة" : "Select unit"}</option>
                    {filteredUnits.map((u) => (
                      <option key={u._id} value={u._id}>{u.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">{t('admin.difficulty')}</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                >
                  <option value="easy">🌟 {t('admin.easy')}</option>
                  <option value="medium">⚡ {t('admin.medium')}</option>
                  <option value="hard">🔥 {t('admin.hard')}</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">{t('admin.order')}</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary block mb-2">{t('admin.options_count')}</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={form.correctAnswer === i}
                    onChange={() => setForm({ ...form, correctAnswer: i })}
                    className="accent-primary w-4 h-4 shrink-0"
                  />
                  <input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`${t('admin.option_prefix')} ${i + 1}`}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                  />
                  {form.options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-all"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {form.options.length < 6 && (
                <button
                  onClick={addOption}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors mt-1"
                >
                  <PlusCircle className="w-4 h-4" />
                  {t('admin.add_option')}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">{t('admin.explanation')}</label>
              <textarea
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                placeholder={t('admin.explanation_placeholder')}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10 resize-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl border-2 border-border text-text-secondary text-sm font-medium hover:bg-surface-hover transition-all"
            >
              {lang === "ar" ? "إلغاء" : "Cancel"}
            </button>

            {editingId ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50"
              >
                {saving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ التعديل" : "Save Edit")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={addToQueue}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  {lang === "ar"
                    ? `أضف للقائمة ${queue.length > 0 ? `(${queue.length})` : ""}`
                    : `Add to Queue ${queue.length > 0 ? `(${queue.length})` : ""}`}
                </button>

                {queue.length > 0 && (
                  <button
                    type="button"
                    onClick={saveAllQueued}
                    disabled={savingAll}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50"
                  >
                    {savingAll
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Upload className="w-4 h-4" />}
                    {savingAll
                      ? (lang === "ar" ? "جاري الحفظ..." : "Saving...")
                      : (lang === "ar" ? `حفظ الكل (${queue.length} أسئلة)` : `Save All (${queue.length} questions)`)}
                  </button>
                )}
              </>
            )}
          </div>
        </Card>
      )}

      {queue.length > 0 && !editingId && (
        <div className="border border-primary/30 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-primary/5 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-bold text-primary">
                {lang === "ar"
                  ? `${queue.length} سؤال في قائمة الانتظار — لم يُحفظ بعد`
                  : `${queue.length} question${queue.length !== 1 ? "s" : ""} staged — not saved yet`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQueue([])}
                className="text-xs text-danger hover:underline"
              >
                {lang === "ar" ? "مسح الكل" : "Clear All"}
              </button>
              <button
                onClick={saveAllQueued}
                disabled={savingAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {savingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {lang === "ar" ? `حفظ الكل (${queue.length})` : `Save All (${queue.length})`}
              </button>
            </div>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {queue.map((q, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-surface-hover transition-colors group">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary font-medium truncate">{q.question}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                    <span>{q.options.filter(Boolean).length} {lang === "ar" ? "خيارات" : "options"}</span>
                    <span>✓ {q.options[q.correctAnswer]?.slice(0, 30) || "—"}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      q.difficulty === "easy" ? "bg-success/10 text-success" :
                      q.difficulty === "hard" ? "bg-danger/10 text-danger" :
                      "bg-warning/10 text-warning"
                    }`}>
                      {q.difficulty === "easy" ? (lang === "ar" ? "سهل" : "Easy") :
                       q.difficulty === "hard" ? (lang === "ar" ? "صعب" : "Hard") :
                       (lang === "ar" ? "متوسط" : "Medium")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setQueue((prev) => prev.filter((_, j) => j !== i))}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-all shrink-0"
                  title={lang === "ar" ? "حذف من القائمة" : "Remove from queue"}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setFilterTopic(""); setFilterUnit(""); setFilterEssential(""); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            !filterTopic && !filterUnit && !filterEssential
              ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
              : "bg-surface text-text-secondary border border-border hover:border-primary/50"
          }`}
        >
          <Filter className="w-4 h-4" />
          {t('admin.all')}
        </button>
        <button
          onClick={() => { setFilterEssential("essential"); setFilterTopic(""); setFilterUnit(""); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            filterEssential === "essential"
              ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
              : "bg-surface text-text-secondary border border-border hover:border-primary/50"
          }`}
        >
          {lang === "ar" ? "أساسي" : "Essential"}
        </button>
        <button
          onClick={() => { setFilterEssential("non-essential"); setFilterTopic(""); setFilterUnit(""); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            filterEssential === "non-essential"
              ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
              : "bg-surface text-text-secondary border border-border hover:border-primary/50"
          }`}
        >
          {lang === "ar" ? "غير أساسي" : "Non-Essential"}
        </button>
        {units.slice(0, 10).map((u) => (
          <button
            key={u._id}
            onClick={() => { setFilterUnit(u._id); setFilterTopic(""); setFilterEssential(""); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              filterUnit === u._id
                ? "bg-gradient-to-r from-secondary to-primary text-white shadow-lg shadow-primary/20"
                : "bg-surface text-text-secondary border border-border hover:border-primary/50"
            }`}
          >
            {lang === "ar" ? `اختبار: ${u.title}` : `Exam: ${u.title}`}
          </button>
        ))}
        {topics.slice(0, 15).map((t) => (
          <button
            key={t._id}
            onClick={() => { setFilterTopic(t._id); setFilterUnit(""); setFilterEssential(""); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              filterTopic === t._id
                ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                : "bg-surface text-text-secondary border border-border hover:border-primary/50"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>

      <Table
        headers={[t('admin.question'), lang === "ar" ? "المصدر" : "Source", t('admin.difficulty'), t('admin.published'), t('admin.actions')]}
      >
        {filteredQuestions.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-12 text-text-muted">
              {t('admin.no_questions')}
            </TableCell>
          </TableRow>
        ) : (
          filteredQuestions.map((q) => {
            const difficulty = difficultyLabels[q.difficulty] || { label: q.difficulty, color: "info" };
            const isExam = !!q.unitId;
            return (
              <TableRow key={q._id}>
                <TableCell>
                  <div className="flex items-center gap-2 max-w-xs">
                    <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                    <MarkdownRenderer content={q.question} />
                  </div>
                </TableCell>
                <TableCell className="text-text-muted text-sm">
                  {isExam ? (
                    <Badge variant="info">
                      {lang === "ar" ? "اختبار وحدة" : "Unit Exam"}
                    </Badge>
                  ) : (
                    getTopicName(q.topicId || "")
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={difficulty.color}>
                    {difficulty.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => togglePublish(q)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
                  >
                    {q.isPublished ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <Badge variant="success">{t('admin.published')}</Badge>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <Badge variant="warning">{t('admin.not_published')}</Badge>
                      </>
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(q)}
                      className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all duration-200 group"
                    >
                      <Edit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => handleDelete(q._id)}
                      className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-all duration-200 group"
                    >
                      <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('common.delete')}
        message={t('admin.delete_confirm_question')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      </Table>
    </div>
  );
}
