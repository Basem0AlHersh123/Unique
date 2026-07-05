"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { apiFetch } from "@/lib/api";
import type { JsonField } from "./JsonImport";

interface BulkImportProps {
  apiEndpoint: string;
  fields: JsonField[];
  entityLabel: string;
  onSuccess: () => void;
}

interface RowError {
  index: number;
  error: string;
}

export default function BulkImportModal({ apiEndpoint, fields, entityLabel, onSuccess }: BulkImportProps) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [parsedItems, setParsedItems] = useState<Record<string, unknown>[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [result, setResult] = useState<{ created: number; errors: RowError[] } | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  function handlePreview() {
    setParseError(null);
    setParsedItems(null);
    setRowErrors([]);
    setResult(null);
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        setParseError(
          lang === "ar"
            ? "يجب إدخال مصفوفة JSON (مثال: [{...}, {...}])"
            : "Must be a JSON array (e.g. [{...}, {...}])"
        );
        return;
      }
      if (data.length === 0) {
        setParseError(
          lang === "ar" ? "المصفوفة فارغة" : "Array is empty"
        );
        return;
      }
      if (data.length > 100) {
        setParseError(
          lang === "ar"
            ? "الحد الأقصى 100 عنصر في المرة الواحدة"
            : "Maximum 100 items at a time"
        );
        return;
      }

      // Validate each item has at least one recognized field
      const fieldNames = new Set(fields.map((f) => f.name));
      const errs: RowError[] = [];
      const valid: Record<string, unknown>[] = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (typeof item !== "object" || item === null) {
          errs.push({ index: i, error: lang === "ar" ? "عنصر غير صالح" : "Invalid item" });
          continue;
        }
        const hasField = Object.keys(item).some((k) => fieldNames.has(k));
        if (!hasField) {
          errs.push({ index: i, error: lang === "ar" ? "لم يتم العثور على حقول متطابقة" : "No matching fields" });
          continue;
        }
        valid.push(item);
      }
      setParsedItems(valid);
      setRowErrors(errs);
    } catch {
      setParseError(
        lang === "ar"
          ? "JSON غير صالح. تحقق من الصياغة."
          : "Invalid JSON. Check the syntax."
      );
    }
  }

  async function handleImport() {
    if (!parsedItems || parsedItems.length === 0) return;
    setSaving(true);
    setRowErrors([]);
    setResult(null);
    try {
      const res = await apiFetch<{ created: number; errors: RowError[] }>(apiEndpoint, {
        method: "POST",
        body: JSON.stringify({ items: parsedItems }),
      });
      const created = res.data?.created ?? 0;
      const errors = res.data?.errors ?? [];
      setResult({ created, errors });
      if (errors.length === 0 && created > 0) {
        onSuccess();
      }
    } catch (err) {
      setRowErrors([{ index: -1, error: (err as Error).message }]);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setRaw("");
    setParsedItems(null);
    setParseError(null);
    setRowErrors([]);
    setResult(null);
    setExpandedRow(null);
  }

  const exampleJson = JSON.stringify(
    fields.slice(0, 4).reduce((acc, f) => {
      if (f.type === "array") acc[f.name] = [];
      else if (f.type === "number") acc[f.name] = 0;
      else if (f.type === "boolean") acc[f.name] = true;
      else acc[f.name] = "";
      return acc;
    }, {} as Record<string, unknown>),
    null,
    2
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
      >
        <Upload className="w-4 h-4" />
        {lang === "ar" ? "استيراد جماعي" : "Bulk Import"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {lang === "ar" ? `استيراد جماعي: ${entityLabel}` : `Bulk Import: ${entityLabel}`}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {lang === "ar" ? "الحد الأقصى ١٠٠" : "Max 100"}
                </span>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {lang === "ar"
                  ? "الصق مصفوفة JSON من العناصر لإنشائها دفعة واحدة. مثال:"
                  : "Paste a JSON array of items to create them in one batch. Example:"}
              </p>

              <textarea
                value={raw}
                onChange={(e) => { setRaw(e.target.value); setParsedItems(null); setParseError(null); setResult(null); }}
                placeholder={`[\n${exampleJson}\n]`}
                rows={6}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-mono text-sm outline-none focus:border-primary transition-all duration-300 resize-none"
                spellCheck={false}
              />

              {parseError && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {parsedItems && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {lang === "ar"
                        ? `✅ تم تحليل ${parsedItems.length} عنصر${parsedItems.length !== 1 ? "ًا" : ""}`
                        : `✅ Parsed ${parsedItems.length} item${parsedItems.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>

                  {rowErrors.length > 0 && (
                    <div className="px-4 py-3 rounded-xl bg-warning/10 border border-warning/20">
                      <p className="text-sm font-medium text-warning mb-1">
                        {lang === "ar" ? "⚠ عناصر بها مشاكل (سيتم تخطيها):" : "⚠ Problematic items (will be skipped):"}
                      </p>
                      {rowErrors.map((e) => (
                        <p key={e.index} className="text-xs text-warning/80 ml-2">
                          #{e.index + 1}: {e.error}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-10">#</th>
                            {fields.slice(0, 4).map((f) => (
                              <th key={f.name} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                                {f.label}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {parsedItems.map((item, i) => (
                            <>
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                                {fields.slice(0, 4).map((f) => (
                                  <td key={f.name} className="px-3 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                                    {renderCellValue(item[f.name])}
                                  </td>
                                ))}
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                                    className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                  >
                                    {expandedRow === i ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                              </tr>
                              {expandedRow === i && (
                                <tr key={`${i}-exp`}>
                                  <td colSpan={6} className="px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30">
                                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                                      {JSON.stringify(item, null, 2)}
                                    </pre>
                                  </td>
                                </tr>
                              )}
                            </>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-2 px-4 py-3 rounded-xl bg-success/5 border border-success/20">
                  <p className="text-sm font-medium text-success">
                    {lang === "ar"
                      ? `✅ تم إنشاء ${result.created} بنجاح`
                      : `✅ Created ${result.created} successfully`}
                  </p>
                  {result.errors.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-danger mb-1">
                        {lang === "ar" ? "❌ أخطاء:" : "❌ Errors:"}
                      </p>
                      {result.errors.map((e) => (
                        <p key={e.index} className="text-xs text-danger/80 ml-2">
                          #{e.index + 1}: {e.error}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handlePreview}
                  disabled={!raw.trim()}
                  className="px-5 py-2.5 rounded-xl border-2 border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {lang === "ar" ? "معاينة" : "Preview"}
                </button>
                {parsedItems && parsedItems.length > 0 && !result && (
                  <button
                    onClick={handleImport}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary to-primary text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {lang === "ar" ? "جارٍ الإنشاء..." : "Creating..."}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {lang === "ar"
                          ? `إنشاء ${parsedItems.length} عنصر${parsedItems.length !== 1 ? "ًا" : ""}`
                          : `Create ${parsedItems.length} item${parsedItems.length !== 1 ? "s" : ""}`}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function renderCellValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return `[${val.length} items]`;
  if (typeof val === "object") return JSON.stringify(val).slice(0, 40) + "...";
  return String(val).slice(0, 60);
}
