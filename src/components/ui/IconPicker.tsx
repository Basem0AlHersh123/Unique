"use client";

import { useState, useRef, useEffect } from "react";
import * as Icons from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const ICON_NAMES = [
  "GraduationCap", "BookOpen", "Book", "Bookmark", "Library",
  "Brain", "Lightbulb", "Zap", "Award", "Star",
  "Heart", "Shield", "Target", "TrendingUp", "Activity",
  "Globe", "MapPin", "Compass", "Flag", "Building2",
  "Palette", "Camera", "Music", "Microscope", "FlaskConical",
  "Calculator", "PenTool", "ScrollText", "MessageCircle", "Users",
  "UserCheck", "Sparkles", "Rocket", "Crown", "Gem",
  "Trees", "Cloud", "Sun", "Moon", "Smile",
  "UtensilsCrossed", "Dumbbell", "Pencil", "ClipboardCheck", "Layers",
  "FolderOpen", "GitBranch", "HelpCircle",
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function IconPicker({ value, onChange, label }: IconPickerProps) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = search
    ? ICON_NAMES.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : ICON_NAMES;

  const SelectedIcon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[value] || Icons.BookOpen;

  return (
    <div ref={dropdownRef} className="relative flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-text-secondary">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border-2 border-border text-text-primary outline-none focus:border-primary transition-all duration-300 focus:shadow-lg focus:shadow-primary/10"
      >
        <SelectedIcon className="w-5 h-5" />
        <span className="flex-1 text-start">{value || (lang === "ar" ? "اختر أيقونة" : "Choose icon")}</span>
        <Icons.ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-surface border border-border rounded-xl shadow-xl p-3 max-h-80 overflow-hidden flex flex-col">
          <div className="relative mb-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === "ar" ? "بحث..." : "Search..."}
              className="w-full px-4 py-2 pr-9 rounded-lg bg-background border border-border text-text-primary text-sm outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-4 gap-1 overflow-y-auto flex-1">
            {filtered.map((name) => {
              const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] || Icons.BookOpen;
              const isSelected = value === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all duration-200 ${
                    isSelected
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "text-text-secondary hover:bg-surface-hover border border-transparent"
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span className="truncate w-full text-center leading-tight">{name}</span>
                  {isSelected && <Check className="w-3 h-3 absolute top-1 right-1 text-primary" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-4 text-center py-6 text-text-muted text-sm">
                لا توجد أيقونات
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
