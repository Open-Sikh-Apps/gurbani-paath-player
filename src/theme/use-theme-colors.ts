import { useColorScheme } from "react-native";

import { usePreferencesStore } from "@/state/preferences-store";
import {
  colorsFor,
  type ColorSchemeName,
  type ThemeColors,
} from "@/theme/colors";

export type { ThemeColors };

export function useIsDark(): boolean {
  const theme = usePreferencesStore((state) => state.theme);
  const colorScheme = useColorScheme();
  return theme === "dark" || (theme === "system" && colorScheme === "dark");
}

export function useThemeColors(): ThemeColors {
  return colorsFor(useIsDark() ? "dark" : "light");
}

export function schemeFromDark(isDark: boolean): ColorSchemeName {
  return isDark ? "dark" : "light";
}
