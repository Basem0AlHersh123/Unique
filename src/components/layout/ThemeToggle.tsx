"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Laptop } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-10 h-10 shimmer rounded-full" />;

  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="theme-toggle relative w-10 h-10 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all duration-300 flex items-center justify-center group shadow-sm hover:shadow-md"
      aria-label="Toggle theme"
    >
      <div className="relative transition-transform duration-500 group-hover:rotate-12">
        {isDark ? (
          <Moon className="w-5 h-5 text-primary" />
        ) : (
          <Sun className="w-5 h-5 text-warning" />
        )}
      </div>
      <span className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}