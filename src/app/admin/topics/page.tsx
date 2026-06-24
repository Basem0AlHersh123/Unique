"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { Plus, Edit2, Trash2, Layers, Filter, Video, Eye, EyeOff } from "lucide-react";

interface College {
  _id: string;
  name: string;
}

interface Subject {
  _id: string;
  name: string;
  collegeId: string;
}

interface Topic {
  _id: string;
  title: string;
  slug: string;
  subjectId: string;
  unitId?: string;
  order: number;
  isFree: boolean;
  isPublished: boolean;
  difficulty: string;
  videoUrl: string;
}

interface Unit {
  _id: string;
  title: string;
  titleEn?: string;
  subjectId: string;
}

interface FormData {
  title: string;
  slug: string;
  subjectId: string;
  unitId: string;
  videoUrl: string;
  order: number;
  isFree: boolean;
  difficulty: string;
}

const emptyForm: FormData = {
  title: "",
  slug: "",
  subjectId: "",
  unitId: "",
  videoUrl: "",
  order: 0,
  isFree: false,
  difficulty: "beginner",
};

export default function TopicsPage() {
  const { showToast } = useToast();
  const { t, isRTL } = useLanguage();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [topicsRes, subjectsRes, collegesRes, unitsRes] = await Promise.all([
        apiFetch<Topic[]>("/api/admin/topics"),
        apiFetch<Subject[]>("/api/admin/subjects"),
        apiFetch<College[]>("/api/admin/colleges"),
        apiFetch<Unit[]>("/api/admin/units"),
      ]);
      setTopics(topicsRes.data ?? []);
      setSubjects(subjectsRes.data ?? []);
      setColleges(collegesRes.data ?? []);
      setUnits(unitsRes.data ?? []);
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

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function openEdit(t: Topic) {
    setForm({
      title: t.title,
      slug: t.slug,
      subjectId: t.subjectId,
      unitId: t.unitId || "",
      videoUrl: t.videoUrl,
      order: t.order,
      isFree: t.isFree,
      difficulty: t.difficulty,
    });
    setEditingId(t._id);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body = { ...form };
      if (editingId) {
        await apiFetch(`/api/admin/topics/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/admin/topics", {
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
      await apiFetch(`/api/admin/topics/${deleteTarget}`, { method: "DELETE" });
      showToast(t('admin.topic_deleted'), "success");
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
      setDeleteTarget(null);
    }
  }

  async function togglePublish(topic: Topic) {
    try {
      await apiFetch(`/api/admin/topics/${topic._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !topic.isPublished }),
      });
      await fetchData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function getSubjectName(id: string): string {
    return subjects.find((s) => s._id === id)?.name ?? id;
  }

  const filteredTopics = filterSubject
    ? topics.filter((t) => t.subjectId === filterSubject)
    : topics;

  const difficultyLabels: Record<string, { label: string; color: "success" | "warning" | "danger" }> = {
    beginner: { label: t('admin.beginner'), color: "success" },
    intermediate: { label: t('admin.intermediate'), color: "warning" },
    advanced: { label: t('admin.advanced'), color: "danger" },
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('admin.topics')}</h2>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">{t('admin.topics_desc')}</p>
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
            <Layers className="w-5 h-5 text-primary" />
            {editingId ? t('admin.edit_topic') : t('admin.add_topic')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label={t('admin.topic')}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('admin.title_placeholder')}
            />
            <Input
              label={t('admin.slug')}
              value={form.slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  slug: e.target.value.replace(/\s+/g, "-").toLowerCase(),
                })
              }
              placeholder="introduction-to-algorithms"
              disabled={!!editingId}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                {t('admin.subject')}
              </label>
              <select
                value={form.subjectId}
                onChange={(e) =>
                  setForm({ ...form, subjectId: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                disabled={!!editingId}
              >
                <option value="">{t('admin.select_subject')}</option>
                {subjects.map((s) => {
                  const collegeName = colleges.find(
                    (c) => c._id === s.collegeId
                  )?.name;
                  return (
                    <option key={s._id} value={s._id}>
                      {s.name}
                      {collegeName ? ` (${collegeName})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                {t('admin.unit')}
              </label>
              <select
                value={form.unitId}
                onChange={(e) =>
                  setForm({ ...form, unitId: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
              >
                <option value="">{t('admin.select_unit')}</option>
                {units
                  .filter((u) => u.subjectId === form.subjectId)
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.title}
                    </option>
                  ))}
              </select>
            </div>
            <Input
              label={t('admin.video_url')}
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              icon={<Video className="w-5 h-5 text-primary" />}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                {t('admin.difficulty')}
              </label>
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm({ ...form, difficulty: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
              >
                <option value="beginner">🌟 {t('admin.beginner')}</option>
                <option value="intermediate">⚡ {t('admin.intermediate')}</option>
                <option value="advanced">🔥 {t('admin.advanced')}</option>
              </select>
            </div>
            <Input
              label={t('admin.order')}
              type="number"
              value={String(form.order)}
              onChange={(e) =>
                setForm({ ...form, order: parseInt(e.target.value) || 0 })
              }
            />
            <label className="flex items-center gap-2 text-text-secondary text-sm mt-8">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) =>
                  setForm({ ...form, isFree: e.target.checked })
                }
                className="rounded border-border w-4 h-4 accent-primary"
              />
              {t('topic.free')}
            </label>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} isLoading={saving}>
              {editingId ? t('common.save') : t('admin.add')}
            </Button>
            <Button variant="secondary" onClick={resetForm}>
              {t('common.cancel')}
            </Button>
          </div>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterSubject("")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            !filterSubject
              ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
              : "bg-surface text-text-secondary border border-border hover:border-primary/50"
          }`}
        >
          <Filter className="w-4 h-4" />
          {t('admin.all')}
        </button>
        {subjects.map((s) => (
          <button
            key={s._id}
            onClick={() => setFilterSubject(s._id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
              filterSubject === s._id
                ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                : "bg-surface text-text-secondary border border-border hover:border-primary/50"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <Table headers={[t('admin.topic'), t('admin.subject'), t('admin.difficulty'), t('admin.published'), t('admin.actions')]}>
        {filteredTopics.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-12 text-text-muted">
              {t('admin.no_topics')}
            </TableCell>
          </TableRow>
        ) : (
          filteredTopics.map((topic) => {
            const difficulty = difficultyLabels[topic.difficulty] || { label: topic.difficulty, color: "info" };
            return (
              <TableRow key={topic._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{topic.title}</span>
                    {topic.isFree && (
                      <Badge variant="success" withPulse>
                        {t('topic.free')}
                      </Badge>
                    )}
                    {topic.videoUrl && (
                      // ✅ REPLACED Youtube with Video
                      <Video className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-text-muted text-sm">
                  {getSubjectName(topic.subjectId)}
                </TableCell>
                <TableCell>
                  <Badge variant={difficulty.color}>
                    {difficulty.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => togglePublish(topic)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
                  >
                    {topic.isPublished ? (
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
                      onClick={() => openEdit(topic)}
                      className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all duration-200 group"
                    >
                      <Edit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => handleDelete(topic._id)}
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
        message={t('admin.delete_confirm_topic')}
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
