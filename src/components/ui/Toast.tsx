"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose?: () => void;
}

export function Toast({
  message,
  type = "info",
  duration = 4000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      const closeTimer = setTimeout(() => onClose?.(), 300);
      return () => clearTimeout(closeTimer);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      bg: "bg-teal/10 border-teal/30 text-teal",
      icon: CheckCircle,
    },
    error: {
      bg: "bg-danger/10 border-danger/30 text-danger",
      icon: AlertCircle,
    },
    info: {
      bg: "bg-primary/10 border-primary/30 text-primary",
      icon: Info,
    },
    warning: {
      bg: "bg-warning/10 border-warning/30 text-warning",
      icon: AlertTriangle,
    },
  };

  const { bg, icon: Icon } = config[type];

  if (!isVisible) return null;

  return (
    <div
      className={`flex items-center gap-3 max-w-md px-5 py-3.5 rounded-2xl border-2 backdrop-blur-lg glass shadow-xl toast-in ${bg}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}