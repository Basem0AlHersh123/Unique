"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Trash2, ArrowDown, Ban, CheckCircle, Eye, EyeOff, Search } from "lucide-react";

interface Teacher {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  isActive?: boolean;
}

interface Subject {
  _id: string;
  name: string;
  teacherIds: string[];
}

export default function AdminTeachersPage() {
  const { t, lang } = useLanguage();
  const { showToast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showDeactivated, setShowDeactivated] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    Promise.all([
      apiFetch<Teacher[]>("/api/admin/teachers"),
      apiFetch<Student[]>("/api/admin/students"),
      apiFetch<Subject[]>("/api/admin/subjects"),
    ])
      .then(([tRes, sRes, subjRes]) => {
        setTeachers(tRes.data ?? []);
        setStudents(sRes.data ?? []);
        setSubjects(subjRes.data ?? []);
      })
      .catch(() => setMsg(t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function promoteToTeacher() {
    if (!selectedStudent) return;
    setMsg("");
    try {
      await apiFetch("/api/admin/teachers", {
        method: "PATCH",
        body: JSON.stringify({ userId: selectedStudent, role: "teacher" }),
      });
      setMsg(t('admin.teacher_promoted'));
      setSelectedStudent("");
      const updated = await apiFetch<Teacher[]>("/api/admin/teachers");
      setTeachers(updated.data ?? []);
    } catch {
      setMsg(t('common.error'));
    }
  }

  async function assignSubject() {
    if (!selectedTeacher || !selectedSubject) return;
    setMsg("");
    try {
      await apiFetch("/api/admin/teachers/assign-subject", {
        method: "POST",
        body: JSON.stringify({ teacherId: selectedTeacher, subjectId: selectedSubject }),
      });
      setMsg(t('admin.teacher_assigned'));
      const updated = await apiFetch<Subject[]>("/api/admin/subjects");
      setSubjects(updated.data ?? []);
    } catch {
      setMsg(t('common.error'));
    }
  }

  async function unassignSubject(teacherId: string, subjectId: string) {
    setMsg("");
    try {
      await apiFetch("/api/admin/teachers/assign-subject", {
        method: "DELETE",
        body: JSON.stringify({ teacherId, subjectId }),
      });
      setMsg(t('admin.teacher_unassigned'));
      const updated = await apiFetch<Subject[]>("/api/admin/subjects");
      setSubjects(updated.data ?? []);
    } catch {
      setMsg(t('common.error'));
    }
  }

  async function handleDowngrade(id: string) {
    setProcessing(id);
    try {
      await apiFetch(`/api/admin/teachers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "student" }),
      });
      showToast(t('admin.teacher_downgraded'), "success");
      const updated = await apiFetch<Teacher[]>("/api/admin/teachers");
      setTeachers(updated.data ?? []);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  async function handleToggleActive(teacher: Teacher) {
    setProcessing(teacher._id);
    const newActive = !teacher.isActive;
    try {
      await apiFetch("/api/admin/teachers", {
        method: "PATCH",
        body: JSON.stringify({ userId: teacher._id, isActive: newActive }),
      });
      showToast(
        newActive ? "تم إعادة تفعيل الحساب" : "تم تعطيل الحساب",
        "success"
      );
      const updated = await apiFetch<Teacher[]>("/api/admin/teachers");
      setTeachers(updated.data ?? []);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  async function handleDeleteTeacher(id: string) {
    setDeleteTarget(id);
  }

  async function confirmDeleteTeacher() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/admin/teachers/${deleteTarget}`, { method: "DELETE" });
      showToast(t('admin.teacher_deleted'), "success");
      setDeleteTarget(null);
      const updated = await apiFetch<Teacher[]>("/api/admin/teachers");
      setTeachers(updated.data ?? []);
    } catch (err) {
      showToast((err as Error).message, "error");
      setDeleteTarget(null);
    }
  }

  function getTeacherName(id: string) {
    return teachers.find((t) => t._id === id)?.name || id;
  }

  const displayTeachers = (showDeactivated ? teachers : teachers.filter((t) => t.isActive !== false))
    .filter((t) => {
      if (!teacherSearch) return true;
      const q = teacherSearch.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
    });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-8 w-48 rounded" />
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-text-primary">{t('admin.teachers')}</h1>

      {msg && (
        <div className="p-3 rounded-lg bg-success/10 border border-success/20 text-sm text-success">
          {msg}
        </div>
      )}

      {/* Existing teachers */}
      <section className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">{t('admin.current_teachers')}</h2>
          <button
            onClick={() => setShowDeactivated(!showDeactivated)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200 text-sm ${
              showDeactivated
                ? "bg-danger/10 border-danger/30 text-danger"
                : "bg-surface border-border text-text-muted hover:border-primary/30"
            }`}
          >
            {showDeactivated ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showDeactivated ? "الكل" : "النشطون فقط"}</span>
          </button>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث عن معلم بالاسم أو البريد..." : "Search teacher by name or email..."}
            className="w-full px-4 py-2 pr-10 rounded-xl bg-background border border-border text-text-primary text-sm outline-none focus:border-primary transition-all"
          />
        </div>
        {displayTeachers.length === 0 ? (
          <p className="text-text-muted text-sm">{t('admin.no_teachers')}</p>
        ) : (
          <div className="grid gap-3">
            {displayTeachers.map((teacher) => {
              const isDeactivated = teacher.isActive === false;
              return (
                <div key={teacher._id} className={`flex items-center justify-between p-3 rounded-xl bg-background border border-border ${isDeactivated ? "opacity-60" : ""}`}>
                  <div>
                    <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                      {teacher.name}
                      {isDeactivated && <Badge variant="danger">معطّل</Badge>}
                    </p>
                    <p className="text-xs text-text-muted">{teacher.email}</p>
                  </div>
                  <div className="flex gap-1">
                    {isDeactivated ? (
                      <button
                        onClick={() => handleToggleActive(teacher)}
                        disabled={processing === teacher._id}
                        className="p-2 rounded-lg text-teal hover:bg-teal/10 transition-all disabled:opacity-50"
                        title="إعادة تفعيل"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleActive(teacher)}
                          disabled={processing === teacher._id}
                          className="p-2 rounded-lg text-warning hover:bg-warning/10 transition-all disabled:opacity-50"
                          title="تعطيل"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDowngrade(teacher._id)}
                          disabled={processing === teacher._id}
                          className="p-2 rounded-lg text-warning hover:bg-warning/10 transition-all disabled:opacity-50"
                          title={t('admin.convert_to_student')}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher._id)}
                          className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-all"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Promote student */}
      <section className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">{t('admin.promote_student')}</h2>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">{t('admin.select_student')}</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">--</option>
              {students.filter((s) => s.isActive !== false).map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={promoteToTeacher}
            disabled={!selectedStudent}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {t('admin.promote_btn')}
          </button>
        </div>
      </section>

      {/* Assign subjects */}
      <section className="bg-surface rounded-2xl border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">{t('admin.assign_subjects')}</h2>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">{t('admin.select_teacher')}</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">--</option>
              {teachers.filter((t) => t.isActive !== false).map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">{t('admin.select_subject')}</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">--</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={assignSubject}
            disabled={!selectedTeacher || !selectedSubject}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {t('admin.assign_btn')}
          </button>
        </div>

        {subjects.filter((s) => s.teacherIds?.length > 0).length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-text-primary">{t('admin.current_assignments')}</h3>
            {subjects
              .filter((s) => s.teacherIds?.length > 0)
              .map((s) => (
                <div key={s._id} className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{s.name}</p>
                    <p className="text-xs text-text-muted">
                      {s.teacherIds.map((tid) => getTeacherName(tid)).join(", ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {s.teacherIds.map((tid) => (
                      <button
                        key={tid}
                        onClick={() => unassignSubject(tid, s._id)}
                        className="text-xs text-danger hover:text-danger/80 transition-colors"
                      >
                        {t('common.delete')} {getTeacherName(tid).split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('admin.delete_teacher_title')}
        message={t('admin.delete_teacher_msg')}
        confirmLabel={t('dialog.delete_confirm')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDeleteTeacher}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
