"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface SuccessDialogProps {
  open: boolean;
  title: string;
  message: string;
  details?: string;
  onClose: () => void;
}

export function SuccessDialog({
  open,
  title,
  message,
  details,
  onClose,
}: SuccessDialogProps) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`relative bg-surface border border-border rounded-2xl p-8 max-w-sm w-full shadow-2xl transition-all duration-300 ${
          visible
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute start-4 top-4 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-teal" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
          <p className="text-sm text-text-secondary mb-1">{message}</p>
          {details && (
            <p className="text-xs text-text-muted bg-background rounded-lg px-3 py-2 mt-2 border border-border/50">
              {details}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-[1.02]"
        >
          {t("common.ok")}
        </button>
      </div>
    </div>
  );
}
