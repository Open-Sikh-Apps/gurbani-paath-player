import { useState } from "react";
import { Modal } from "react-native";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { IconButton } from "@/components/icon-button";
import { useChrome } from "@/hooks/use-chrome";
import { usePreferencesStore } from "@/state/preferences-store";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Pressable, Text, View, cn, ui } from "@/tw";

export type OverflowItem = {
  key: string;
  icon: AppIconName;
  label: string;
  onPress: () => void;
};

type OverflowMenuProps = {
  extraItems?: OverflowItem[];
};

export function OverflowMenu({ extraItems = [] }: OverflowMenuProps) {
  const { t } = useTranslation();
  const { hit, text, tabIcon } = useChrome();
  const colors = useThemeColors();
  const simpleMode = usePreferencesStore((state) => state.simpleMode);
  const setSimpleMode = usePreferencesStore((state) => state.setSimpleMode);
  const keepScreenOn = usePreferencesStore((state) => state.keepScreenOnWhilePlaying);
  const setKeepScreenOn = usePreferencesStore(
    (state) => state.setKeepScreenOnWhilePlaying,
  );
  const [open, setOpen] = useState(false);

  function close(): void {
    setOpen(false);
  }

  return (
    <>
      <IconButton
        name="more-vert"
        accessibilityLabel={t("home.menu")}
        size={tabIcon}
        color={colors.accent}
        className={hit}
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable className="flex-1" onPress={close}>
          <View
            className={cn(
              "absolute top-16 right-3 min-w-56 overflow-hidden rounded-2xl border",
              ui.border,
              ui.surface,
            )}
          >
            {extraItems.map((item, index) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                className={cn(
                  "flex-row items-center gap-3 px-4",
                  hit,
                  index > 0 && cn("border-t", ui.border),
                )}
                onPress={() => {
                  close();
                  item.onPress();
                }}
              >
                <AppIcon name={item.icon} size={tabIcon} color={colors.accent} />
                <Text className={cn("flex-1", ui.text, text)}>{item.label}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: simpleMode }}
              className={cn(
                "flex-row items-center gap-3 px-4",
                hit,
                extraItems.length > 0 && cn("border-t", ui.border),
              )}
              onPress={() => {
                setSimpleMode(!simpleMode);
                close();
              }}
            >
              <AppIcon name="text-fields" size={tabIcon} color={colors.accent} />
              <Text className={cn("flex-1", ui.text, text)}>
                {simpleMode ? t("home.simpleModeOff") : t("home.simpleModeOn")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: keepScreenOn }}
              className={cn("flex-row items-center gap-3 border-t px-4", ui.border, hit)}
              onPress={() => {
                setKeepScreenOn(!keepScreenOn);
                close();
              }}
            >
              <AppIcon
                name={keepScreenOn ? "brightness-high" : "brightness-medium"}
                size={tabIcon}
                color={colors.accent}
              />
              <Text className={cn("flex-1", ui.text, text)}>
                {keepScreenOn ? t("home.keepScreenOff") : t("home.keepScreenOn")}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
