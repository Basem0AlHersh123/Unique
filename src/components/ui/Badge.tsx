import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "primary" | "success" | "danger" | "warning" | "info" | "secondary";
  withPulse?: boolean;
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "primary",
  withPulse = false,
  size = "md",
}: BadgeProps) {
  const variants = {
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-teal/10 text-teal border-teal/20",
    danger: "bg-danger/10 text-danger border-danger/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    info: "bg-secondary/10 text-secondary border-secondary/20",
    secondary: "bg-surface-hover/50 text-text-secondary border-border",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-all duration-200 ${variants[variant]} ${sizes[size]}`}
    >
      {withPulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" />
      )}
      {children}
    </span>
  );
}