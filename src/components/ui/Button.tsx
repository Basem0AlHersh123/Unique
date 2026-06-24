"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  withRipple?: boolean;
  children: ReactNode;
}

/**
 * Matches blueprint Section 5 component spec:
 * - Primary: filled purple, scales up slightly + shadow on hover
 * - Secondary: outlined purple, fills lightly on hover
 * - Danger: filled red, only for delete/logout actions
 */
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
  void withRipple; // reserved for future ripple animation
  const sizes: Record<string, string> = {
    sm: "px-4 py-2 rounded-lg text-xs",
    md: "px-6 py-3 rounded-lg text-sm",
    lg: "px-8 py-4 rounded-xl text-base",
  };

  const variants: Record<string, string> = {
    primary:
      "bg-primary text-white hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
    secondary:
      "bg-transparent border-2 border-primary text-primary hover:bg-surface-hover",
    danger: "bg-danger text-white hover:scale-[1.02] hover:shadow-lg",
    ghost: "bg-transparent text-text-secondary hover:text-primary transition-colors",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`font-semibold transition-all duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
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
      ) : children}
    </button>
  );
}
