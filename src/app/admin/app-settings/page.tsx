"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import { Settings, Smartphone, Wrench, AlertTriangle } from "lucide-react";

interface AppConfig {
  minAppVersion: string; updateMessage: string; updateUrl: string;
  forceUpdateEnabled: boolean; maintenanceMode: boolean; maintenanceMessage: string;
}

export default function AppSettingsPage() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<AppConfig>({
    minAppVersion:"1.0.0", updateMessage:"", updateUrl:"",
    forceUpdateEnabled:false, maintenanceMode:false, maintenanceMessage:"",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<AppConfig>("/api/admin/app-config").then(res => {
      if (res.success && res.data) setConfig(res.data);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/app-config", { method:"PATCH", body:config as any });
      showToast("تم حفظ الإعدادات","success");
    } catch (e) { showToast(e instanceof Error?e.message:"حدث خطأ","error"); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="h-48 shimmer rounded-xl" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-text-primary">إعدادات التطبيق</h1>
          <p className="text-xs text-text-muted">التحكم في إجبار التحديث ووضع الصيانة</p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-primary"/><h2 className="text-base font-bold text-text-primary">التحديث الإجباري</h2></div>
        <label className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg cursor-pointer">
          <input type="checkbox" checked={config.forceUpdateEnabled} onChange={e=>setConfig(c=>({...c,forceUpdateEnabled:e.target.checked}))} className="w-4 h-4 accent-primary" />
          <span className="text-sm text-text-secondary">تفعيل — سيحظر المستخدمين بإصدار أقدم</span>
        </label>
        {config.forceUpdateEnabled && (
          <>
            <Input label="الحد الأدنى للإصدار المقبول" placeholder="1.2.0" value={config.minAppVersion} onChange={e=>setConfig(c=>({...c,minAppVersion:e.target.value}))} />
            <Input label="رسالة التحديث" dir="rtl" value={config.updateMessage} onChange={e=>setConfig(c=>({...c,updateMessage:e.target.value}))} />
            <Input label="رابط التحديث" value={config.updateUrl} onChange={e=>setConfig(c=>({...c,updateUrl:e.target.value}))} />
          </>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2"><Wrench className="w-5 h-5 text-warning"/><h2 className="text-base font-bold text-text-primary">وضع الصيانة</h2></div>
        <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${config.maintenanceMode?"bg-warning/10 border border-warning/30":"bg-surface-hover"}`}>
          <input type="checkbox" checked={config.maintenanceMode} onChange={e=>setConfig(c=>({...c,maintenanceMode:e.target.checked}))} className="w-4 h-4 accent-primary" />
          <span className="text-sm text-text-secondary">تفعيل وضع الصيانة — يحظر جميع المستخدمين</span>
        </label>
        {config.maintenanceMode && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0"/>
            <p className="text-xs text-warning font-bold">تحذير: لن يتمكن أي مستخدم من الدخول حتى تعطل هذا الخيار</p>
          </div>
        )}
        <Input label="رسالة الصيانة" dir="rtl" value={config.maintenanceMessage} onChange={e=>setConfig(c=>({...c,maintenanceMessage:e.target.value}))} />
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </Button>
    </div>
  );
}
