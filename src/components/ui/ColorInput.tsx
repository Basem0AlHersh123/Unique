"use client";

import { useState, useCallback } from "react";
import { Pipette } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

function isValidCssColor(str: string): boolean {
  if (!str.trim()) return false;
  const s = document.createElement("span");
  s.style.color = str.trim();
  return s.style.color !== "";
}

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ColorInput({
  label,
  value,
  onChange,
  placeholder = "#6C63FF",
}: ColorInputProps) {
  const { t } = useLanguage();
  const [focused, setFocused] = useState(false);
  const isValid = value ? isValidCssColor(value) : true;

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-1.5 w-full group">
      <label className="text-sm font-medium text-text-secondary transition-colors group-focus-within:text-primary">
        {label}
      </label>
      <div className="relative flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-xl border-2 border-border shrink-0 transition-all duration-300 overflow-hidden"
          style={{
            backgroundColor: isValid ? value : "#e2e8f0",
          }}
        >
          <label className="block w-full h-full cursor-pointer opacity-0 hover:opacity-20 transition-opacity flex items-center justify-center bg-black/10">
            <input
              type="color"
              value={isValid ? value : "#6C63FF"}
              onChange={handlePickerChange}
              className="w-0 h-0 absolute"
              tabIndex={-1}
            />
          </label>
        </div>

        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={handleTextChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            className={`w-full px-4 py-3 ps-10 rounded-xl bg-surface border-2 text-text-primary
              placeholder:text-text-muted outline-none transition-all duration-300
              ${
                !isValid
                  ? "border-danger focus:border-danger"
                  : "border-border focus:border-primary focus:shadow-lg focus:shadow-primary/10"
              }
              hover:border-primary/50 focus:scale-[1.01]`}
          />
          <Pipette className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
      </div>
      {!isValid && (
        <p className="text-sm text-danger animate-slide-in-right">
          {t("color.invalid")}
        </p>
      )}
      {focused && isValid && value && (
        <p className="text-xs text-text-muted">
          {t("color.hint")}
        </p>
      )}
    </div>
  );
}
