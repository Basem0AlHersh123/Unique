"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Table, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SuccessDialog } from "@/components/ui/SuccessDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  Search, Users, Mail, Calendar, Shield, Trash2, ArrowUp, ArrowDown, Star,
  Ban, CheckCircle, Eye, EyeOff,
} from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageProvider';

interface Student {
  _id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  isVerified: boolean;
  isActive: boolean;
  streak: number;
  lastActive: string;
  createdAt: string;
}

export default function StudentsPage() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<{ name: string; email: string } | null>(null);
  const [downgradeTarget, setDowngradeTarget] = useState<Student | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Student | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await apiFetch<Student[]>(`/api/admin/students${params}`);
      const all = res.data ?? [];
      setStudents(showDeactivated ? all : all.filter((s) => s.isActive !== false));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, showDeactivated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleUpgrade(id: string, name: string, email: string) {
    setProcessing(id);
    try {
      await apiFetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "teacher" }),
      });
      setUpgradeSuccess({ name, email });
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  async function handleToggleTier(id: string, current: string) {
    setProcessing(id);
    const newTier = current === "paid" ? "free" : "paid";
    try {
      await apiFetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ tier: newTier }),
      });
      showToast(newTier === "paid" ? t('admin.tier_changed_to_paid') : t('admin.tier_changed_to_free'), "success");
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  async function handleDowngrade(student: Student) {
    setProcessing(student._id);
    try {
      await apiFetch(`/api/admin/students/${student._id}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "student" }),
      });
      showToast(t('admin.converted_to_student'), "success");
      setDowngradeTarget(null);
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  async function handleToggleActive(student: Student) {
    setProcessing(student._id);
    const newActive = !student.isActive;
    try {
      await apiFetch(`/api/admin/students/${student._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newActive }),
      });
      showToast(
        newActive ? "تم إعادة تفعيل الحساب" : "تم تعطيل الحساب",
        "success"
      );
      setDeactivateTarget(null);
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setProcessing(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleteTarget(id);
  }

  async function handleResetPassword(student: Student) {
    setResetPasswordTarget(student);
    setNewPassword("");
    setResetError("");
  }

  async function confirmResetPassword() {
    if (!resetPasswordTarget) return;
    setProcessing(resetPasswordTarget._id);
    setResetError("");
    try {
      await apiFetch(`/api/admin/students/${resetPasswordTarget._id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });
      showToast(t('admin.password_reset_success'), "success");
      setResetPasswordTarget(null);
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setProcessing(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/admin/students/${deleteTarget}`, { method: "DELETE" });
      showToast(t('admin.student_deleted'), "success");
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      showToast((err as Error).message, "error");
      setDeleteTarget(null);
    }
  }

  if (loading) return <LoadingSkeleton />;

  const displayStudents = showDeactivated ? students : students.filter((s) => s.isActive !== false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{t('admin.students')}</h2>
          <p className="text-text-secondary mt-1 text-sm sm:text-base">
            {t('admin.student_list_desc')}
          </p>
        </div>
      </div>

      <Card withGlass className="p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.search_students')}
              className="w-full px-4 py-3 pr-10 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 placeholder:text-text-muted"
            />
          </div>
          <button
            onClick={() => setShowDeactivated(!showDeactivated)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
              showDeactivated
                ? "bg-danger/10 border-danger/30 text-danger"
                : "bg-surface border-border text-text-muted hover:border-primary/30"
            }`}
            title="إظهار الحسابات المعطلة"
          >
            {showDeactivated ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="text-sm hidden sm:inline">
              {showDeactivated ? "جميع الحسابات" : "النشطة فقط"}
            </span>
          </button>
        </div>
      </Card>

      <Table
        headers={[t('admin.student_name'), t('admin.email'), t('admin.role'), t('admin.activity'), t('admin.reg_date'), t('admin.actions')]}
      >
        {displayStudents.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12 text-text-muted">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              {t('admin.no_students')}
            </TableCell>
          </TableRow>
        ) : (
          displayStudents.map((s) => {
            const isDeactivated = s.isActive === false;
            return (
              <TableRow key={s._id} className={isDeactivated ? "opacity-60" : ""}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${isDeactivated ? "from-gray-400 to-gray-500" : "from-primary to-primary-dark"} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{s.name}</p>
                      <p className="text-xs text-text-muted">
                        {s.tier === "paid" ? t('admin.tier_paid') : t('admin.tier_free')}
                        {s.streak > 0 && ` · ${s.streak} ${t('admin.streak_days')}`}
                        {isDeactivated && " · معطّل"}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-text-muted" />
                    {s.email}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={s.role === "admin" ? "danger" : s.role === "teacher" ? "info" : "primary"}>
                      <Shield className="w-3 h-3 ml-1" />
                      {s.role === "admin" ? t('admin.admin_label') : s.role === "teacher" ? t('admin.teacher_label') : t('admin.student_label')}
                    </Badge>
                    {isDeactivated && (
                      <Badge variant="danger">معطّل</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-text-muted text-sm">
                  {new Date(s.lastActive).toLocaleDateString("ar-SA")}
                </TableCell>
                <TableCell className="text-text-muted text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(s.createdAt).toLocaleDateString("ar-SA")}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {s.role === "student" && !isDeactivated && (
                      <button
                        onClick={() => handleUpgrade(s._id, s.name, s.email)}
                        disabled={processing === s._id}
                        className="p-2 rounded-lg text-teal hover:bg-teal/10 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
                        title={t('admin.promote_to_teacher')}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                    )}
                    {s.role === "teacher" && !isDeactivated && (
                      <button
                        onClick={() => setDowngradeTarget(s)}
                        disabled={processing === s._id}
                        className="p-2 rounded-lg text-warning hover:bg-warning/10 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
                        title={t('admin.convert_to_student')}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleResetPassword(s)}
                      disabled={processing === s._id}
                      className="p-2 rounded-lg text-info hover:bg-info/10 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
                      title={t('admin.reset_password')}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleTier(s._id, s.tier)}
                      disabled={processing === s._id}
                      className={`p-2 rounded-lg hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50 ${
                        s.tier === "paid" ? "text-primary hover:bg-primary/10" : "text-text-muted hover:bg-surface-hover"
                      }`}
                      title={s.tier === "paid" ? t('admin.change_to_free') : t('admin.change_to_paid')}
                    >
                      <Star className={`w-4 h-4 ${s.tier === "paid" ? "fill-primary" : ""}`} />
                    </button>
                    {isDeactivated ? (
                      <button
                        onClick={() => handleToggleActive(s)}
                        disabled={processing === s._id}
                        className="p-2 rounded-lg text-teal hover:bg-teal/10 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
                        title="إعادة تفعيل"
                      >
                        {processing === s._id ? (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeactivateTarget(s)}
                        disabled={processing === s._id}
                        className="p-2 rounded-lg text-warning hover:bg-warning/10 hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-50"
                        title="تعطيل"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    {!isDeactivated && (
                      <button
                        onClick={() => handleDelete(s._id)}
                        className="p-2 rounded-lg text-danger hover:bg-danger/10 hover:scale-110 active:scale-95 transition-all duration-200"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </Table>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('admin.delete_student_title')}
        message={t('admin.delete_student_msg')}
        confirmLabel={t('dialog.delete_confirm')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={downgradeTarget !== null}
        title={t('admin.convert_to_student_confirm_title')}
        message={t('admin.convert_student_confirm_msg').replace('{name}', downgradeTarget?.name ?? '')}
        confirmLabel={t('dialog.convert_confirm')}
        cancelLabel={t('common.cancel')}
        variant="primary"
        onConfirm={() => downgradeTarget && handleDowngrade(downgradeTarget)}
        onCancel={() => setDowngradeTarget(null)}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        title="تعطيل الحساب"
        message={`هل أنت متأكد من تعطيل حساب ${deactivateTarget?.name}؟`}
        confirmLabel="تعطيل"
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => deactivateTarget && handleToggleActive(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
      />

      <SuccessDialog
        open={upgradeSuccess !== null}
        title={t('admin.upgrade_success_title')}
        message={t('admin.upgrade_success_msg').replace('{name}', upgradeSuccess?.name ?? '')}
        details={`${t('admin.email')}: ${upgradeSuccess?.email}`}
        onClose={() => setUpgradeSuccess(null)}
      />

      {resetPasswordTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setResetPasswordTarget(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-2">{t('admin.reset_password_title')}</h3>
            <p className="text-sm text-text-secondary mb-4">
              {t('admin.reset_password_for')} <strong>{resetPasswordTarget.name}</strong>
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setResetError(""); }}
              placeholder={t('admin.new_password_placeholder')}
              className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 placeholder:text-text-muted mb-3"
              autoFocus
            />
            {resetError && (
              <p className="text-sm text-danger mb-3 animate-slide-in-right">{resetError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setResetPasswordTarget(null)}
                className="flex-1 px-4 py-2 rounded-xl border-2 border-border text-text-secondary hover:bg-surface hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmResetPassword}
                disabled={!newPassword || processing === resetPasswordTarget._id}
                className="flex-1 px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                {processing === resetPasswordTarget._id ? "..." : t('dialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
