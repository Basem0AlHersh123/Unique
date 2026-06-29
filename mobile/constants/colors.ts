/**
 * UNIQUE Design System — single source of truth for all colors.
 * Import COLORS instead of hardcoding hex strings in screens.
 */
export const COLORS = {
  // Backgrounds
  bg:        "#0f0a2e",   // main background (deep dark purple)
  surface:   "#1a1040",   // card / input background
  border:    "#2d1f6e",   // border color
  borderHover: "#4C3F9E", // focused border

  // Brand
  primary:   "#6C63FF",   // purple — buttons, accents
  secondary: "#06B6D4",   // teal — secondary accents
  accent:    "#EC4899",   // pink — highlights
  gold:      "#F59E0B",   // gold — premium, warnings

  // Semantic
  success:   "#22C55E",
  warning:   "#F59E0B",
  error:     "#EF4444",

  // Text
  text:      "#ffffff",
  textMuted: "#94a3b8",
  textDim:   "#475569",
  textBody:  "#cbd5e1",
} as const;

export type ColorKey = keyof typeof COLORS;
