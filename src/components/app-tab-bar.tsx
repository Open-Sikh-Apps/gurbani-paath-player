import { StackActions } from "expo-router/react-navigation";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppToastSlot } from "@/feedback/toast";
import { MiniPlayer } from "@/components/mini-player";
import { useChrome } from "@/hooks/use-chrome";
import { useExitAppFromTabRoot } from "@/hooks/use-exit-app-from-tab-root";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Pressable, Text, View, cn, ui } from "@/tw";
import { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEBOUNCE_NAVIGATION_DELAY, useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { useDebouncedCallback } from "use-debounce";

type TabName = "(home)" | "(library)";

const TAB_ICONS: Record<TabName, AppIconName> = {
  "(home)": "explore",
  "(library)": "collections-bookmark",
};

function isTabName(name: string): name is TabName {
  return name === "(home)" || name === "(library)";
}

/** Custom tab chrome. Toast slot is a sibling above mini-player/tabs so toasts sit on the list, not under the bar. */
export function AppTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { hit, text, tabIcon, simpleMode } = useChrome();
  const colors = useThemeColors();
  const safe = useSafeAreaInsets();
  useExitAppFromTabRoot(state.routes[state.index]?.state);
  const { navigate } = useDebouncedNavigation();

  // Re-tapping the focused tab pops its nested stack (Home/Library roots).
  function popTabToRoot(routeKey: string) {
    const route = state.routes.find((item) => item.key === routeKey);
    const nestedKey = route?.state?.key;
    const nestedIndex = route?.state?.index;
    if (!nestedKey || typeof nestedIndex !== "number" || nestedIndex < 1) {
      return;
    }
    navigation.dispatch({
      ...StackActions.popToTop(),
      target: nestedKey,
    });
  }

  const debouncedOpenTab = useDebouncedCallback((routeName: string, routeKey: string, isFocused: boolean) => {
    openTab(routeName, routeKey, isFocused);
  }, DEBOUNCE_NAVIGATION_DELAY,
    { leading: true, trailing: false }
  );

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
      popTabToRoot(routeKey);
      return;
    }
    navigation.navigate(routeName);
  }

  return (
    <View className="relative">
      {/* Sibling above chrome: AppToastSlot uses bottom-full against this box so the toast sits on the list. */}
      <AppToastSlot />
      <View className={cn("border-t", ui.tabBar)}>
        <MiniPlayer />
        <View
          className={cn("flex-row", simpleMode ? "pt-3" : "pt-1")}
          // TabBar insets and SafeAreaInsets can disagree on gesture-nav Android; take the max.
          style={{ paddingBottom: Math.max(insets.bottom, safe.bottom, 8) }}
        >
          {state.routes.map((route, index) => {
            if (!isTabName(route.name)) {
              return null;
            }
            const isFocused = state.index === index;
            const labelKey =
              route.name === "(home)" ? "tabs.home" : "tabs.library";
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={t(labelKey)}
                className={cn("flex-1 items-center justify-center px-2", hit)}
                onPress={() => debouncedOpenTab(route.name, route.key, isFocused)}
              >
                <AppIcon
                  name={TAB_ICONS[route.name]}
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
          {/* Settings is a stack screen, not a tab, so this bar does not keep a Settings history. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("tabs.settings")}
            className={cn("flex-1 items-center justify-center px-2", hit)}
            onPress={() => navigate("/settings")}
          >
            <AppIcon
              name="settings"
              size={tabIcon}
              color={colors.textMuted}
            />
            <Text className={cn("mt-1 font-medium", ui.muted, text)}>
              {t("tabs.settings")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
