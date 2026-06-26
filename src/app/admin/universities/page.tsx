"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ImageTypeSelector } from "@/components/ui/ImageTypeSelector";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from '@/lib/i18n/LanguageProvider';

interface University {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  imageType: "icon" | "url" | "cloudinary";
  imageUrl?: string;
  icon: string;
  isActive: boolean;
  comingSoon: boolean;
}

interface FormData {
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  imageType: "icon" | "url" | "cloudinary";
  imageUrl: string;
  icon: string;
  isActive: boolean;
  comingSoon: boolean;
}

const emptyForm: FormData = {
  name: "",
  nameAr: "",
  nameEn: "",
  slug: "",
  imageType: "icon",
  imageUrl: "",
  icon: "GraduationCap",
  isActive: true,
  comingSoon: false,
};

function hasArabic(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function hasLatin(text: string) {
  return /[a-zA-Z]/.test(text);
}

export default function UniversitiesPage() {
  const { showToast } = useToast();
  const { t, lang } = useLanguage();
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchUniversities = useCallback(async () => {
    try {
      const res = await apiFetch<University[]>("/api/admin/universities");
      setUniversities(res.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUniversities();
  }, [fetchUniversities]);

  function resetForm() {
    setForm(emptyForm);
    setFormErrors({});
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function openEdit(u: University) {
    setForm({
      name: u.name,
      nameAr: u.nameAr || "",
      nameEn: u.nameEn || "",
      slug: u.slug,
      imageType: u.imageType || "icon",
      imageUrl: u.imageUrl || "",
      icon: u.icon || "GraduationCap",
      isActive: u.isActive,
      comingSoon: u.comingSoon,
    });
    setFormErrors({});
    setEditingId(u._id);
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
        await apiFetch(`/api/admin/universities/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/universities", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      await fetchUniversities();
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
      await apiFetch(`/api/admin/universities/${deleteTarget}`, { method: "DELETE" });
      showToast(t('admin.university_deleted'), "success");
      setDeleteTarget(null);
      await fetchUniversities();
    } catch (err) {
      showToast((err as Error).message, "error");
      setDeleteTarget(null);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">{t('admin.universities')}</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          {t('admin.add_university')}
        </Button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger rounded-lg px-4 py-3 text-danger text-sm mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            {editingId ? t('admin.edit_university') : t('admin.add_university')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label={t('admin.name_ar_label')}
              value={form.nameAr || form.name}
              onChange={(e) => {
                setForm({ ...form, nameAr: e.target.value });
                if (formErrors.nameAr) setFormErrors({ ...formErrors, nameAr: "" });
              }}
              placeholder={t('admin.name_ar_placeholder')}
              error={formErrors.nameAr}
            />
            <Input
              label={t('admin.name_en_label')}
              value={form.nameEn}
              onChange={(e) => {
                setForm({ ...form, nameEn: e.target.value });
                if (formErrors.nameEn) setFormErrors({ ...formErrors, nameEn: "" });
              }}
              placeholder="e.g. Cairo University"
              error={formErrors.nameEn}
            />
            <Input
              label={t('admin.slug') + ' (slug)'}
              value={form.slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  slug: e.target.value.replace(/\s+/g, "-").toLowerCase(),
                })
              }
              placeholder="cairo-university"
              disabled={!!editingId}
            />
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
            <label className="flex items-center gap-2 text-text-secondary text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
                className="rounded border-border"
              />
              {t('admin.active')}
            </label>
            <label className="flex items-center gap-2 text-text-secondary text-sm">
              <input
                type="checkbox"
                checked={form.comingSoon}
                onChange={(e) =>
                  setForm({ ...form, comingSoon: e.target.checked })
                }
                className="rounded border-border"
              />
              {t('admin.coming_soon')}
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
        </div>
      )}

      <Table headers={[t('admin.name'), t('admin.slug'), t('admin.status'), t('admin.actions')]}>
        {universities.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-12 text-text-muted">
              {t('admin.no_universities')}
            </TableCell>
          </TableRow>
        ) : (
          universities.map((u) => (
            <TableRow key={u._id}>
              <TableCell>
                {lang === 'ar' ? (u.nameAr || u.name) : (u.nameEn || u.name)}
              </TableCell>
              <TableCell className="text-text-muted text-sm">{u.slug}</TableCell>
              <TableCell>
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant={u.isActive ? "success" : "danger"}>
                    {u.isActive ? t('admin.active') : t('admin.inactive')}
                  </Badge>
                  {u.comingSoon && (
                    <Badge variant="warning">{t('admin.coming_soon_label')}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(u)}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('admin.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(u._id)}
                    className="text-sm text-danger hover:underline"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </Table>
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('common.delete')}
        message={t('admin.delete_confirm_university')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
