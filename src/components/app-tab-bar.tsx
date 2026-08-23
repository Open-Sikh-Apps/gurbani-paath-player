import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, router, Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";

import { MiniPlayer } from "@/components/mini-player";
import { useChrome } from "@/hooks/use-chrome";
import { useExitAppFromTabRoot } from "@/hooks/use-exit-app-from-tab-root";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Pressable, Text, View, cn, ui } from "@/tw";

type AppTabBarProps = NonNullable<
  ComponentProps<typeof Tabs>["tabBar"]
> extends (props: infer P) => unknown
  ? P
  : never;

type TabName = "(home)" | "(library)";

const TAB_ICONS: Record<
  TabName,
  { focused: keyof typeof Ionicons.glyphMap; idle: keyof typeof Ionicons.glyphMap }
> = {
  "(home)": { focused: "home", idle: "home-outline" },
  "(library)": { focused: "library", idle: "library-outline" },
};

function isTabName(name: string): name is TabName {
  return name === "(home)" || name === "(library)";
}

export function AppTabBar({ state, navigation, insets }: AppTabBarProps) {
  const { t } = useTranslation();
  const { hit, text, tabIcon, simpleMode } = useChrome();
  const colors = useThemeColors();
  useExitAppFromTabRoot(state.routes[state.index]?.state);

  function openTab(routeName: string, routeKey: string, isFocused: boolean) {
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });
    if (event.defaultPrevented) {
      return;
    }
    if (isFocused) {
      navigation.navigate(routeName, { screen: "index" });
      return;
    }
    navigation.navigate(routeName, { screen: "index" });
  }

  return (
    <View className={cn("border-t", ui.tabBar)}>
      <MiniPlayer />
      <View
        className={cn("flex-row", simpleMode ? "pt-3" : "pt-1")}
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        {state.routes.map((route, index) => {
          if (!isTabName(route.name)) {
            return null;
          }
          const isFocused = state.index === index;
          const labelKey =
            route.name === "(home)" ? "tabs.home" : "tabs.library";
          const icon = TAB_ICONS[route.name];
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={t(labelKey)}
              className={cn("flex-1 items-center justify-center px-2", hit)}
              onPress={() => openTab(route.name, route.key, isFocused)}
            >
              <Ionicons
                name={isFocused ? icon.focused : icon.idle}
                size={tabIcon}
                color={isFocused ? colors.accent : colors.textMuted}
              />
              <Text
                className={cn(
                  "mt-1 font-medium",
                  text,
                  isFocused ? ui.accent : ui.muted,
                )}
              >
                {t(labelKey)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("tabs.settings")}
          className={cn("flex-1 items-center justify-center px-2", hit)}
          onPress={() => router.navigate("/settings" as Href)}
        >
          <Ionicons
            name="settings-outline"
            size={tabIcon}
            color={colors.textMuted}
          />
          <Text className={cn("mt-1 font-medium", ui.muted, text)}>
            {t("tabs.settings")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
