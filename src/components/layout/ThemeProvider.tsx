"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Wraps the app so any component can call useTheme() to read/toggle
 * dark vs light mode. attribute="class" means it toggles the `dark`
 * class on <html>, which is exactly what our globals.css .dark rules
 * are waiting for.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
