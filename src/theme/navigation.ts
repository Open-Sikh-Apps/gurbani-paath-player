import { DarkTheme, DefaultTheme, type Theme } from "expo-router";

import type { ThemeColors } from "@/theme/colors";

export function navigationTheme(isDark: boolean, colors: ThemeColors): Theme {
  return {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.accent,
      background: colors.bg,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };
}
