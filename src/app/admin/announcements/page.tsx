"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Plus, Edit2, Trash2, Eye, EyeOff, Megaphone, Gift, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Announcement {
  _id: string; titleAr: string; titleEn: string;
  bodyAr?: string; bodyEn?: string;
  ctaTextAr?: string; ctaTextEn?: string; ctaUrl?: string; imageUrl?: string;
  type: "info"|"promo"|"warning"|"success";
  targetAudience: "all"|"free"|"paid";
  isActive: boolean; priority: number; startsAt?: string; endsAt?: string;
}

const TYPE_CONFIG = {
  info:    { label:"معلومة",    icon:Info,          color:"text-blue-400",   bg:"bg-blue-500/10"  },
  promo:   { label:"عرض",      icon:Gift,          color:"text-yellow-400", bg:"bg-yellow-500/10"},
  warning: { label:"تحذير",    icon:AlertTriangle, color:"text-red-400",    bg:"bg-red-500/10"   },
  success: { label:"نجاح",     icon:CheckCircle,   color:"text-green-400",  bg:"bg-green-500/10" },
};

const emptyForm: {
  titleAr: string; titleEn: string; bodyAr: string; bodyEn: string;
  ctaTextAr: string; ctaTextEn: string; ctaUrl: string; imageUrl: string;
  type: "info"|"promo"|"warning"|"success"; targetAudience: "all"|"free"|"paid";
  isActive: boolean; priority: number; startsAt: string; endsAt: string;
} = {
  titleAr:"", titleEn:"", bodyAr:"", bodyEn:"", ctaTextAr:"", ctaTextEn:"",
  ctaUrl:"", imageUrl:"", type:"info", targetAudience:"all",
  isActive:true, priority:0, startsAt:"", endsAt:"",
};

