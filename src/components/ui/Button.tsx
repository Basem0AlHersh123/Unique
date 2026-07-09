"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  withRipple?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  className = "",
  withRipple: _withRipple,
  ...rest
}: ButtonProps) {
  const sizes: Record<string, string> = {
    sm: "px-4 py-2 text-xs font-medium",
    md: "px-6 py-2.5 text-sm font-medium",
    lg: "px-8 py-3.5 text-base font-medium",
  };

  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-[#A78BFA] via-[#6C63FF] to-[#4C3F9E] text-white shadow-lg shadow-[#6C63FF]/25 hover:shadow-xl hover:shadow-[#6C63FF]/35 hover:brightness-108 active:brightness-95 transition-all duration-200",
    secondary:
      "bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-primary/30 hover:bg-surface-hover transition-all duration-200",
    danger:
      "bg-gradient-to-r from-danger to-red-500 text-white shadow-lg shadow-danger/20 hover:shadow-xl hover:shadow-danger/30 hover:brightness-105 active:brightness-95 transition-all duration-200",
    ghost:
      "bg-transparent text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors duration-200",
    outline:
      "bg-transparent border border-border text-text-secondary hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`flex items-center justify-center gap-2 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}