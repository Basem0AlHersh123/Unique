"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = "info", duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      const closeTimer = setTimeout(() => onClose?.(), 300);
      return () => clearTimeout(closeTimer);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: "bg-teal/10 border-teal text-teal",
    error: "bg-danger/10 border-danger text-danger",
    info: "bg-primary/10 border-primary text-primary",
    warning: "bg-warning/10 border-warning text-warning",
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-6 start-6 z-50 max-w-md px-6 py-4 rounded-2xl border-2 backdrop-blur-lg glass shadow-lg toast-in ${colors[type]}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm font-medium">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}