export default function AnnouncementsPage() {
  const { showToast } = useToast();
  const { lang } = useLanguage();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement|null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<Announcement[]>("/api/admin/announcements");
    if (res.success && res.data) setAnnouncements(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(ann: Announcement) {
    setEditing(ann);
    setForm({ titleAr:ann.titleAr, titleEn:ann.titleEn, bodyAr:ann.bodyAr??"", bodyEn:ann.bodyEn??"",
              ctaTextAr:ann.ctaTextAr??"", ctaTextEn:ann.ctaTextEn??"", ctaUrl:ann.ctaUrl??"", imageUrl:ann.imageUrl??"",
              type:ann.type, targetAudience:ann.targetAudience, isActive:ann.isActive, priority:ann.priority,
              startsAt:ann.startsAt?ann.startsAt.slice(0,16):"", endsAt:ann.endsAt?ann.endsAt.slice(0,16):"" });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.titleAr.trim() || !form.titleEn.trim()) { showToast("يرجى إدخال العنوان", "error"); return; }
    setSaving(true);
    try {
      const body = { ...form, priority:Number(form.priority),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined };
      if (editing) { await apiFetch(`/api/admin/announcements/${editing._id}`, { method:"PATCH", body }); showToast("تم التحديث","success"); }
      else { await apiFetch("/api/admin/announcements", { method:"POST", body }); showToast("تم الإنشاء","success"); }
      setShowForm(false); load();
    } catch (e) { showToast(e instanceof Error ? e.message : "حدث خطأ","error"); }
    finally { setSaving(false); }
  }

  async function toggleActive(ann: Announcement) {
    await apiFetch(`/api/admin/announcements/${ann._id}`, { method:"PATCH", body:{ isActive:!ann.isActive } });
    setAnnouncements(prev => prev.map(a => a._id===ann._id ? {...a, isActive:!a.isActive} : a));
  }

  async function handleDelete() {
    if (!deleteId) return;
    await apiFetch(`/api/admin/announcements/${deleteId}`, { method:"DELETE" });
    showToast("تم الحذف","success"); setDeleteId(null); load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-text-primary">الإعلانات</h1>
            <p className="text-xs text-text-muted">تظهر للطلاب في التطبيق والموقع</p>
          </div>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> إعلان جديد</Button>
      </div>

      {showForm && (
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-bold text-text-primary">{editing ? "تعديل الإعلان" : "إعلان جديد"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="العنوان بالعربي *" value={form.titleAr} onChange={e=>setForm(f=>({...f,titleAr:e.target.value}))} dir="rtl" />
            <Input label="العنوان بالإنجليزي *" value={form.titleEn} onChange={e=>setForm(f=>({...f,titleEn:e.target.value}))} />
            <Input label="النص بالعربي" value={form.bodyAr} onChange={e=>setForm(f=>({...f,bodyAr:e.target.value}))} dir="rtl" />
            <Input label="النص بالإنجليزي" value={form.bodyEn} onChange={e=>setForm(f=>({...f,bodyEn:e.target.value}))} />
            <Input label="نص الزر (عربي)" value={form.ctaTextAr} onChange={e=>setForm(f=>({...f,ctaTextAr:e.target.value}))} dir="rtl" />
            <Input label="نص الزر (إنجليزي)" value={form.ctaTextEn} onChange={e=>setForm(f=>({...f,ctaTextEn:e.target.value}))} />
            <Input label="رابط الزر" value={form.ctaUrl} onChange={e=>setForm(f=>({...f,ctaUrl:e.target.value}))} placeholder="https://..." />
            <Input label="رابط صورة" value={form.imageUrl} onChange={e=>setForm(f=>({...f,imageUrl:e.target.value}))} />
            <div>
              <label className="block text-sm text-text-secondary mb-1">النوع</label>
              <select className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value as any}))}>
                <option value="info">معلومة</option><option value="promo">عرض</option>
                <option value="warning">تحذير</option><option value="success">نجاح</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">الجمهور</label>
              <select className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-sm"
                value={form.targetAudience} onChange={e=>setForm(f=>({...f,targetAudience:e.target.value as any}))}>
                <option value="all">الجميع</option><option value="free">مجاني فقط</option><option value="paid">مدفوع فقط</option>
              </select>
            </div>
            <Input label="تاريخ البدء" type="datetime-local" value={form.startsAt} onChange={e=>setForm(f=>({...f,startsAt:e.target.value}))} />
            <Input label="تاريخ الانتهاء" type="datetime-local" value={form.endsAt} onChange={e=>setForm(f=>({...f,endsAt:e.target.value}))} />
            <Input label="الأولوية" type="number" value={String(form.priority)} onChange={e=>setForm(f=>({...f,priority:Number(e.target.value)}))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e=>setForm(f=>({...f,isActive:e.target.checked}))} className="w-4 h-4 accent-primary" />
            <span className="text-sm text-text-secondary">نشط الآن</span>
          </label>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={()=>setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>{saving?"جاري الحفظ...":"حفظ"}</Button>
          </div>
        </Card>
      )}

      {loading ? <div className="h-32 shimmer rounded-xl" /> :
       announcements.length === 0 ? <Card className="p-12 text-center text-text-muted">لا توجد إعلانات</Card> : (
        <div className="space-y-3">
          {announcements.map(ann => {
            const cfg = TYPE_CONFIG[ann.type]; const Icon = cfg.icon;
            return (
              <Card key={ann._id} className={`p-4 flex items-center gap-4 ${!ann.isActive?"opacity-50":""}`}>
                <div className={`p-2 rounded-lg ${cfg.bg} shrink-0`}><Icon className={`w-5 h-5 ${cfg.color}`} /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text-primary text-sm">{ann.titleAr}</p>
                  <p className="text-xs text-text-muted">{ann.titleEn}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-border text-text-muted">{cfg.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-border text-text-muted">{ann.targetAudience==="all"?"الجميع":ann.targetAudience==="free"?"مجاني":"مدفوع"}</span>
                    <span className="text-[10px] text-text-muted">أولوية: {ann.priority}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={()=>toggleActive(ann)} className="p-1.5 rounded-lg hover:bg-surface-hover">
                    {ann.isActive?<Eye className="w-4 h-4 text-green-400"/>:<EyeOff className="w-4 h-4 text-text-muted"/>}
                  </button>
                  <button onClick={()=>openEdit(ann)} className="p-1.5 rounded-lg text-primary hover:bg-primary/10"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={()=>setDeleteId(ann._id)} className="p-1.5 rounded-lg text-danger hover:bg-danger/10"><Trash2 className="w-4 h-4"/></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ConfirmDialog open={!!deleteId} title="حذف الإعلان" message="هل أنت متأكد؟"
        onConfirm={handleDelete} onCancel={()=>setDeleteId(null)} />
    </div>
  );
}
