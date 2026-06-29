import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "primary" | "success" | "danger" | "warning" | "info";
  withPulse?: boolean;
}

export function Badge({
  children,
  variant = "primary",
  withPulse = false,
}: BadgeProps) {
  const variants = {
    primary: "bg-primary/10 text-primary",
    success: "bg-teal/10 text-teal",
    danger: "bg-danger/10 text-danger",
    warning: "bg-warning/10 text-warning",
    info: "bg-secondary/10 text-secondary",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${variants[variant]} transition-all duration-300 hover:scale-105`}
    >
      {withPulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
      )}
      {children}
    </span>
  );
}