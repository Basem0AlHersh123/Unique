"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ColorInput } from "@/components/ui/ColorInput";
import { ImageTypeSelector } from "@/components/ui/ImageTypeSelector";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import { Search } from "lucide-react";

interface University {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
}

interface College {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  slug: string;
  comingSoon: boolean;
  isActive: boolean;
  icon: string;
  color: string;
  imageType: "icon" | "url" | "cloudinary";
  imageUrl?: string;
  universityId?: string;
}

interface FormData {
  name: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  comingSoon: boolean;
  isActive: boolean;
  icon: string;
  color: string;
  imageType: "icon" | "url" | "cloudinary";
  imageUrl: string;
  universityId: string;
}

const emptyForm: FormData = {
  name: "",
  nameAr: "",
  nameEn: "",
  slug: "",
  comingSoon: false,
  isActive: true,
  icon: "GraduationCap",
  color: "#6C63FF",
  imageType: "icon",
  imageUrl: "",
  universityId: "",
};

function hasArabic(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

function hasLatin(text: string) {
  return /[a-zA-Z]/.test(text);
}

export default function CollegesPage() {
  const { showToast } = useToast();
  const { t, lang } = useLanguage();
  const [colleges, setColleges] = useState<College[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [collegeSearch, setCollegeSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchColleges = useCallback(async () => {
    try {
      const [collegesRes, universitiesRes] = await Promise.all([
        apiFetch<College[]>("/api/admin/colleges"),
        apiFetch<University[]>("/api/admin/universities"),
      ]);
      setColleges(collegesRes.data ?? []);
      setUniversities(universitiesRes.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchColleges();
  }, [fetchColleges]);

  function resetForm() {
    setForm(emptyForm);
    setFormErrors({});
    setEditingId(null);
    setShowForm(false);
    setError(null);
  }

  function openEdit(c: College) {
    setForm({
      name: c.name,
      nameAr: c.nameAr || "",
      nameEn: c.nameEn || "",
      slug: c.slug,
      comingSoon: c.comingSoon,
      isActive: c.isActive,
      icon: c.icon,
      color: c.color,
      imageType: c.imageType || "icon",
      imageUrl: c.imageUrl || "",
      universityId: c.universityId || "",
    });
    setFormErrors({});
    setEditingId(c._id);
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
        await apiFetch(`/api/admin/colleges/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/admin/colleges", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      await fetchColleges();
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
      await apiFetch(`/api/admin/colleges/${deleteTarget}`, { method: "DELETE" });
      showToast(t('admin.college_deleted'), "success");
      setDeleteTarget(null);
      await fetchColleges();
    } catch (err) {
      showToast((err as Error).message, "error");
      setDeleteTarget(null);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-text-primary">{t('admin.colleges')}</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          {t('admin.add_college')}
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
            {editingId ? t('admin.edit_college') : t('admin.add_college')}
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
              placeholder="e.g. College of Computer"
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
              placeholder="computer-science"
              disabled={!!editingId}
            />
            <ColorInput
              label={t('admin.color')}
              value={form.color}
              onChange={(v) => setForm({ ...form, color: v })}
              placeholder="#6C63FF"
            />
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                {t('admin.university')}
              </label>
              <select
                value={form.universityId}
                onChange={(e) => setForm({ ...form, universityId: e.target.value })}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('admin.select_university')}</option>
                {universities.map((u) => (
                  <option key={u._id} value={u._id}>
                    {lang === 'ar' ? (u.nameAr || u.name) : (u.nameEn || u.name)}
                  </option>
                ))}
              </select>
            </div>
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
                checked={form.comingSoon}
                onChange={(e) =>
                  setForm({ ...form, comingSoon: e.target.checked })
                }
                className="rounded border-border"
              />
              {t('admin.coming_soon')}
            </label>

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

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={collegeSearch}
          onChange={(e) => setCollegeSearch(e.target.value)}
          placeholder={lang === "ar" ? "ابحث عن كلية..." : "Search colleges..."}
          className="w-full px-4 py-2 pr-10 rounded-xl bg-background border border-border text-text-primary text-sm outline-none focus:border-primary transition-all"
        />
      </div>
      <Table headers={[t('admin.name'), t('admin.slug'), t('admin.status'), t('admin.actions')]}>
        {colleges.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-12 text-text-muted">
              {t('admin.no_colleges')}
            </TableCell>
          </TableRow>
        ) : (
          colleges.filter((c) => {
            if (!collegeSearch) return true;
            const q = collegeSearch.toLowerCase();
            const name = (lang === "ar" ? c.nameAr || c.name : c.nameEn || c.name).toLowerCase();
            return name.includes(q) || c.slug.toLowerCase().includes(q);
          }).map((c) => (
            <TableRow key={c._id}>
              <TableCell>
                {lang === 'ar' ? (c.nameAr || c.name) : (c.nameEn || c.name)}
              </TableCell>
              <TableCell className="text-text-muted text-sm">{c.slug}</TableCell>
              <TableCell>
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant={c.isActive ? "success" : "danger"}>
                    {c.isActive ? t('admin.active') : t('admin.inactive')}
                  </Badge>
                  {c.comingSoon && (
                    <Badge variant="warning">{t('admin.coming_soon_label')}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(c)}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('admin.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(c._id)}
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
        message={t('admin.delete_confirm_college')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
