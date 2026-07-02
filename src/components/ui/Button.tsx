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
  withRipple = false,
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const sizes: Record<string, string> = {
    sm: "px-4 py-2 rounded-xl text-xs font-semibold",
    md: "px-6 py-2.5 rounded-xl text-sm font-semibold",
    lg: "px-8 py-3.5 rounded-xl text-base font-semibold",
  };

  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]",
    secondary:
      "bg-surface border-2 border-primary text-primary hover:bg-primary/10 hover:border-primary-dark active:scale-[0.98]",
    danger:
      "bg-gradient-to-r from-danger to-red-600 text-white shadow-lg shadow-danger/20 hover:shadow-xl hover:shadow-danger/30 hover:scale-[1.02] active:scale-[0.98]",
    ghost: "bg-transparent text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors",
    outline:
      "bg-transparent border-2 border-border text-text-primary hover:border-primary hover:text-primary hover:bg-primary/5 transition-all",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}