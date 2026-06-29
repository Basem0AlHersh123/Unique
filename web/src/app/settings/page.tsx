"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getAuthOrRefresh, clearAuth } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Camera, Save, Lock, Trash2, Building2, CheckCircle,
  AlertCircle, User, Eye, EyeOff,
} from "lucide-react";

interface College { _id: string; nameAr?: string; nameEn?: string; name?: string; universityId?: string; }
interface University { _id: string; nameAr?: string; nameEn?: string; name?: string; }

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 أحرف على الأقل", en: "At least 8 characters", ok: password.length >= 8 },
    { label: "حرف كبير", en: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "رقم", en: "Number", ok: /[0-9]/.test(password) },
    { label: "رمز خاص", en: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["bg-red-500","bg-orange-500","bg-yellow-500","bg-green-500"];
  const labels = ["ضعيفة","مقبولة","جيدة","قوية"];
  const labelsEn = ["Weak","Fair","Good","Strong"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score-1] : "bg-border"}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${score >= 3 ? "text-green-400" : score >= 2 ? "text-yellow-400" : "text-red-400"}`}>
        {score > 0 ? (document.documentElement.lang === "ar" ? labels[score-1] : labelsEn[score-1]) : ""}
      </p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<any>; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <div className="p-2 rounded-lg bg-primary/10"><Icon className="w-4 h-4 text-primary" /></div>
        <h2 className="text-base font-bold text-text-primary">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StatusMsg({ msg, type }: { msg: string; type: "success" | "error" }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 text-sm mt-3 p-3 rounded-lg ${type === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
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

  // Profile image
  const [profileImage, setProfileImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Name
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ text:string; type:"success"|"error" } | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text:string; type:"success"|"error" } | null>(null);

  // College
  const [universities, setUniversities] = useState<University[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [savingCollege, setSavingCollege] = useState(false);
  const [collegeMsg, setCollegeMsg] = useState<{ text:string; type:"success"|"error" } | null>(null);

  // Delete account
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
        method: "POST", body: formData as any,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.success && res.data?.url) {
        const url = res.data.url;
        setProfileImage(url);
        await apiFetch("/api/auth/profile", { method:"PATCH", body:{ profileImage: url } });
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
      await apiFetch("/api/auth/profile", { method:"PATCH", body:{ name:name.trim() } });
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
      await apiFetch("/api/auth/change-password", { method:"POST", body:{ currentPassword, newPassword } });
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
      await apiFetch("/api/auth/profile", { method:"PATCH", body:{ collegeId: selectedCollegeId } });
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
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {lang === "ar" ? "إعدادات الحساب" : "Account Settings"}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {lang === "ar" ? "إدارة ملفك الشخصي وبياناتك" : "Manage your profile and account data"}
          </p>
        </div>

        {/* Profile Image */}
        <SectionCard title={lang === "ar" ? "الصورة الشخصية" : "Profile Photo"} icon={Camera}>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              {profileImage ? (
                <Image src={profileImage} alt="Profile" width={96} height={96}
                  className="w-24 h-24 rounded-full object-cover border-2 border-primary" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary">{initial}</span>
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background hover:bg-primary/80 transition-colors disabled:opacity-50">
                {uploadingImage
                  ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-3.5 h-3.5 text-white" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
            <div className="text-center sm:text-right">
              <p className="text-sm text-text-secondary">
                {lang === "ar" ? "انقر على أيقونة الكاميرا لتغيير الصورة" : "Click the camera icon to change your photo"}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {lang === "ar" ? "الحد الأقصى 5MB — JPG، PNG، WebP" : "Max 5MB — JPG, PNG, WebP"}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Name */}
        <SectionCard title={lang === "ar" ? "الاسم" : "Display Name"} icon={User}>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                {lang === "ar" ? "الاسم الكامل" : "Full Name"}
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors"
                dir="rtl"
              />
            </div>
            <p className="text-xs text-text-muted">
              {lang === "ar" ? `البريد الإلكتروني: ${user?.email}` : `Email: ${user?.email}`}
            </p>
            {nameMsg && <StatusMsg msg={nameMsg.text} type={nameMsg.type} />}
            <button type="submit" disabled={savingName || !name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/80 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />
              {savingName ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ الاسم" : "Save Name")}
            </button>
          </form>
        </SectionCard>

        {/* Password */}
        <SectionCard title={lang === "ar" ? "كلمة المرور" : "Password"} icon={Lock}>
          <form onSubmit={handleSavePassword} className="space-y-4">
            {[
              { label: lang === "ar" ? "كلمة المرور الحالية" : "Current Password", val: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
              { label: lang === "ar" ? "كلمة المرور الجديدة" : "New Password", val: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v), showStrength: true },
              { label: lang === "ar" ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password", val: confirmPassword, set: setConfirmPassword, show: false, toggle: () => {} },
            ].map((field, i) => (
              <div key={i}>
                <label className="block text-sm text-text-secondary mb-1.5">{field.label}</label>
                <div className="relative">
                  <input
                    type={field.show ? "text" : "password"}
                    value={field.val}
                    onChange={e => field.set(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary transition-colors pr-10"
                    dir="ltr"
                  />
                  {i < 2 && (
                    <button type="button" onClick={field.toggle}
                      className="absolute top-1/2 -translate-y-1/2 right-3 text-text-muted hover:text-text-primary">
                      {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {field.showStrength && <PasswordStrength password={field.val} />}
              </div>
            ))}
            {passwordMsg && <StatusMsg msg={passwordMsg.text} type={passwordMsg.type} />}
            <button type="submit" disabled={savingPassword}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/80 transition-colors disabled:opacity-50">
              <Lock className="w-4 h-4" />
              {savingPassword ? (lang === "ar" ? "جاري التغيير..." : "Changing...") : (lang === "ar" ? "تغيير كلمة المرور" : "Change Password")}
            </button>
          </form>
        </SectionCard>

        {/* College */}
        <SectionCard title={lang === "ar" ? "الجامعة والكلية" : "University & College"} icon={Building2}>
          <form onSubmit={handleSaveCollege} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                {lang === "ar" ? "الجامعة" : "University"}
              </label>
              <select value={selectedUniversityId} onChange={e => { setSelectedUniversityId(e.target.value); setSelectedCollegeId(""); }}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary" dir="rtl">
                <option value="">{lang === "ar" ? "— اختر الجامعة —" : "— Select University —"}</option>
                {universities.map(u => <option key={u._id} value={u._id}>{lang === "ar" ? u.nameAr : u.nameEn || u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">
                {lang === "ar" ? "الكلية" : "College"}
              </label>
              <select value={selectedCollegeId} onChange={e => setSelectedCollegeId(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-primary" dir="rtl">
                <option value="">{lang === "ar" ? "— اختر الكلية —" : "— Select College —"}</option>
                {filteredColleges.map(c => <option key={c._id} value={c._id}>{lang === "ar" ? c.nameAr : c.nameEn || c.name}</option>)}
              </select>
            </div>
            {collegeMsg && <StatusMsg msg={collegeMsg.text} type={collegeMsg.type} />}
            <button type="submit" disabled={savingCollege || !selectedCollegeId}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/80 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" />
              {savingCollege ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ" : "Save")}
            </button>
          </form>
        </SectionCard>

        {/* Danger Zone */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
          <h2 className="text-base font-bold text-red-400 flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5" />
            {lang === "ar" ? "منطقة الخطر" : "Danger Zone"}
          </h2>
          <p className="text-sm text-text-muted mb-4">
            {lang === "ar"
              ? "حذف حسابك سيزيل جميع بياناتك نهائياً ولا يمكن التراجع عن هذا الإجراء."
              : "Deleting your account will permanently remove all your data. This action cannot be undone."}
          </p>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors">
            <Trash2 className="w-4 h-4" />
            {lang === "ar" ? "حذف الحساب نهائياً" : "Delete Account Permanently"}
          </button>
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
  );
}
