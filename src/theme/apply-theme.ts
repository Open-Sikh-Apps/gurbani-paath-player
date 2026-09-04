import * as SystemUI from "expo-system-ui";
import { Appearance, type ColorValue } from "react-native";
import { colorScheme } from "react-native-css";

import { retryUntilActivity } from "@/native/retry-until-activity";

export type ThemePreference = "system" | "light" | "dark";
export type ColorSchemeName = "light" | "dark";

export function applyThemePreference(theme: ThemePreference) {
  if (theme === "system") {
    // `unspecified` lets the OS drive RN Appearance; `null` is not a valid scheme.
    Appearance.setColorScheme("unspecified");
    return;
  }
  Appearance.setColorScheme(theme);
}

export function applyCssColorScheme(scheme: ColorSchemeName) {
  // NativeWind v5 `dark:` reads this, not Appearance.setColorScheme.
  colorScheme.set(scheme);
}

let systemBackgroundAbort: AbortController | undefined;

export function applySystemBackground(color: ColorValue) {
  systemBackgroundAbort?.abort();
  const controller = new AbortController();
  systemBackgroundAbort = controller;
  // Native setBackgroundColor throws when the Activity is gone (notification remount).
  void retryUntilActivity(
    () => SystemUI.setBackgroundColorAsync(color),
    controller.signal,
  ).catch(() => {
    // Aborted for a newer color, or the Activity never came back.
  });
}
