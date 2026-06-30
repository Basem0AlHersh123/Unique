"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getAuthOrRefresh, clearAuth } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import {
  Camera, Save, Lock, Trash2, Building2, CheckCircle,
  AlertCircle, User, Eye, EyeOff, Mail, Calendar, Shield,
  ChevronLeft,
} from "lucide-react";

interface College { _id: string; nameAr?: string; nameEn?: string; name?: string; universityId?: string; }
interface University { _id: string; nameAr?: string; nameEn?: string; name?: string; }

function StatusMsg({ msg, type }: { msg: string; type: "success" | "error" }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 text-sm mt-3 p-3 rounded-xl ${type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
      {type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [user, setUser] = useState<{ name:string; email:string; role:string; createdAt:string; collegeId?:string; profileImage?:string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [profileImage, setProfileImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ text:string; type:"success"|"error" } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text:string; type:"success"|"error" } | null>(null);

  const [universities, setUniversities] = useState<University[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [savingCollege, setSavingCollege] = useState(false);
  const [collegeMsg, setCollegeMsg] = useState<{ text:string; type:"success"|"error" } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getAuthOrRefresh();
      if (!u) { router.push("/auth/login"); return; }
      try {
        const [profileRes, unisRes, colsRes] = await Promise.all([
          apiFetch<{ name:string; email:string; role:string; createdAt:string; collegeId?:string; profileImage?:string }>("/api/auth/profile"),
          apiFetch<University[]>("/api/admin/universities"),
          apiFetch<College[]>("/api/admin/colleges"),
        ]);
        if (profileRes.data) {
          setUser(profileRes.data);
          setName(profileRes.data.name);
          if (profileRes.data.profileImage) setProfileImage(profileRes.data.profileImage);
          if (profileRes.data.collegeId) {
            setSelectedCollegeId(profileRes.data.collegeId);
            const col = colsRes.data?.find(c => c._id === profileRes.data!.collegeId);
            if (col?.universityId) setSelectedUniversityId(col.universityId);
          }
        }
        setUniversities(unisRes.data ?? []);
        setColleges(colsRes.data ?? []);
      } catch { router.push("/auth/login"); }
      finally { setLoading(false); }
    })();
  }, [router]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert(lang === "ar" ? "يرجى اختيار صورة" : "Please select an image"); return; }
    if (file.size > 5 * 1024 * 1024) { alert(lang === "ar" ? "الصورة أكبر من 5MB" : "Image must be under 5MB"); return; }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch<{ url: string }>("/api/admin/upload", {
        method: "POST", body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.success && res.data?.url) {
        const url = res.data.url;
        setProfileImage(url);
        await apiFetch("/api/auth/profile", { method:"PATCH", body: JSON.stringify({ profileImage: url }) });
      }
    } catch { alert(lang === "ar" ? "فشل رفع الصورة" : "Upload failed"); }
    finally { setUploadingImage(false); }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    setNameMsg(null);
    try {
      await apiFetch("/api/auth/profile", { method:"PATCH", body: JSON.stringify({ name:name.trim() }) });
      setNameMsg({ text: lang === "ar" ? "تم حفظ الاسم بنجاح" : "Name saved successfully", type:"success" });
    } catch (e) {
      setNameMsg({ text: e instanceof Error ? e.message : "حدث خطأ", type:"error" });
    } finally { setSavingName(false); }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords do not match", type:"error" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ text: lang === "ar" ? "كلمة المرور قصيرة جداً" : "Password too short", type:"error" });
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch("/api/auth/change-password", { method:"POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setPasswordMsg({ text: lang === "ar" ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully", type:"success" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e) {
      setPasswordMsg({ text: e instanceof Error ? e.message : "حدث خطأ", type:"error" });
    } finally { setSavingPassword(false); }
  }

  async function handleSaveCollege(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCollegeId) return;
    setSavingCollege(true);
    setCollegeMsg(null);
    try {
      await apiFetch("/api/auth/profile", { method:"PATCH", body: JSON.stringify({ collegeId: selectedCollegeId }) });
      setCollegeMsg({ text: lang === "ar" ? "تم حفظ الكلية بنجاح" : "College saved", type:"success" });
    } catch (e) {
      setCollegeMsg({ text: e instanceof Error ? e.message : "حدث خطأ", type:"error" });
    } finally { setSavingCollege(false); }
  }

  async function handleDeleteAccount() {
    try {
      await apiFetch("/api/auth/delete-account", { method:"DELETE" });
      clearAuth();
      router.push("/");
    } catch { alert(lang === "ar" ? "حدث خطأ في حذف الحساب" : "Error deleting account"); }
  }

  const filteredColleges = selectedUniversityId
    ? colleges.filter(c => c.universityId === selectedUniversityId)
    : colleges;

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "U";
  const roleLabel = user?.role === "admin" ? (lang === "ar" ? "مدير" : "Admin")
    : user?.role === "teacher" ? (lang === "ar" ? "مدرس" : "Teacher")
    : (lang === "ar" ? "طالب" : "Student");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
        </div>

        <main className="relative max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="text-center sm:text-right">
            <h1 className="text-3xl font-bold text-text-primary">
              {lang === "ar" ? "إعدادات الحساب" : "Account Settings"}
            </h1>
            <p className="text-text-muted text-sm mt-1">
              {lang === "ar" ? "إدارة ملفك الشخصي وبياناتك" : "Manage your profile and account data"}
            </p>
          </div>

          <div className="glass rounded-3xl p-8 border border-border/50 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-br from-primary to-secondary rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  {profileImage ? (
                    <Image src={profileImage} alt="Profile" width={112} height={112}
                      className="w-28 h-28 rounded-full object-cover border-4 border-white/20 shadow-xl" />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 border-4 border-white/20 shadow-xl flex items-center justify-center">
                      <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary">{initial}</span>
                    </div>
                  )}
                  <button onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="absolute bottom-1 right-1 w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center border-2 border-background shadow-lg hover:scale-110 transition-all disabled:opacity-50">
                    {uploadingImage
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Camera className="w-4 h-4 text-white" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
              </div>
              <div className="text-center sm:text-right flex-1 space-y-2">
                <h2 className="text-xl font-bold text-text-primary">{user?.name}</h2>
                <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-text-muted">
                  <Mail className="w-3.5 h-3.5" />
                  {user?.email}
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                    <Shield className="w-3 h-3" />
                    {roleLabel}
                  </span>
                  {user?.createdAt && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-surface border border-border text-text-muted">
                      <Calendar className="w-3 h-3" />
                      {lang === "ar" ? "منذ " : "Since "}{new Date(user.createdAt).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl border border-border/50 shadow-xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-text-primary">
                {lang === "ar" ? "الاسم" : "Display Name"}
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveName} className="space-y-4">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-background/60 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                />
                {nameMsg && <StatusMsg msg={nameMsg.text} type={nameMsg.type} />}
                <div className="flex justify-end">
                  <button type="submit" disabled={savingName || !name.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    {savingName ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ الاسم" : "Save Name")}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="glass rounded-3xl border border-border/50 shadow-xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50 bg-gradient-to-r from-yellow-500/5 to-transparent">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-500/10">
                <Lock className="w-5 h-5 text-yellow-400" />
              </div>
              <h2 className="text-lg font-bold text-text-primary">
                {lang === "ar" ? "كلمة المرور" : "Password"}
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSavePassword} className="space-y-5">
                {[
                  { label: lang === "ar" ? "كلمة المرور الحالية" : "Current Password", val: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
                  { label: lang === "ar" ? "كلمة المرور الجديدة" : "New Password", val: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v), showStrength: true },
                  { label: lang === "ar" ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password", val: confirmPassword, set: setConfirmPassword, show: false, toggle: () => {} },
                ].map((field, i) => (
                  <div key={i}>
                    <label className="block text-sm text-text-secondary mb-1.5 font-medium">{field.label}</label>
                    <div className="relative">
                      <input
                        type={field.show ? "text" : "password"}
                        value={field.val}
                        onChange={e => field.set(e.target.value)}
                        className="w-full bg-background/60 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-all pr-11"
                        dir="ltr"
                      />
                      {i < 2 && (
                        <button type="button" onClick={field.toggle}
                          className="absolute top-1/2 -translate-y-1/2 left-3 text-text-muted hover:text-text-primary transition-colors">
                          {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    {field.showStrength && <PasswordStrength password={field.val} />}
                  </div>
                ))}
                {passwordMsg && <StatusMsg msg={passwordMsg.text} type={passwordMsg.type} />}
                <div className="flex justify-end">
                  <button type="submit" disabled={savingPassword}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-yellow-500/20 transition-all disabled:opacity-50">
                    <Lock className="w-4 h-4" />
                    {savingPassword ? (lang === "ar" ? "جاري التغيير..." : "Changing...") : (lang === "ar" ? "تغيير كلمة المرور" : "Change Password")}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="glass rounded-3xl border border-border/50 shadow-xl overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50 bg-gradient-to-r from-emerald-500/5 to-transparent">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-text-primary">
                {lang === "ar" ? "الجامعة والكلية" : "University & College"}
              </h2>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveCollege} className="space-y-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                    {lang === "ar" ? "الجامعة" : "University"}
                  </label>
                  <select value={selectedUniversityId} onChange={e => { setSelectedUniversityId(e.target.value); setSelectedCollegeId(""); }}
                    className="w-full bg-background/60 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 transition-all appearance-none"
                    dir={lang === "ar" ? "rtl" : "ltr"}>
                    <option value="">{lang === "ar" ? "— اختر الجامعة —" : "— Select University —"}</option>
                    {universities.map(u => <option key={u._id} value={u._id}>{lang === "ar" ? u.nameAr : u.nameEn || u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5 font-medium">
                    {lang === "ar" ? "الكلية" : "College"}
                  </label>
                  <select value={selectedCollegeId} onChange={e => setSelectedCollegeId(e.target.value)}
                    className="w-full bg-background/60 backdrop-blur-sm border border-border/50 rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 transition-all appearance-none"
                    dir={lang === "ar" ? "rtl" : "ltr"}>
                    <option value="">{lang === "ar" ? "— اختر الكلية —" : "— Select College —"}</option>
                    {filteredColleges.map(c => <option key={c._id} value={c._id}>{lang === "ar" ? c.nameAr : c.nameEn || c.name}</option>)}
                  </select>
                </div>
                {collegeMsg && <StatusMsg msg={collegeMsg.text} type={collegeMsg.type} />}
                <div className="flex justify-end">
                  <button type="submit" disabled={savingCollege || !selectedCollegeId}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    {savingCollege ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ" : "Save")}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-500/[0.02] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-red-500/10 shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-red-400">
                  {lang === "ar" ? "منطقة الخطر" : "Danger Zone"}
                </h2>
                <p className="text-sm text-text-muted mt-1 mb-4 leading-relaxed">
                  {lang === "ar"
                    ? "حذف حسابك سيزيل جميع بياناتك نهائياً ولا يمكن التراجع عن هذا الإجراء."
                    : "Deleting your account will permanently remove all your data. This action cannot be undone."}
                </p>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all">
                  <Trash2 className="w-4 h-4" />
                  {lang === "ar" ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
                </button>
              </div>
            </div>
          </div>

          <ConfirmDialog
            open={showDeleteConfirm}
            title={lang === "ar" ? "حذف الحساب" : "Delete Account"}
            message={lang === "ar" ? "هل أنت متأكد تماماً؟ لا يمكن التراجع عن هذا الإجراء وستفقد جميع بياناتك." : "Are you absolutely sure? This cannot be undone and you will lose all your data."}
            confirmLabel={lang === "ar" ? "نعم، احذف حسابي" : "Yes, delete my account"}
            onConfirm={handleDeleteAccount}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </main>
      </div>
    </div>
  );
}
