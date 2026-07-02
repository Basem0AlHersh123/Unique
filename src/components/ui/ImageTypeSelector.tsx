"use client";

import { useState, useRef } from "react";
import { Image, Link, Upload, Cloud, Check } from "lucide-react";
import { IconPicker } from "./IconPicker";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface ImageTypeSelectorProps {
  imageType: "icon" | "url" | "cloudinary";
  imageUrl: string;
  icon: string;
  onImageTypeChange: (type: "icon" | "url" | "cloudinary") => void;
  onImageUrlChange: (url: string) => void;
  onIconChange: (icon: string) => void;
}

const TABS: {
  key: "icon" | "url" | "cloudinary";
  labelKey: "admin.image_type_icon" | "admin.image_type_url" | "admin.image_type_cloudinary";
  icon: typeof Image;
}[] = [
  { key: "icon", labelKey: "admin.image_type_icon", icon: Image },
  { key: "url", labelKey: "admin.image_type_url", icon: Link },
  { key: "cloudinary", labelKey: "admin.image_type_cloudinary", icon: Cloud },
];

export function ImageTypeSelector({
  imageType,
  imageUrl,
  icon,
  onImageTypeChange,
  onImageUrlChange,
  onIconChange,
}: ImageTypeSelectorProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        onImageUrlChange(data.data.url);
      } else {
        console.error("Upload failed:", data.error);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-xl bg-background p-1 border border-border">
        {TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = imageType === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onImageTypeChange(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
                isActive
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-md"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {t(tab.labelKey)}
            </button>
          );
        })}
      </div>

      {imageType === "icon" && (
        <IconPicker value={icon} onChange={onIconChange} />
      )}

      {imageType === "url" && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            {t("admin.image_url_label")}
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => onImageUrlChange(e.target.value)}
            placeholder="https://example.com/image.png"
            className="w-full rounded-xl bg-surface border-2 border-border px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary transition-all duration-300"
          />
          {imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border h-24 w-24 shadow-sm">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      )}

      {imageType === "cloudinary" && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            {t("admin.upload_image")}
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface/50 px-4 py-6 text-sm text-text-secondary hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-300"
          >
            <Upload className="w-5 h-5" />
            {uploading ? t("admin.uploading") : t("admin.click_to_upload")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          {uploading && (
            <div className="mt-2 h-1.5 rounded-full bg-background overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse"
                style={{ width: "60%" }}
              />
            </div>
          )}
          {imageUrl && !uploading && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border h-24 w-24 shadow-sm">
              <img
                src={imageUrl}
                alt="Uploaded"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}