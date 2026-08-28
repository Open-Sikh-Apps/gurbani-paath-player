import * as SystemUI from "expo-system-ui";
import { Appearance, type ColorValue } from "react-native";
import { colorScheme } from "react-native-css";

export type ThemePreference = "system" | "light" | "dark";
export type ColorSchemeName = "light" | "dark";

export function applyThemePreference(theme: ThemePreference) {
  if (theme === "system") {
    Appearance.setColorScheme("unspecified");
    return;
  }
  Appearance.setColorScheme(theme);
}

export function applyCssColorScheme(scheme: ColorSchemeName) {
  colorScheme.set(scheme);
}

export function applySystemBackground(color: ColorValue) {
  void SystemUI.setBackgroundColorAsync(color).catch(() => {
    // Activity can be gone after background.
  });
}
