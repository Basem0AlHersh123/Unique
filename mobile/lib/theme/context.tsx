import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

export type ThemeMode = "dark" | "light";

export interface ThemeColors {
  background: string;
  card: string;
  border: string;
  accent: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  danger: string;
  success: string;
  overlay: string;
  inputBg: string;
}

const darkColors: ThemeColors = {
  background: "#0f0a2e",
  card: "#1a1040",
  border: "#2d1f6e",
  accent: "#6C63FF",
  text: "#ffffff",
  textSecondary: "#94a3b8",
  textTertiary: "#475569",
  textInverse: "#0f0a2e",
  danger: "#EF4444",
  success: "#22C55E",
  overlay: "rgba(0,0,0,0.7)",
  inputBg: "#0f0a2e",
};

const lightColors: ThemeColors = {
  background: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  accent: "#6C63FF",
  text: "#1e293b",
  textSecondary: "#64748b",
  textTertiary: "#94a3b8",
  textInverse: "#ffffff",
  danger: "#EF4444",
  success: "#22C55E",
  overlay: "rgba(0,0,0,0.4)",
  inputBg: "#f1f5f9",
};

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "unique_mobile_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored === "dark" || stored === "light") {
        setModeState(stored);
      }
      setReady(true);
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    SecureStore.setItemAsync(STORAGE_KEY, newMode);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      SecureStore.setItemAsync(STORAGE_KEY, next);
      return next;
    });
  }, []);

  if (!ready) return null;

  const colors = mode === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, setMode, colors, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
