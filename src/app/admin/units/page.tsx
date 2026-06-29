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
import { Plus, Edit2, Trash2, FolderOpen, Filter, Eye, EyeOff, ToggleLeft, ToggleRight } from "lucide-react";

interface Subject {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
}

interface Level {
  _id: string;
  title: string;
  titleEn?: string;
  subjectId: string;
}

interface Unit {
  _id: string;
  title: string;
  titleEn?: string;
  levelId: string;
  subjectId: string;
  order: number;
  isPublished: boolean;
  comingSoon: boolean;
  description?: string;
  examEnabled: boolean;
}

interface FormData {
  title: string;
  titleEn: string;
  subjectId: string;
  levelId: string;
  order: number;
  description: string;
  comingSoon: boolean;
  isPublished: boolean;
  examEnabled: boolean;
}

const emptyForm: FormData = {
  title: "",
  titleEn: "",
  subjectId: "",
  levelId: "",
  order: 0,
  description: "",
  comingSoon: false,
  isPublished: false,
  examEnabled: true,
};

export default function UnitsPage() {
  const { showToast } = useToast();
  const { t, lang } = useLanguage();
  const [units, setUnits] = useState<Unit[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [subjectsRes] = await Promise.all([
        apiFetch<Subject[]>("/api/admin/subjects"),
      ]);
      setSubjects(subjectsRes.data ?? []);

      // Build query params for units
      const params = new URLSearchParams();
      if (filterSubject) params.set("subjectId", filterSubject);
      if (filterLevel) params.set("levelId", filterLevel);
      const qs = params.toString();

      const [unitsRes, levelsRes] = await Promise.all([
        apiFetch<Unit[]>(`/api/admin/units${qs ? `?${qs}` : ""}`),
        apiFetch<Level[]>("/api/admin/levels"),
      ]);
      setUnits(unitsRes.data ?? []);
      setLevels(levelsRes.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filterSubject, filterLevel]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // Filter levels based on selected subject
  const filteredLevelOptions = form.subjectId
    ? levels.filter((l) => l.subjectId === form.subjectId)
    : [];

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function openEdit(u: Unit) {
    setForm({
      title: u.title,
      titleEn: u.titleEn || "",
      subjectId: u.subjectId,
      levelId: u.levelId,
      order: u.order,
      description: u.description || "",
      comingSoon: u.comingSoon,
      isPublished: u.isPublished,
      examEnabled: u.examEnabled,
    });
    setEditingId(u._id);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body = { ...form };
      if (editingId) {
        await apiFetch(`/api/admin/units/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/admin/units", {
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
      await apiFetch(`/api/admin/units/${deleteTarget}`, { method: "DELETE" });
      showToast(t('admin.unit_deleted'), "success");
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
      setDeleteTarget(null);
    }
  }

  async function togglePublish(unit: Unit) {
    try {
      await apiFetch(`/api/admin/units/${unit._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !unit.isPublished }),
      });
      await fetchData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function toggleExamEnabled(unit: Unit) {
    try {
      await apiFetch(`/api/admin/units/${unit._id}`, {
        method: "PATCH",
        body: JSON.stringify({ examEnabled: !unit.examEnabled }),
      });
      await fetchData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function getSubjectName(id: string): string {
    const s = subjects.find((s) => s._id === id);
    if (!s) return id;
    return lang === 'ar' ? (s.nameAr || s.name) : (s.nameEn || s.name);
  }

  function getLevelTitle(id: string): string {
    const l = levels.find((l) => l._id === id);
    return l ? l.title : id;
  }

  const filteredUnits = filterSubject
    ? units.filter((u) => u.subjectId === filterSubject)
    : units;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('admin.units')}</h2>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">{t('admin.units_desc')}</p>
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
            <FolderOpen className="w-5 h-5 text-primary" />
            {editingId ? t('admin.edit_unit') : t('admin.add_unit')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label={t('admin.title_ar')}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('admin.name_ar_placeholder')}
            />
            <Input
              label={t('admin.title_en')}
              value={form.titleEn}
              onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
              placeholder="e.g. Unit 1"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                {t('admin.subject')}
              </label>
              <select
                value={form.subjectId}
                onChange={(e) => {
                  setForm({ ...form, subjectId: e.target.value, levelId: "" });
                }}
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                disabled={!!editingId}
              >
                <option value="">{t('admin.select_subject')}</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {getSubjectName(s._id)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                {t('admin.level')}
              </label>
              <select
                value={form.levelId}
                onChange={(e) =>
                  setForm({ ...form, levelId: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                disabled={!!editingId}
              >
                <option value="">
                  {form.subjectId ? t('admin.select_level') : t('admin.select_level_first')}
                </option>
                {filteredLevelOptions.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t('admin.order')}
              type="number"
              value={String(form.order)}
              onChange={(e) =>
                setForm({ ...form, order: parseInt(e.target.value) || 0 })
              }
              placeholder={t('admin.order_placeholder')}
            />
            <Input
              label={t('admin.description')}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder={t('admin.description')}
            />
            <div className="flex flex-col gap-2 mt-8">
              <label className="flex items-center gap-2 text-text-secondary text-sm">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) =>
                    setForm({ ...form, isPublished: e.target.checked })
                  }
                  className="rounded border-border w-4 h-4 accent-primary"
                />
                {t('admin.publish')}
              </label>
              <label className="flex items-center gap-2 text-text-secondary text-sm">
                <input
                  type="checkbox"
                  checked={form.comingSoon}
                  onChange={(e) =>
                    setForm({ ...form, comingSoon: e.target.checked })
                  }
                  className="rounded border-border w-4 h-4 accent-primary"
                />
                {t('admin.coming_soon')}
              </label>
              <label className="flex items-center gap-2 text-text-secondary text-sm">
                <input
                  type="checkbox"
                  checked={form.examEnabled}
                  onChange={(e) =>
                    setForm({ ...form, examEnabled: e.target.checked })
                  }
                  className="rounded border-border w-4 h-4 accent-primary"
                />
                {t('admin.exam_enabled')}
              </label>
            </div>
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
          onClick={() => { setFilterSubject(""); setFilterLevel(""); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            !filterSubject && !filterLevel
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
            {getSubjectName(s._id)}
          </button>
        ))}
      </div>

      <Table headers={[t('admin.order'), t('admin.title_ar'), t('admin.level'), t('admin.status'), t('admin.exam_enabled'), t('admin.actions')]}>
        {filteredUnits.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12 text-text-muted">
              {t('admin.no_units')}
            </TableCell>
          </TableRow>
        ) : (
          filteredUnits.map((unit) => (
            <TableRow key={unit._id}>
              <TableCell>
                <span className="font-medium">{unit.order}</span>
              </TableCell>
              <TableCell>
                <span className="font-medium">{unit.title}</span>
              </TableCell>
              <TableCell className="text-text-muted text-sm">
                {getLevelTitle(unit.levelId)}
              </TableCell>
              <TableCell>
                <button
                  onClick={() => togglePublish(unit)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
                >
                  {unit.isPublished ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <Badge variant="success">{t('admin.published')}</Badge>
                    </>
                  ) : unit.comingSoon ? (
                    <Badge variant="warning">{t('admin.coming_soon')}</Badge>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <Badge variant="warning">{t('admin.not_published')}</Badge>
                    </>
                  )}
                </button>
              </TableCell>
              <TableCell>
                <button
                  onClick={() => toggleExamEnabled(unit)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:scale-105"
                >
                  {unit.examEnabled ? (
                    <ToggleRight className="w-5 h-5 text-success" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-text-muted" />
                  )}
                </button>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(unit)}
                    className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all duration-200 group"
                  >
                    <Edit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={() => handleDelete(unit._id)}
                    className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-all duration-200 group"
                  >
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
        <ConfirmDialog
          open={deleteTarget !== null}
          title={t('common.delete')}
          message={t('admin.delete_confirm_unit')}
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
