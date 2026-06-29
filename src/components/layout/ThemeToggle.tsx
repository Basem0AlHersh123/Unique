"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-10 h-10 shimmer rounded-full" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="theme-toggle relative w-12 h-12 rounded-2xl bg-surface border border-border hover:border-primary/50 transition-all duration-300 flex items-center justify-center group"
      aria-label="Toggle theme"
    >
      <div className="relative">
        {isDark ? (
          <Moon className="w-5 h-5 text-primary group-hover:rotate-12 transition-transform" />
        ) : (
          <Sun className="w-5 h-5 text-warning group-hover:rotate-12 transition-transform" />
        )}
      </div>
      <span className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}