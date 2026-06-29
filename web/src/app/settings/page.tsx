"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Save, User, Lock, Trash2, Building2 } from "lucide-react";
import { getAuthOrRefresh } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  universityId?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [user, setUser] = useState<{ name: string; email: string; role: string; createdAt: string; collegeId?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  const [universities, setUniversities] = useState<University[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [savingCollege, setSavingCollege] = useState(false);
  const [collegeMsg, setCollegeMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) { router.push("/auth/login"); return; }
      if (cancelled) return;
      try {
        const [profileRes, unisRes, colsRes] = await Promise.all([
          apiFetch<{ name: string; email: string; role: string; createdAt: string; collegeId?: string }>("/api/auth/profile"),
          apiFetch<University[]>("/api/admin/universities"),
          apiFetch<College[]>("/api/admin/colleges"),
        ]);
        if (profileRes.data) {
          setUser(profileRes.data);
          setName(profileRes.data.name);
          if (profileRes.data.collegeId) setSelectedCollegeId(profileRes.data.collegeId);
        }
        setUniversities(unisRes.data ?? []);
        setColleges(colsRes.data ?? []);
      } catch {
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg("");
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }) as any;
      if (res.accessToken) {
        localStorage.setItem("accessToken", res.accessToken);
      }
      setNameMsg(t('settings.saved'));
    } catch {
      setNameMsg(t('common.error'));
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg("");
    if (newPassword !== confirmPassword) {
      setPasswordMsg(t('settings.password_mismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg(t('settings.password_success'));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { error?: string } } };
      setPasswordMsg(apiErr?.response?.data?.error || t('common.error'));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSaveCollege() {
    setSavingCollege(true);
    setCollegeMsg("");
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ collegeId: selectedCollegeId || undefined }),
      });
      if (res.success) {
        setCollegeMsg(t('settings.saved'));
      }
    } catch {
      setCollegeMsg(t('common.error'));
    } finally {
      setSavingCollege(false);
    }
  }

  function getCollegeName(c: College) {
    return lang === "ar" ? (c.nameAr || c.name) : (c.nameEn || c.name);
  }

  function getUniversityName(u: University) {
    return lang === "ar" ? (u.nameAr || u.name) : (u.nameEn || u.name);
  }

  const selectedCollege = colleges.find((c) => c._id === selectedCollegeId);
  const selectedUniId = selectedCollege?.universityId;
  const filteredColleges = selectedUniId
    ? colleges.filter((c) => c.universityId === selectedUniId)
    : colleges;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="shimmer w-48 h-6 rounded" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-text-primary">{t('settings.title')}</h1>

        {/* Profile info */}
        <section className="bg-surface rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {t('settings.profile')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">{t('auth.register.email')}:</span>
              <p className="text-text-primary font-medium">{user.email}</p>
            </div>
            <div>
              <span className="text-text-muted">{t('settings.role')}:</span>
              <p className="text-text-primary font-medium capitalize">{user.role}</p>
            </div>
            <div>
              <span className="text-text-muted">{t('settings.member_since')}:</span>
              <p className="text-text-primary font-medium">{new Date(user.createdAt).toLocaleDateString("ar-SA")}</p>
            </div>
          </div>
          <form onSubmit={handleSaveName} className="flex items-end gap-4 pt-2 border-t border-border">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">{t('auth.register.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>
            <button
              type="submit"
              disabled={savingName}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {savingName ? t('common.loading') : t('settings.save')}
            </button>
          </form>
          {nameMsg && <p className="text-xs text-success">{nameMsg}</p>}
        </section>

        {/* College / University */}
        <section className="bg-surface rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {"الكلية والجامعة"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">الجامعة</span>
              <select
                value={selectedUniId || ""}
                onChange={(e) => {
                  const uniId = e.target.value;
                  const firstCollege = colleges.find((c) => c.universityId === uniId);
                  setSelectedCollegeId(firstCollege?._id || "");
                }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 mt-1"
              >
                <option value="">-- اختر الجامعة --</option>
                {universities.map((u) => (
                  <option key={u._id} value={u._id}>
                    {getUniversityName(u)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-text-muted">الكلية</span>
              <select
                value={selectedCollegeId}
                onChange={(e) => setSelectedCollegeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 mt-1"
              >
                <option value="">-- اختر الكلية --</option>
                {(selectedUniId ? filteredColleges : colleges).map((c) => (
                  <option key={c._id} value={c._id}>
                    {getCollegeName(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end gap-4 pt-2">
            <button
              onClick={handleSaveCollege}
              disabled={savingCollege || selectedCollegeId === user.collegeId}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {savingCollege ? t('common.loading') : t('settings.save')}
            </button>
          </div>
          {collegeMsg && <p className="text-xs text-success">{collegeMsg}</p>}
        </section>

        {/* Change password */}
        <section className="bg-surface rounded-2xl border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            {t('settings.password')}
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs text-text-muted mb-1">{t('settings.current_password')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">{t('settings.new_password')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">{t('settings.confirm_password')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {savingPassword ? t('common.loading') : t('settings.change_password')}
            </button>
            {passwordMsg && <p className={`text-xs ${passwordMsg.includes("خطأ") || passwordMsg.includes("error") || passwordMsg.includes("صحيحة") ? "text-danger" : "text-success"}`}>{passwordMsg}</p>}
          </form>
        </section>

        {/* Deactivate account */}
        <section className="bg-surface rounded-2xl border border-danger/20 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 text-danger">
            <Trash2 className="w-5 h-5" />
            {t('settings.deactivate_title')}
          </h2>
          <p className="text-sm text-text-secondary">
            {t('settings.deactivate_desc')}
          </p>
          <button
            onClick={() => setShowDeactivateConfirm(true)}
            className="px-4 py-2 rounded-lg bg-danger/10 text-danger text-sm font-medium hover:bg-danger/20 transition-colors"
          >
            {t('settings.deactivate_button')}
          </button>
        </section>
      </main>

      <ConfirmDialog
        open={showDeactivateConfirm}
        title={t('settings.deactivate_confirm_title')}
        message={t('settings.deactivate_confirm_msg')}
        confirmLabel={t('settings.deactivate_confirm')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={async () => {
          try {
            await apiFetch("/api/auth/deactivate", { method: "POST" });
            localStorage.removeItem("accessToken");
            router.push("/auth/login");
          } catch {
            setShowDeactivateConfirm(false);
          }
        }}
        onCancel={() => setShowDeactivateConfirm(false)}
      />
    </div>
  );
}
