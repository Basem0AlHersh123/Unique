"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useLanguage();
  const resolvedConfirmLabel = confirmLabel ?? t("common.confirm");
  const resolvedCancelLabel = cancelLabel ?? t("common.cancel");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const variantStyles = {
    danger: {
      iconBg: "bg-danger/10",
      iconColor: "text-danger",
      buttonBg: "bg-danger hover:bg-danger/90 shadow-lg shadow-danger/20",
    },
    warning: {
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      buttonBg: "bg-warning hover:bg-warning/90 shadow-lg shadow-warning/20",
    },
    primary: {
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      buttonBg: "bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`relative bg-surface border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl transition-all duration-300 ${
          visible
            ? "scale-100 opacity-100 translate-y-0"
            : "scale-95 opacity-0 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute left-4 top-4 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${styles.iconBg} ${styles.iconColor}`}
          >
            {variant === "danger" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary mb-1">{title}</h3>
            <p className="text-sm text-text-secondary">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6 mr-14">
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${styles.buttonBg}`}
          >
            {resolvedConfirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary bg-surface-hover hover:bg-surface-hover/80 transition-all duration-200"
          >
            {resolvedCancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}