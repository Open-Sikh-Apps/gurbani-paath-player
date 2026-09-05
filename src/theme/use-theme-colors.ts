import { Appearance, useColorScheme } from "react-native";

import { usePreferencesStore } from "@/state/preferences-store";
import {
  colorsFor,
  type ColorSchemeName,
  type ThemeColors,
} from "@/theme/colors";

export type { ThemeColors, ColorSchemeName };

export function resolvedColorScheme(): ColorSchemeName {
  const theme = usePreferencesStore.getState().theme;
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export function subscribeResolvedColorScheme(listener: () => void): () => void {
  const appearance = Appearance.addChangeListener(listener);
  const unsubTheme = usePreferencesStore.subscribe((state, previous) => {
    if (state.theme !== previous.theme) {
      listener();
    }
  });
  return () => {
    unsubTheme();
    appearance.remove();
  };
}

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
