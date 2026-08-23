import "@/global.css";
import "@/i18n";

import {
  NotoSansGurmukhi_400Regular,
  NotoSansGurmukhi_700Bold,
  useFonts,
} from "@expo-google-fonts/noto-sans-gurmukhi";
import { Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import i18n from "@/i18n";
import { usePreferencesStore } from "@/state/preferences-store";
import {
  applyCssColorScheme,
  applySystemBackground,
  applyThemePreference,
} from "@/theme/apply-theme";
import { navigationTheme } from "@/theme/navigation";
import {
  schemeFromDark,
  useIsDark,
  useThemeColors,
} from "@/theme/use-theme-colors";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansGurmukhi: NotoSansGurmukhi_400Regular,
    "NotoSansGurmukhi-Bold": NotoSansGurmukhi_700Bold,
  });
  const hasCompletedWizard = usePreferencesStore(
    (state) => state.hasCompletedWizard,
  );
  const locale = useResolvedLocale();
  const theme = usePreferencesStore((state) => state.theme);
  const isDark = useIsDark();
  const colors = useThemeColors();

  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    applyCssColorScheme(schemeFromDark(isDark));
    applySystemBackground(colors.bg);
  }, [colors.bg, isDark]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme(isDark, colors)}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!hasCompletedWizard}>
          <Stack.Screen name="wizard" />
        </Stack.Protected>
        <Stack.Protected guard={hasCompletedWizard}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="settings"
            options={{
              presentation: "fullScreenModal",
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="now-playing"
            options={{
              presentation: "fullScreenModal",
              headerShown: true,
            }}
          />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
