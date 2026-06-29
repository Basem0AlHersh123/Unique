"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Toast } from "./Toast";

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export function  ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" | "info" | "warning" }[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 start-6 z-50 space-y-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}