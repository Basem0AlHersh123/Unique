"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export interface JsonField {
  name: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "boolean" | "array" | "object";
}

interface JsonImportProps {
  fields: JsonField[];
  onFill: (data: Record<string, unknown>) => void;
  entityLabel: string;
}

export default function JsonImport({ fields, onFill, entityLabel }: JsonImportProps) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<{
    filled: string[];
    missing: string[];
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleParse() {
    setParseError(null);
    setResult(null);
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data) || typeof data !== "object" || data === null) {
        setParseError(
          lang === "ar"
            ? "يجب إدخال كائن JSON واحد (وليس مصفوفة). استخدم الاستيراد الجماعي لإضافة عناصر متعددة."
            : "Must be a single JSON object (not an array). Use bulk import for multiple items."
        );
        return;
      }
      const filled: string[] = [];
      const missing: string[] = [];
      for (const f of fields) {
        if (data[f.name] !== undefined && data[f.name] !== null && data[f.name] !== "") {
          filled.push(f.label);
        } else if (f.required) {
          missing.push(f.label);
        }
      }
      if (filled.length === 0) {
        setParseError(
          lang === "ar"
            ? "لم يتم العثور على أي حقول متطابقة. تحقق من أسماء الحقول في JSON."
            : "No matching fields found. Check the JSON field names."
        );
        return;
      }
      setResult({ filled, missing });
      onFill(data as Record<string, unknown>);
    } catch {
      setParseError(
        lang === "ar"
          ? "JSON غير صالح. تحقق من الصياغة."
          : "Invalid JSON. Check the syntax."
      );
    }
  }

  function handleClose() {
    setOpen(false);
    setRaw("");
    setResult(null);
    setParseError(null);
  }

  const exampleJson = (() => {
    const ex: Record<string, unknown> = {};
    for (const f of fields.slice(0, 5)) {
      if (f.type === "array") ex[f.name] = [];
      else if (f.type === "number") ex[f.name] = 0;
      else if (f.type === "boolean") ex[f.name] = true;
      else ex[f.name] = "";
    }
    return JSON.stringify(ex, null, 2);
  })();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:border-primary transition-all duration-300 text-sm font-medium"
      >
        <Upload className="w-4 h-4" />
        {lang === "ar" ? "استيراد JSON" : "Import JSON"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {lang === "ar" ? `استيراد ${entityLabel} من JSON` : `Import ${entityLabel} from JSON`}
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lang === "ar"
                  ? "الصق كائن JSON واحد لتعبئة حقول النموذج. سيتم تمييز الحقول المطلوبة الناقصة."
                  : "Paste a single JSON object to fill the form fields. Missing required fields will be highlighted."}
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {lang === "ar" ? "JSON" : "JSON"}
                  </label>
                  <span className="text-xs text-gray-400 font-mono">
                    {lang === "ar" ? "مثال" : "Example"}:
                  </span>
                </div>
                <textarea
                  value={raw}
                  onChange={(e) => { setRaw(e.target.value); setResult(null); setParseError(null); }}
                  placeholder={exampleJson}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-mono text-sm outline-none focus:border-primary transition-all duration-300 resize-none"
                  spellCheck={false}
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {result && (
                <div className="space-y-2 px-4 py-3 rounded-xl bg-success/5 border border-success/20">
                  {result.filled.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-full mb-0.5">
                        {lang === "ar" ? "✓ تم تعبئة:" : "✓ Filled:"}
                      </span>
                      {result.filled.map((f) => (
                        <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  {result.missing.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-full mb-0.5">
                        {lang === "ar" ? "⚠ حقول مطلوبة ناقصة:" : "⚠ Missing required:"}
                      </span>
                      {result.missing.map((f) => (
                        <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  {result.missing.length === 0 && (
                    <p className="text-success text-sm font-medium">
                      {lang === "ar" ? "✅ تم تعبئة جميع الحقول!" : "✅ All fields filled!"}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between gap-3 pt-2">
                <div className="flex gap-2">
                  {result && (
                    <button
                      onClick={handleClose}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                    >
                      {lang === "ar" ? "تم، أغلق" : "Done, Close"}
                    </button>
                  )}
                  <button
                    onClick={handleClose}
                    className="px-5 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                  >
                    {lang === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                </div>
                <button
                  onClick={handleParse}
                  disabled={!raw.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {lang === "ar" ? "تحليل وتعبئة" : "Parse & Fill"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
