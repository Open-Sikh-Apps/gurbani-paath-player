import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

import { IconButton } from "@/components/icon-button";
import { useChrome } from "@/hooks/use-chrome";
import { useThemeColors } from "@/theme/use-theme-colors";

export function HeaderCloseButton() {
  const { t } = useTranslation();
  const { hit, tabIcon } = useChrome();
  const colors = useThemeColors();

  return (
    <IconButton
      name={Platform.OS === "ios" ? "arrow-back-ios" : "arrow-back"}
      accessibilityLabel={t("settings.close")}
      size={tabIcon}
      color={colors.accent}
      className={hit}
      onPress={() => router.back()}
    />
  );
}
