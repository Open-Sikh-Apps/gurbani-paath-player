import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

import { useChrome } from "@/hooks/use-chrome";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Pressable, cn } from "@/tw";

const BACK_ICON =
  Platform.OS === "ios" ? "chevron-back" : "arrow-back";

export function HeaderCloseButton() {
  const { t } = useTranslation();
  const { hit, tabIcon } = useChrome();
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("settings.close")}
      className={cn("items-center justify-center px-3", hit)}
      onPress={() => router.back()}
    >
      <Ionicons name={BACK_ICON} size={tabIcon} color={colors.accent} />
    </Pressable>
  );
}
