import "@/global.css";
import "@/i18n";

import {
  NotoSansGurmukhi_400Regular,
  NotoSansGurmukhi_700Bold,
  useFonts,
} from "@expo-google-fonts/noto-sans-gurmukhi";
import { Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { NavigationBar } from 'expo-navigation-bar';

import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { hydrateCatalogue, refreshCatalogue } from "@/catalogue";
import { PlaybackKeepAwake } from "@/components/playback-keep-awake";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import i18n from "@/i18n";
import { initPlayback } from "@/playback";
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
import { View, cn, ui } from "@/tw";

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
  const [catalogueHydrated, setCatalogueHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void hydrateCatalogue().finally(() => {
      if (cancelled) {
        return;
      }
      setCatalogueHydrated(true);
      initPlayback();
      void refreshCatalogue();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    function applyChrome(): void {
      applyCssColorScheme(schemeFromDark(isDark));
      applySystemBackground(colors.bg);
    }
    applyChrome();
    let latestTimerId: number | undefined;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        if (latestTimerId) {
          clearTimeout(latestTimerId);
        }
        latestTimerId = setTimeout(applyChrome, 300);
      } else {
        if (latestTimerId) {
          clearTimeout(latestTimerId);
        }
        latestTimerId = undefined;
      }
    });
    return () => {
      if (latestTimerId) {
        clearTimeout(latestTimerId);
      }
      sub.remove();
    };
  }, [colors.bg, isDark]);

  if ((!fontsLoaded && !fontError) || !catalogueHydrated) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme(isDark, colors)}>
      <View className={cn("flex-1", ui.page)}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <PlaybackKeepAwake />
        <Stack
          screenOptions={{
            headerShown: false
          }}
        >
        <Stack.Protected guard={!hasCompletedWizard}>
          <Stack.Screen name="wizard" />
        </Stack.Protected>
        <Stack.Protected guard={hasCompletedWizard}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="settings"
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="now-playing"
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="bookmarks"
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
            }}
          />
        </Stack.Protected>
        </Stack>
        <NavigationBar style={isDark ? "light" : "dark"}/>
      </View>
    </ThemeProvider>
  );
}
