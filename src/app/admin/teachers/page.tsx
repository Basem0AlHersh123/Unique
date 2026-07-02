"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import {
  Trash2,
  ArrowDown,
  Ban,
  CheckCircle,
  Eye,
  EyeOff,
  Search,
  Users,
  UserPlus,
  BookOpen,
  GraduationCap,
  Sparkles,
} from "lucide-react";

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
      .catch(() => setMsg(t("common.error")))
      .finally(() => setLoading(false));
  }, [t]);

  async function promoteToTeacher() {
    if (!selectedStudent) return;
    setMsg("");
    try {
      await apiFetch("/api/admin/teachers", {
        method: "PATCH",
        body: JSON.stringify({ userId: selectedStudent, role: "teacher" }),
      });
      setMsg(t("admin.teacher_promoted"));
      setSelectedStudent("");
      const updated = await apiFetch<Teacher[]>("/api/admin/teachers");
      setTeachers(updated.data ?? []);
    } catch {
      setMsg(t("common.error"));
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
      setMsg(t("admin.teacher_assigned"));
      const updated = await apiFetch<Subject[]>("/api/admin/subjects");
      setSubjects(updated.data ?? []);
    } catch {
      setMsg(t("common.error"));
    }
  }

  async function unassignSubject(teacherId: string, subjectId: string) {
    setMsg("");
    try {
      await apiFetch("/api/admin/teachers/assign-subject", {
        method: "DELETE",
        body: JSON.stringify({ teacherId, subjectId }),
      });
      setMsg(t("admin.teacher_unassigned"));
      const updated = await apiFetch<Subject[]>("/api/admin/subjects");
      setSubjects(updated.data ?? []);
    } catch {
      setMsg(t("common.error"));
    }
  }

  async function handleDowngrade(id: string) {
    setProcessing(id);
    try {
      await apiFetch(`/api/admin/teachers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "student" }),
      });
      showToast(t("admin.teacher_downgraded"), "success");
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
        newActive
          ? lang === "ar"
            ? "تم إعادة تفعيل الحساب"
            : "Account reactivated"
          : lang === "ar"
          ? "تم تعليق الحساب"
          : "Account suspended",
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
      showToast(t("admin.teacher_deleted"), "success");
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

  const displayTeachers = (showDeactivated
    ? teachers
    : teachers.filter((t) => t.isActive !== false)
  ).filter((t) => {
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 slide-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            {t("admin.teachers")}
          </h1>
          <p className="text-text-secondary text-sm">
            {lang === "ar"
              ? "إدارة المعلمين وتعيين المواد"
              : "Manage teachers and subject assignments"}
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-sm text-success animate-slide-in-right">
          {msg}
        </div>
      )}

      {/* Existing teachers - Enhanced */}
      <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-2xl p-6 space-y-4 slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {t("admin.current_teachers")}
          </h2>
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
            placeholder={lang === "ar" ? "ابحث عن معلم..." : "Search teachers..."}
            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-background border-2 border-border text-text-primary text-sm outline-none focus:border-primary transition-all"
          />
        </div>

        {displayTeachers.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">
            {t("admin.no_teachers")}
          </p>
        ) : (
          <div className="grid gap-3">
            {displayTeachers.map((teacher, i) => {
              const isDeactivated = teacher.isActive === false;
              return (
                <div
                  key={teacher._id}
                  className={`flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border hover:border-primary/20 transition-all slide-up ${
                    isDeactivated ? "opacity-60" : ""
                  }`}
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                        isDeactivated
                          ? "from-gray-400 to-gray-500"
                          : "from-primary to-secondary"
                      } flex items-center justify-center text-white text-sm font-bold shrink-0`}
                    >
                      {teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                        {teacher.name}
                        {isDeactivated && (
                          <Badge variant="danger">
                            {lang === "ar" ? "معلّق" : "Suspended"}
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {teacher.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {isDeactivated ? (
                      <button
                        onClick={() => handleToggleActive(teacher)}
                        disabled={processing === teacher._id}
                        className="p-2 rounded-lg text-teal hover:bg-teal/10 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
                        title={lang === "ar" ? "إعادة تفعيل" : "Reactivate"}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleToggleActive(teacher)}
                          disabled={processing === teacher._id}
                          className="p-2 rounded-lg text-warning hover:bg-warning/10 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
                          title={lang === "ar" ? "تعليق" : "Suspend"}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDowngrade(teacher._id)}
                          disabled={processing === teacher._id}
                          className="p-2 rounded-lg text-warning hover:bg-warning/10 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
                          title={t("admin.convert_to_student")}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(teacher._id)}
                          className="p-2 rounded-lg text-danger hover:bg-danger/10 hover:scale-110 active:scale-95 transition-all duration-200"
                          title={t("common.delete")}
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
      </div>

      {/* Promote student - Enhanced */}
      <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-2xl p-6 space-y-4 slide-up">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-secondary" />
          {t("admin.promote_student")}
        </h2>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">
              {t("admin.select_student")}
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-background border-2 border-border text-text-primary text-sm focus:outline-none focus:border-primary transition-all"
            >
              <option value="">--</option>
              {students
                .filter((s) => s.isActive !== false)
                .map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.email})
                  </option>
                ))}
            </select>
          </div>
          <Button
            onClick={promoteToTeacher}
            disabled={!selectedStudent}
            className="hover:scale-105 transition-all duration-300"
          >
            {t("admin.promote_btn")}
          </Button>
        </div>
      </div>

      {/* Assign subjects - Enhanced */}
      <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-2xl p-6 space-y-4 slide-up">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" />
          {t("admin.assign_subjects")}
        </h2>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">
              {t("admin.select_teacher")}
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-background border-2 border-border text-text-primary text-sm focus:outline-none focus:border-primary transition-all"
            >
              <option value="">--</option>
              {teachers
                .filter((t) => t.isActive !== false)
                .map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-text-muted mb-1">
              {t("admin.select_subject")}
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-background border-2 border-border text-text-primary text-sm focus:outline-none focus:border-primary transition-all"
            >
              <option value="">--</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={assignSubject}
            disabled={!selectedTeacher || !selectedSubject}
            className="hover:scale-105 transition-all duration-300"
          >
            {t("admin.assign_btn")}
          </Button>
        </div>

        {subjects.filter((s) => s.teacherIds?.length > 0).length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-text-primary">
              {t("admin.current_assignments")}
            </h3>
            {subjects
              .filter((s) => s.teacherIds?.length > 0)
              .map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border hover:border-primary/20 transition-all"
                >
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
                        className="text-xs text-danger hover:text-danger/80 hover:bg-danger/10 px-2 py-1 rounded-lg transition-colors"
                      >
                        {lang === "ar" ? "إزالة" : "Remove"}{" "}
                        {getTeacherName(tid).split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("admin.delete_teacher_title")}
        message={t("admin.delete_teacher_msg")}
        confirmLabel={t("dialog.delete_confirm")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onConfirm={confirmDeleteTeacher}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}