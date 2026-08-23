import Ionicons from "@expo/vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import { useChrome } from "@/hooks/use-chrome";
import { SYSTEM_LOCALE, UI_LOCALES } from "@/i18n/locales";
import { usePreferencesStore } from "@/state/preferences-store";
import type { ThemePreference } from "@/theme/apply-theme";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Pressable, ScrollView, Text, View, cn, ui } from "@/tw";

const THEME_OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: "system", labelKey: "settings.themeSystem" },
  { value: "light", labelKey: "settings.themeLight" },
  { value: "dark", labelKey: "settings.themeDark" },
];

export function SettingsScreen() {
  const { t } = useTranslation();
  const { hit, text, body, simpleMode } = useChrome();
  const localePreference = usePreferencesStore((state) => state.locale);
  const theme = usePreferencesStore((state) => state.theme);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const setSimpleMode = usePreferencesStore((state) => state.setSimpleMode);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const colors = useThemeColors();
  const languageOptions = [
    { code: SYSTEM_LOCALE, label: t("settings.languageSystem") },
    ...UI_LOCALES.map((item) => ({
      code: item.code,
      label: item.nativeName,
    })),
  ];

  return (
    <ScrollView
      className={cn("flex-1", ui.page)}
      contentContainerClassName="gap-8 px-5 py-6 pb-safe"
    >
      <View className="gap-3">
        <Text className={cn(ui.muted, body)}>{t("settings.language")}</Text>
        <View
          className={cn("overflow-hidden rounded-2xl border", ui.border, ui.surface)}
        >
          {languageOptions.map((item, index) => {
            const selected = item.code === localePreference;
            return (
              <Pressable
                key={item.code}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={cn(
                  "flex-row items-center justify-between px-4",
                  hit,
                  index > 0 && cn("border-t", ui.border),
                )}
                onPress={() => setLocale(item.code)}
              >
                <Text className={cn(ui.text, text)}>{item.label}</Text>
                {selected ? (
                  <Ionicons name="checkmark" size={22} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-3">
        <Text className={cn(ui.muted, body)}>{t("settings.simpleMode")}</Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: simpleMode }}
          className={cn(
            "flex-row items-center justify-between rounded-2xl border px-4",
            ui.border,
            ui.surface,
            hit,
          )}
          onPress={() => setSimpleMode(!simpleMode)}
        >
          <View className="mr-4 flex-1 gap-1">
            <Text className={cn(ui.text, text)}>{t("settings.simpleMode")}</Text>
            <Text className={cn(ui.muted, simpleMode ? "text-base" : "text-sm")}>
              {t("settings.simpleModeHint")}
            </Text>
          </View>
          <View
            className={cn(
              "h-8 w-14 justify-center rounded-full px-1",
              simpleMode ? ui.fillAccent : ui.fillBorder,
            )}
          >
            <View
              className={cn(
                "h-6 w-6 rounded-full",
                ui.fillSurface,
                simpleMode ? "self-end" : "self-start",
              )}
            />
          </View>
        </Pressable>
      </View>

      <View className="gap-3">
        <Text className={cn(ui.muted, body)}>{t("settings.theme")}</Text>
        <View
          className={cn("overflow-hidden rounded-2xl border", ui.border, ui.surface)}
        >
          {THEME_OPTIONS.map((option, index) => {
            const selected = option.value === theme;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={cn(
                  "flex-row items-center justify-between px-4",
                  hit,
                  index > 0 && cn("border-t", ui.border),
                )}
                onPress={() => setTheme(option.value)}
              >
                <Text className={cn(ui.text, text)}>{t(option.labelKey)}</Text>
                {selected ? (
                  <Ionicons name="checkmark" size={22} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
