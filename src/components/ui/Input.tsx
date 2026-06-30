"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", icon, type = "text", ...rest }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";

    return (
      <div className="flex flex-col gap-1.5 w-full group">
        <label className="text-sm font-medium text-text-secondary transition-colors group-focus-within:text-primary">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-primary">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            dir="auto"
            type={isPassword ? (showPassword ? "text" : "password") : type}
            className={`w-full px-4 py-3 rounded-xl bg-surface border-2 text-text-primary
              placeholder:text-text-muted outline-none transition-all duration-300
              ${icon ? "ps-10" : ""}
              ${isPassword ? "ps-12" : ""}
              ${error 
                ? "border-danger focus:border-danger shadow-danger/20" 
                : "border-border focus:border-primary focus:shadow-lg focus:shadow-primary/10"
              }
              hover:border-primary/50 focus:scale-[1.01]
              ${className}`}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && (
          <p className="text-sm text-danger animate-slide-in-right">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";