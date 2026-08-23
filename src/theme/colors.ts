export const palette = {
  light: {
    bg: "#F7F0E4",
    surface: "#FFF8EE",
    text: "#1A2744",
    textMuted: "#5A6578",
    accent: "#C65A12",
    accentFg: "#FFF8EE",
    tabBar: "#FFF8EE",
    border: "#E6D9C6",
  },
  dark: {
    bg: "#0F1724",
    surface: "#1A2436",
    text: "#F7F0E4",
    textMuted: "#A8B0BE",
    accent: "#E8893A",
    accentFg: "#0F1724",
    tabBar: "#151E2E",
    border: "#2A3648",
  },
} as const;

export type ColorSchemeName = "light" | "dark";
export type ThemeColors = (typeof palette)[ColorSchemeName];

export function colorsFor(scheme: ColorSchemeName): ThemeColors {
  return palette[scheme];
}

/** NativeWind `@theme` names (`--color-{cssName}` and `--color-{cssName}-dark`). */
export const CSS_COLOR_TOKENS = [
  ["bg", "bg"],
  ["surface", "surface"],
  ["text", "text"],
  ["textMuted", "text-muted"],
  ["accent", "accent"],
  ["accentFg", "accent-fg"],
  ["tabBar", "tab-bar"],
  ["border", "border"],
] as const satisfies readonly (readonly [keyof ThemeColors, string])[];

