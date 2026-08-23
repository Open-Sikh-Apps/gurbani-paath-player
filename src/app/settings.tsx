import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { HeaderCloseButton } from "@/components/header-close-button";
import { SettingsScreen } from "@/screens/settings";

export default function SettingsRoute() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          title: t("settings.title"),
          headerLeft: () => <HeaderCloseButton />,
        }}
      />
      <SettingsScreen />
    </>
  );
}
