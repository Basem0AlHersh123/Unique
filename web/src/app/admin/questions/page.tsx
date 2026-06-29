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
import {
  Plus, Edit2, Trash2, HelpCircle, Filter, Eye, EyeOff, PlusCircle, MinusCircle,
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
}

interface Question {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  topicId: string;
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
  subjectId: "",
  difficulty: "medium",
  explanation: "",
  order: 0,
};

export default function QuestionsPage() {
  const { showToast } = useToast();
  const { t, isRTL } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTopic, setFilterTopic] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [questionsRes, subjectsRes, topicsRes] = await Promise.all([
        apiFetch<Question[]>("/api/admin/questions"),
        apiFetch<Subject[]>("/api/admin/subjects"),
        apiFetch<Topic[]>("/api/admin/topics"),
      ]);
      setQuestions(questionsRes.data ?? []);
      setSubjects(subjectsRes.data ?? []);
      const allTopics = topicsRes.data ?? [];
      setTopics(allTopics);
      setFilteredTopics(allTopics);
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
    } else {
      setFilteredTopics(topics);
    }
  }, [form.subjectId, topics]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function openEdit(q: Question) {
    setForm({
      question: q.question,
      options: q.options.length >= 2 ? q.options : ["", ""],
      correctAnswer: q.correctAnswer,
      topicId: q.topicId,
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
      const body = {
        ...form,
        options: filteredOpts,
        correctAnswer: form.correctAnswer,
      };
      if (body.correctAnswer < 0 || body.correctAnswer >= filteredOpts.length) {
        setError(t('admin.correct_answer_error'));
        setSaving(false);
        return;
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

  function getSubjectName(id: string): string {
    return subjects.find((s) => s._id === id)?.name ?? id;
  }

  const filteredQuestions = filterTopic
    ? questions.filter((q) => q.topicId === filterTopic)
    : questions;

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
        <Button onClick={() => { resetForm(); setShowForm(true); }} withRipple>
          <Plus className="w-5 h-5 ml-2" />
          {t('admin.add')}
        </Button>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">{t('admin.subject')}</label>
                <select
                  value={form.subjectId}
                  onChange={(e) => {
                    setForm({ ...form, subjectId: e.target.value, topicId: "" });
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                >
                  <option value="">{t('admin.select_subject')}</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
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

          <div className="flex gap-3">
            <Button onClick={handleSave} isLoading={saving}>
              {editingId ? t('common.save') : t('admin.add')}
            </Button>
            <Button variant="secondary" onClick={resetForm}>{t('common.cancel')}</Button>
          </div>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterTopic("")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            !filterTopic
              ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
              : "bg-surface text-text-secondary border border-border hover:border-primary/50"
          }`}
        >
          <Filter className="w-4 h-4" />
          {t('admin.all')}
        </button>
        {topics.slice(0, 20).map((t) => (
          <button
            key={t._id}
            onClick={() => setFilterTopic(t._id)}
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
        headers={[t('admin.question'), t('admin.topic'), t('admin.difficulty'), t('admin.published'), t('admin.actions')]}
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
            return (
              <TableRow key={q._id}>
                <TableCell>
                  <div className="flex items-center gap-2 max-w-xs">
                    <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate">{q.question}</span>
                  </div>
                </TableCell>
                <TableCell className="text-text-muted text-sm">
                  {getTopicName(q.topicId)}
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
