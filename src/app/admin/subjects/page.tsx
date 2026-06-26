"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ImageTypeSelector } from "@/components/ui/ImageTypeSelector";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { Plus, Edit2, Trash2, BookOpen, Filter } from "lucide-react";

interface College {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
}

interface Subject {
  _id: string;
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  collegeId: string;
  isShared: boolean;
  imageType: "icon" | "url" | "cloudinary";
  imageUrl?: string;
  icon: string;
}

interface FormData {
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  collegeId: string;
  isShared: boolean;
  imageType: "icon" | "url" | "cloudinary";
  imageUrl: string;
  icon: string;
}

const emptyForm: FormData = {
  name: "",
  nameAr: "",
  nameEn: "",
  slug: "",
  collegeId: "",
  isShared: false,
  imageType: "icon",
  imageUrl: "",
  icon: "BookOpen",
};

function hasArabic(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function hasLatin(text: string) {
  return /[a-zA-Z]/.test(text);
}

export default function SubjectsPage() {
  const { showToast } = useToast();
  const { t, lang } = useLanguage();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterCollege, setFilterCollege] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [subjectsRes, collegesRes] = await Promise.all([
        apiFetch<Subject[]>("/api/admin/subjects"),
        apiFetch<College[]>("/api/admin/colleges"),
      ]);
      setSubjects(subjectsRes.data ?? []);
      setColleges(collegesRes.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  function resetForm() {
    setForm(emptyForm);
    setFormErrors({});
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function openEdit(s: Subject) {
    setForm({
      name: s.name,
      nameAr: s.nameAr || "",
      nameEn: s.nameEn || "",
      slug: s.slug,
      collegeId: s.collegeId,
      isShared: s.isShared,
      imageType: s.imageType || "icon",
      imageUrl: s.imageUrl || "",
      icon: s.icon || "BookOpen",
    });
    setFormErrors({});
    setEditingId(s._id);
    setShowForm(true);
  }

  async function handleSave() {
    const errors: Record<string, string> = {};
    if (form.nameAr && !hasArabic(form.nameAr)) {
      errors.nameAr = t('admin.name_ar_must_contain_arabic');
    }
    if (form.nameEn && !hasLatin(form.nameEn)) {
      errors.nameEn = "English name must contain Latin letters";
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        name: form.nameAr || form.nameEn || form.name || "untitled",
      };
      if (editingId) {
        await apiFetch(`/api/admin/subjects/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/subjects", {
          method: "POST",
          body: JSON.stringify(payload),
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
      await apiFetch(`/api/admin/subjects/${deleteTarget}`, { method: "DELETE" });
      showToast(t('admin.subject_deleted'), "success");
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
      setDeleteTarget(null);
    }
  }

  function getCollegeName(id: string): string {
    const c = colleges.find((c) => c._id === id);
    if (!c) return id;
    return lang === 'ar'
      ? (c.nameAr || c.name)
      : (c.nameEn || c.name);
  }

  const filteredSubjects = filterCollege
    ? subjects.filter((s) => s.collegeId === filterCollege)
    : subjects;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('admin.subjects')}</h2>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">{t('admin.subjects_desc')}</p>
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
            <BookOpen className="w-5 h-5 text-primary" />
            {editingId ? t('admin.edit_subject') : t('admin.add_subject')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label={t('admin.name_ar_label')}
              value={form.nameAr || form.name}
              onChange={(e) => {
                setForm({ ...form, nameAr: e.target.value });
                if (formErrors.nameAr) setFormErrors({ ...formErrors, nameAr: "" });
              }}
              placeholder={t('admin.name_en_placeholder')}
              error={formErrors.nameAr}
            />
            <Input
              label={t('admin.name_en_label')}
              value={form.nameEn}
              onChange={(e) => {
                setForm({ ...form, nameEn: e.target.value });
                if (formErrors.nameEn) setFormErrors({ ...formErrors, nameEn: "" });
              }}
              placeholder="e.g. Mathematics"
              error={formErrors.nameEn}
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
              placeholder="mathematics"
              disabled={!!editingId}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                {t('admin.college')}
              </label>
              <select
                value={form.collegeId}
                onChange={(e) =>
                  setForm({ ...form, collegeId: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
                disabled={!!editingId}
              >
                <option value="">{t('admin.select_college')}</option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    {lang === 'ar' ? (c.nameAr || c.name) : (c.nameEn || c.name)}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-text-secondary text-sm mt-8">
              <input
                type="checkbox"
                checked={form.isShared}
                onChange={(e) =>
                  setForm({ ...form, isShared: e.target.checked })
                }
                className="rounded border-border w-4 h-4 accent-primary"
              />
              {t('admin.shared_subject')}
            </label>
            <div className="md:col-span-2">
              <ImageTypeSelector
                imageType={form.imageType}
                imageUrl={form.imageUrl}
                icon={form.icon}
                onImageTypeChange={(v) => setForm({ ...form, imageType: v })}
                onImageUrlChange={(v) => setForm({ ...form, imageUrl: v })}
                onIconChange={(v) => setForm({ ...form, icon: v })}
              />
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
          onClick={() => setFilterCollege("")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            !filterCollege
              ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
              : "bg-surface text-text-secondary border border-border hover:border-primary/50"
          }`}
        >
          <Filter className="w-4 h-4" />
          {t('admin.all')}
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

      <Table headers={[t('admin.name'), t('admin.college'), t('admin.shared'), t('admin.actions')]}>
        {filteredSubjects.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-12 text-text-muted">
              {t('admin.no_subjects')}
            </TableCell>
          </TableRow>
        ) : (
          filteredSubjects.map((s) => (
            <TableRow key={s._id}>
              <TableCell className="font-medium">
                {lang === 'ar' ? (s.nameAr || s.name) : (s.nameEn || s.name)}
              </TableCell>
              <TableCell className="text-text-muted text-sm">
                {getCollegeName(s.collegeId)}
              </TableCell>
              <TableCell>
                {s.isShared ? (
                  <Badge variant="info" withPulse>
                    {t('admin.shared')}
                  </Badge>
                ) : (
                  <span className="text-text-muted text-sm">{t('admin.private')}</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-all duration-200 group"
                  >
                    <Edit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </button>
                  <button
                    onClick={() => handleDelete(s._id)}
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
          message={t('admin.delete_confirm_subject')}
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
