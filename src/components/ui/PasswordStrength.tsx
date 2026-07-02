"use client";

import { Check, X } from "lucide-react";

export function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 أحرف على الأقل", en: "At least 8 characters", ok: password.length >= 8 },
    { label: "حرف كبير", en: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "رقم", en: "Number", ok: /[0-9]/.test(password) },
    { label: "رمز خاص", en: "Special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
  ];
  const labels = ["ضعيفة", "مقبولة", "جيدة", "قوية"];
  const labelsEn = ["Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  const isRTL = document.documentElement.dir === "rtl";

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i < score ? colors[score - 1] : "bg-border"
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p
          className={`text-xs font-medium transition-colors duration-500 ${
            score >= 3
              ? "text-green-400"
              : score >= 2
              ? "text-yellow-400"
              : "text-red-400"
          }`}
        >
          {score > 0
            ? isRTL
              ? labels[score - 1]
              : labelsEn[score - 1]
            : ""}
        </p>
        <div className="flex gap-2 text-[10px]">
          {checks.map((check, i) => (
            <span
              key={i}
              className={`flex items-center gap-0.5 ${
                check.ok ? "text-teal" : "text-text-muted"
              }`}
            >
              {check.ok ? (
                <Check className="w-2.5 h-2.5" />
              ) : (
                <X className="w-2.5 h-2.5" />
              )}
              <span className="hidden sm:inline">
                {isRTL ? check.label : check.en}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}