import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { useChrome } from "@/hooks/use-chrome";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { SYSTEM_LOCALE, UI_LOCALES } from "@/i18n/locales";
import {
  setRemotePrimary as applyRemotePrimary,
  type RemotePrimary,
} from "@/playback";
import { usePreferencesStore } from "@/state/preferences-store";
import type { ThemePreference } from "@/theme/apply-theme";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Pressable, ScrollView, Text, View, cn, ui } from "@/tw";

const THEME_OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: "system", labelKey: "settings.themeSystem" },
  { value: "light", labelKey: "settings.themeLight" },
  { value: "dark", labelKey: "settings.themeDark" },
];

const REMOTE_PRIMARY_OPTIONS: { value: RemotePrimary; labelKey: string }[] = [
  { value: "seek", labelKey: "settings.remotePrimarySeek" },
  { value: "skip", labelKey: "settings.remotePrimarySkip" },
];

export function SettingsScreen() {
  const { t } = useTranslation();
  const { hit, text, body, simpleMode } = useChrome();
  const localePreference = usePreferencesStore((state) => state.locale);
  const theme = usePreferencesStore((state) => state.theme);
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const setSimpleMode = usePreferencesStore((state) => state.setSimpleMode);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const keepScreenOnWhilePlaying = usePreferencesStore(
    (state) => state.keepScreenOnWhilePlaying,
  );
  const setKeepScreenOnWhilePlaying = usePreferencesStore(
    (state) => state.setKeepScreenOnWhilePlaying,
  );
  const remotePrimary = usePreferencesStore((state) => state.remotePrimary);
  const setRemotePrimary = usePreferencesStore((state) => state.setRemotePrimary);
  const colors = useThemeColors();
  const { navigate } = useDebouncedNavigation();
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
      contentContainerClassName="gap-8 px-6 py-6"
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
                  <AppIcon name="check" size={22} color={colors.accent} />
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
        <Text className={cn(ui.muted, body)}>{t("settings.keepScreenOn")}</Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: keepScreenOnWhilePlaying }}
          className={cn(
            "flex-row items-center justify-between rounded-2xl border px-4",
            ui.border,
            ui.surface,
            hit,
          )}
          onPress={() => setKeepScreenOnWhilePlaying(!keepScreenOnWhilePlaying)}
        >
          <View className="mr-4 flex-1 gap-1">
            <Text className={cn(ui.text, text)}>{t("settings.keepScreenOn")}</Text>
            <Text className={cn(ui.muted, simpleMode ? "text-base" : "text-sm")}>
              {t("settings.keepScreenOnHint")}
            </Text>
          </View>
          <View
            className={cn(
              "h-8 w-14 justify-center rounded-full px-1",
              keepScreenOnWhilePlaying ? ui.fillAccent : ui.fillBorder,
            )}
          >
            <View
              className={cn(
                "h-6 w-6 rounded-full",
                ui.fillSurface,
                keepScreenOnWhilePlaying ? "self-end" : "self-start",
              )}
            />
          </View>
        </Pressable>
      </View>

      <View className="gap-3">
        <Text className={cn(ui.muted, body)}>{t("settings.remotePrimary")}</Text>
        <View
          className={cn("overflow-hidden rounded-2xl border", ui.border, ui.surface)}
        >
          {REMOTE_PRIMARY_OPTIONS.map((option, index) => {
            const selected = option.value === remotePrimary;
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
                onPress={() => {
                  setRemotePrimary(option.value);
                  applyRemotePrimary(option.value);
                }}
              >
                <Text className={cn(ui.text, text)}>{t(option.labelKey)}</Text>
                {selected ? (
                  <AppIcon name="check" size={22} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <Text className={cn(ui.muted, simpleMode ? "text-base" : "text-sm")}>
          {t("settings.remotePrimaryHint")}
        </Text>
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
                  <AppIcon name="check" size={22} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("resources.title")}
        className={cn(
          "flex-row items-center justify-between rounded-2xl border px-4",
          ui.border,
          ui.surface,
          hit,
        )}
        onPress={() => navigate("/settings/resources")}
      >
        <Text className={cn(ui.text, text)}>{t("resources.title")}</Text>
        <AppIcon name="chevron-right" size={22} color={colors.accent} />
      </Pressable>
    </ScrollView>
  );
}
