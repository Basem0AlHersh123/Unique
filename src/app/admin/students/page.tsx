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
import { Search, Users, Mail, Calendar, Shield, Trash2, ArrowUp, ArrowDown, Star } from "lucide-react";
import { useLanguage } from '@/lib/i18n/LanguageProvider';

interface Student {
  _id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  isVerified: boolean;
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
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<{ name: string; email: string } | null>(null);
  const [downgradeTarget, setDowngradeTarget] = useState<Student | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await apiFetch<Student[]>(`/api/admin/students${params}`);
      setStudents(res.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  async function handleDelete(id: string) {
    setDeleteTarget(id);
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
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.search_students')}
            className="w-full px-4 py-3 pr-10 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 placeholder:text-text-muted"
          />
        </div>
      </Card>

      <Table
        headers={[t('admin.student_name'), t('admin.email'), t('admin.role'), t('admin.activity'), t('admin.reg_date'), t('admin.actions')]}
      >
        {students.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12 text-text-muted">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              {t('admin.no_students')}
            </TableCell>
          </TableRow>
        ) : (
          students.map((s) => (
            <TableRow key={s._id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{s.name}</p>
                    <p className="text-xs text-text-muted">
                      {s.tier === "paid" ? t('admin.tier_paid') : t('admin.tier_free')}
                      {s.streak > 0 && ` · ${s.streak} ${t('admin.streak_days')}`}
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
                <Badge variant={s.role === "admin" ? "danger" : s.role === "teacher" ? "info" : "primary"}>
                  <Shield className="w-3 h-3 ml-1" />
                  {s.role === "admin" ? t('admin.admin_label') : s.role === "teacher" ? t('admin.teacher_label') : t('admin.student_label')}
                </Badge>
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
                  {s.role === "student" && (
                    <button
                      onClick={() => handleUpgrade(s._id, s.name, s.email)}
                      disabled={processing === s._id}
                      className="p-2 rounded-lg text-teal hover:bg-teal/10 transition-all"
                      title={t('admin.promote_to_teacher')}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  )}
                  {s.role === "teacher" && (
                    <button
                      onClick={() => setDowngradeTarget(s)}
                      disabled={processing === s._id}
                      className="p-2 rounded-lg text-warning hover:bg-warning/10 transition-all"
                      title={t('admin.convert_to_student')}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleTier(s._id, s.tier)}
                    disabled={processing === s._id}
                    className="p-2 rounded-lg text-warning hover:bg-warning/10 transition-all"
                    title={s.tier === "paid" ? t('admin.change_to_free') : t('admin.change_to_paid')}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s._id)}
                    className="p-2 rounded-lg text-danger hover:bg-danger/10 transition-all"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))
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

      <SuccessDialog
        open={upgradeSuccess !== null}
        title={t('admin.upgrade_success_title')}
        message={t('admin.upgrade_success_msg').replace('{name}', upgradeSuccess?.name ?? '')}
        details={`${t('admin.email')}: ${upgradeSuccess?.email}`}
        onClose={() => setUpgradeSuccess(null)}
      />
    </div>
  );
}
