"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Save, Image, Video, ChevronDown, ChevronUp } from "lucide-react";

interface SiteContentSection {
  _id: string;
  section: string;
  data: Record<string, unknown>;
}

const SECTIONS = [
  {
    key: "home-video",
    label: "الفيديو التعريفي (الرئيسية)",
    fields: [
      { key: "videoUrl", label: "رابط الفيديو", type: "text" },
      { key: "videoType", label: "النوع", type: "select", options: ["youtube", "direct"] },
    ],
  },
  {
    key: "about-videos",
    label: "فيديوهات الشهادات (عن المنصة)",
    fields: [],
    isArray: true,
    arrayFields: [
      { key: "name", label: "الاسم", type: "text" },
      { key: "role", label: "الدور", type: "text" },
      { key: "title", label: "عنوان الفيديو", type: "text" },
      { key: "desc", label: "الوصف", type: "text" },
      { key: "videoUrl", label: "رابط الفيديو", type: "text" },
    ],
  },
  {
    key: "home-hero",
    label: "صورة الهيرو (الرئيسية)",
    fields: [
      { key: "imageUrl", label: "رابط الصورة", type: "text" },
    ],
  },
  {
    key: "about-hero",
    label: "صورة الهيرو (عن المنصة)",
    fields: [
      { key: "imageUrl", label: "رابط الصورة", type: "text" },
    ],
  },
];

export default function AdminCMSPage() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [contents, setContents] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiFetch<SiteContentSection[]>("/api/admin/site-content");
      const map: Record<string, Record<string, unknown>> = {};
      if (res.data) {
        for (const c of res.data) {
          map[c.section] = c.data;
        }
      }
      setContents(map);
    } catch {
      showToast("حدث خطأ في تحميل المحتوى", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getSectionData(sectionKey: string): Record<string, unknown> {
    return contents[sectionKey] || {};
  }

  function setField(sectionKey: string, fieldKey: string, value: unknown) {
    setContents((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        [fieldKey]: value,
      },
    }));
  }

  function setArrayItem(
    sectionKey: string,
    index: number,
    fieldKey: string,
    value: string
  ) {
    const arr = ((contents[sectionKey] as Record<string, unknown[]> | undefined)?.["items"]) || [];
    const newArr = [...arr];
    newArr[index] = { ...(newArr[index] as Record<string, string> || {}), [fieldKey]: value };
    setContents((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        items: newArr,
      },
    }));
  }

  function addArrayItem(sectionKey: string) {
    const arr = ((contents[sectionKey] as Record<string, unknown[]> | undefined)?.["items"]) || [];
    setContents((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        items: [...arr, {}],
      },
    }));
  }

  function removeArrayItem(sectionKey: string, index: number) {
    const arr = ((contents[sectionKey] as Record<string, unknown[]> | undefined)?.["items"]) || [];
    setContents((prev) => ({
      ...prev,
      [sectionKey]: {
        ...(prev[sectionKey] || {}),
        items: arr.filter((_, i) => i !== index),
      },
    }));
  }

  async function handleSave(sectionKey: string) {
    setSaving(sectionKey);
    try {
      const data = contents[sectionKey] || {};
      const res = await apiFetch("/api/admin/site-content", {
        method: "PUT",
        body: JSON.stringify({ section: sectionKey, data }),
      });
      if (res.success) {
        showToast("تم الحفظ", "success");
      }
    } catch {
      showToast("حدث خطأ", "error");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">
          إدارة محتوى الموقع
        </h2>
        <p className="text-text-secondary mt-1 text-sm sm:text-base">
          تحكم في الفيديوهات والصور المعروضة في الصفحة الرئيسية وصفحة عن المنصة
        </p>
      </div>

      {SECTIONS.map((section) => {
        const isOpen = expanded === section.key;
        const data = getSectionData(section.key);
        return (
          <Card key={section.key} withGlass>
            <button
              onClick={() => setExpanded(isOpen ? null : section.key)}
              className="w-full flex items-center justify-between text-right"
            >
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                {section.isArray ? <Video className="w-5 h-5 text-primary" /> : <Image className="w-5 h-5 text-primary" />}
                {section.label}
              </h3>
              {isOpen ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
            </button>

            {isOpen && (
              <div className="mt-6 space-y-4 border-t border-border pt-6">
                {!section.isArray && section.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      {field.label}
                    </label>
                    {field.type === "select" ? (
                      <select
                        value={(data[field.key] as string) || field.options?.[0] || ""}
                        onChange={(e) => setField(section.key, field.key, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300"
                      >
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={(data[field.key] as string) || ""}
                        onChange={(e) => setField(section.key, field.key, e.target.value)}
                        placeholder={`أدخل ${field.label}`}
                        className="w-full px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary placeholder:text-text-muted outline-none focus:border-primary transition-all duration-300"
                      />
                    )}
                  </div>
                ))}

                {section.isArray && section.arrayFields && (
                  <div className="space-y-4">
                    {(data.items as Record<string, string>[] | undefined)?.map((item, idx) => (
                      <div key={idx} className="p-4 bg-background rounded-xl border border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-text-muted">{idx + 1}</span>
                          <button
                            onClick={() => removeArrayItem(section.key, idx)}
                            className="text-xs text-danger hover:text-danger/80"
                          >
                            حذف
                          </button>
                        </div>
                        {section.arrayFields.map((af) => (
                          <div key={af.key}>
                            <label className="block text-xs text-text-muted mb-1">{af.label}</label>
                            <input
                              type="text"
                              value={item[af.key] || ""}
                              onChange={(e) => setArrayItem(section.key, idx, af.key, e.target.value)}
                              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text-primary text-sm outline-none focus:border-primary"
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem(section.key)}
                      className="text-sm text-primary hover:text-primary/80"
                    >
                      + إضافة عنصر
                    </button>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSave(section.key)}
                    isLoading={saving === section.key}
                  >
                    <Save className="w-4 h-4 ml-2" />
                    حفظ
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
