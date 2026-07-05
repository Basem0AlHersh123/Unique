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
import JsonImport, { type JsonField } from "@/components/ui/JsonImport";
import BulkImportModal from "@/components/ui/BulkImportModal";
import {
  Plus, Edit2, Trash2, BookMarked, Filter, Eye, EyeOff,
} from "lucide-react";

interface College {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
}

interface Subject {
  _id: string;
  name: string;
  collegeId: string;
}

interface VocabularyWord {
  _id: string;
  word: string;
  definition: string;
  example: string;
  arabicMeaning: string;
  imageUrl: string;
  collegeId: string;
  subjectId?: string;
  difficulty: string;
  isPublished: boolean;
}

interface FormData {
  word: string;
  definition: string;
  example: string;
  arabicMeaning: string;
  imageUrl: string;
  collegeId: string;
  subjectId: string;
  difficulty: string;
  isPublished: boolean;
}

const emptyForm: FormData = {
  word: "",
  definition: "",
  example: "",
  arabicMeaning: "",
  imageUrl: "",
  collegeId: "",
  subjectId: "",
  difficulty: "medium",
  isPublished: true,
};

export default function VocabularyPage() {
  const { showToast } = useToast();
  const { t, lang } = useLanguage();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCollege, setFilterCollege] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [wordsRes, collegesRes, subjectsRes] = await Promise.all([
        apiFetch<VocabularyWord[]>("/api/admin/vocabulary"),
        apiFetch<College[]>("/api/admin/colleges"),
        apiFetch<Subject[]>("/api/admin/subjects"),
      ]);
      setWords(wordsRes.data ?? []);
      setColleges(collegesRes.data ?? []);
      setSubjects(subjectsRes.data ?? []);
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
    if (form.collegeId) {
      setFilteredSubjects(subjects.filter((s) => s.collegeId === form.collegeId));
    } else {
      setFilteredSubjects(subjects);
    }
  }, [form.collegeId, subjects]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function openEdit(w: VocabularyWord) {
    setForm({
      word: w.word,
      definition: w.definition,
      example: w.example,
      arabicMeaning: w.arabicMeaning,
      imageUrl: w.imageUrl || "",
      collegeId: w.collegeId,
      subjectId: w.subjectId || "",
      difficulty: w.difficulty,
      isPublished: w.isPublished,
    });
    setEditingId(w._id);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        word: form.word,
        definition: form.definition,
        example: form.example,
        arabicMeaning: form.arabicMeaning,
        imageUrl: form.imageUrl || undefined,
        collegeId: form.collegeId,
        subjectId: form.subjectId || undefined,
        difficulty: form.difficulty,
        isPublished: form.isPublished,
      };
      if (editingId) {
        await apiFetch(`/api/admin/vocabulary/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/admin/vocabulary", {
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
      await apiFetch(`/api/admin/vocabulary/${deleteTarget}`, { method: "DELETE" });
      showToast(lang === "ar" ? "تم حذف المفردة" : "Vocabulary deleted", "success");
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
      setDeleteTarget(null);
    }
  }

  async function togglePublish(w: VocabularyWord) {
    try {
      await apiFetch(`/api/admin/vocabulary/${w._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !w.isPublished }),
      });
      await fetchData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function getCollegeName(id: string): string {
    return colleges.find((c) => c._id === id)?.name ?? id;
  }

  const filteredWords = words.filter((w) => {
    if (filterCollege && w.collegeId !== filterCollege) return false;
    return true;
  });

  const difficultyLabels: Record<string, { label: string; color: "success" | "warning" | "danger" }> = {
    easy: { label: lang === "ar" ? "سهل" : "Easy", color: "success" },
    medium: { label: lang === "ar" ? "متوسط" : "Medium", color: "warning" },
    hard: { label: lang === "ar" ? "صعب" : "Hard", color: "danger" },
  };

  const VOCAB_FIELDS: JsonField[] = [
    { name: "word", label: lang === "ar" ? "الكلمة" : "Word", required: true, type: "string" },
    { name: "definition", label: lang === "ar" ? "التعريف" : "Definition", required: true, type: "string" },
    { name: "example", label: lang === "ar" ? "مثال" : "Example", required: true, type: "string" },
    { name: "arabicMeaning", label: lang === "ar" ? "المعنى بالعربي" : "Arabic Meaning", required: true, type: "string" },
    { name: "collegeId", label: lang === "ar" ? "الكلية (ID)" : "College ID", required: true, type: "string" },
    { name: "subjectId", label: lang === "ar" ? "المادة (ID)" : "Subject ID", required: false, type: "string" },
    { name: "difficulty", label: lang === "ar" ? "الصعوبة" : "Difficulty", required: false, type: "string" },
    { name: "imageUrl", label: lang === "ar" ? "رابط الصورة" : "Image URL", required: false, type: "string" },
  ];

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
            {lang === "ar" ? "بنك المفردات" : "Vocabulary Bank"}
          </h2>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">
            {lang === "ar" ? "إدارة المفردات اللغوية" : "Manage vocabulary words"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <JsonImport
            fields={VOCAB_FIELDS}
            entityLabel={lang === "ar" ? "مفردة" : "Word"}
            onFill={(data) => {
              setForm({
                word: String(data.word ?? ""),
                definition: String(data.definition ?? ""),
                example: String(data.example ?? ""),
                arabicMeaning: String(data.arabicMeaning ?? ""),
                imageUrl: String(data.imageUrl ?? ""),
                collegeId: String(data.collegeId ?? ""),
                subjectId: String(data.subjectId ?? ""),
                difficulty: String(data.difficulty ?? "medium"),
                isPublished: Boolean(data.isPublished ?? true),
              });
              setShowForm(true);
            }}
          />
          <BulkImportModal
            apiEndpoint="/api/admin/vocabulary/bulk"
            fields={VOCAB_FIELDS}
            entityLabel={lang === "ar" ? "مفردات" : "Vocabulary"}
            onSuccess={fetchData}
          />
          <Button onClick={() => { resetForm(); setShowForm(true); }} withRipple>
            <Plus className="w-5 h-5 ml-2" />
            {lang === "ar" ? "إضافة مفردة" : "Add Word"}
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
            <BookMarked className="w-5 h-5 text-primary" />
            {editingId
              ? (lang === "ar" ? "تعديل المفردة" : "Edit Word")
              : (lang === "ar" ? "إضافة مفردة جديدة" : "Add New Word")}
          </h3>

          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">{lang === "ar" ? "الكلمة" : "Word"}</label>
                <input
                  value={form.word}
                  onChange={(e) => setForm({ ...form, word: e.target.value })}
                  placeholder={lang === "ar" ? "الكلمة / Word" : "Word"}
                  className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">{lang === "ar" ? "المعنى بالعربي" : "Arabic Meaning"}</label>
                <input
                  value={form.arabicMeaning}
                  onChange={(e) => setForm({ ...form, arabicMeaning: e.target.value })}
                  placeholder={lang === "ar" ? "المعنى بالعربي" : "Arabic meaning"}
                  className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">{lang === "ar" ? "التعريف" : "Definition"}</label>
              <textarea
                value={form.definition}
                onChange={(e) => setForm({ ...form, definition: e.target.value })}
                placeholder={lang === "ar" ? "التعريف / Definition" : "Definition"}
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10 resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">{lang === "ar" ? "مثال" : "Example Sentence"}</label>
              <textarea
                value={form.example}
                onChange={(e) => setForm({ ...form, example: e.target.value })}
                placeholder={lang === "ar" ? "مثال / Example Sentence" : "Example sentence"}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10 resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">{lang === "ar" ? "رابط الصورة (اختياري)" : "Image URL (Optional)"}</label>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder={lang === "ar" ? "https://example.com/image.jpg" : "https://example.com/image.jpg"}
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">{lang === "ar" ? "الكلية" : "College"}</label>
                <select
                  value={form.collegeId}
                  onChange={(e) => setForm({ ...form, collegeId: e.target.value, subjectId: "" })}
                  className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                >
                  <option value="">{lang === "ar" ? "اختر كلية" : "Select college"}</option>
                  {colleges.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">{lang === "ar" ? "المادة (اختياري)" : "Subject (Optional)"}</label>
                <select
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                >
                  <option value="">{lang === "ar" ? "اختر مادة" : "Select subject"}</option>
                  {filteredSubjects.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">{lang === "ar" ? "المستوى" : "Difficulty"}</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                >
                  <option value="easy">🌟 {lang === "ar" ? "سهل" : "Easy"}</option>
                  <option value="medium">⚡ {lang === "ar" ? "متوسط" : "Medium"}</option>
                  <option value="hard">🔥 {lang === "ar" ? "صعب" : "Hard"}</option>
                </select>
              </div>
              <div className="flex items-end pb-3">
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="accent-primary w-4 h-4"
                  />
                  {lang === "ar" ? "منشور" : "Published"}
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} isLoading={saving}>
              {editingId ? t('common.save') : (lang === "ar" ? "إضافة" : "Add")}
            </Button>
            <Button variant="secondary" onClick={resetForm}>{t('common.cancel')}</Button>
          </div>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCollege("")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            !filterCollege
              ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
              : "bg-surface text-text-secondary border border-border hover:border-primary/50"
          }`}
        >
          <Filter className="w-4 h-4" />
          {lang === "ar" ? "الكل" : "All"}
        </button>
        {colleges.map((c) => (
          <button
            key={c._id}
            onClick={() => setFilterCollege(c._id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              filterCollege === c._id
                ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                : "bg-surface text-text-secondary border border-border hover:border-primary/50"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <Table
        headers={[
          lang === "ar" ? "الكلمة" : "Word",
          lang === "ar" ? "الكلية" : "College",
          lang === "ar" ? "المستوى" : "Difficulty",
          lang === "ar" ? "النشر" : "Published",
          lang === "ar" ? "الإجراءات" : "Actions",
        ]}
      >
        {filteredWords.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-12 text-text-muted">
              {lang === "ar" ? "لا توجد مفردات" : "No vocabulary words"}
            </TableCell>
          </TableRow>
        ) : (
          filteredWords.map((w) => {
            const difficulty = difficultyLabels[w.difficulty] || { label: w.difficulty, color: "info" as const };
            return (
              <TableRow key={w._id}>
                <TableCell>
                  <div className="flex items-center gap-2 max-w-xs">
                    <BookMarked className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate font-medium">{w.word}</span>
                  </div>
                </TableCell>
                <TableCell className="text-text-muted text-sm">
                  {getCollegeName(w.collegeId)}
                </TableCell>
                <TableCell>
                  <Badge variant={difficulty.color}>
                    {difficulty.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => togglePublish(w)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
                  >
                    {w.isPublished ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <Badge variant="success">{lang === "ar" ? "منشور" : "Published"}</Badge>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <Badge variant="warning">{lang === "ar" ? "غير منشور" : "Not Published"}</Badge>
                      </>
                    )}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(w)}
                      className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all duration-200 group"
                    >
                      <Edit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => handleDelete(w._id)}
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
        message={lang === "ar" ? "هل أنت متأكد من حذف هذه المفردة؟" : "Delete this vocabulary word?"}
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
