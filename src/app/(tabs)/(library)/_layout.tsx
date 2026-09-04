import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { useOfflineStackOptions } from "@/hooks/use-offline-stack-options";

// Library album pushes would otherwise be the stack root; Back would leave the app.
export const unstable_settings = {
  anchor: "index",
};

export default function LibraryStackLayout() {
  const { t } = useTranslation();
  const offlineHeader = useOfflineStackOptions();

  return (
    <Stack screenOptions={offlineHeader}>
      <Stack.Screen name="index" options={{ title: t("library.title") }} />
      <Stack.Screen name="history" options={{ title: t("history.title") }} />
      <Stack.Screen
        name="album/[albumId]"
        // Nested album stack owns the header; showing this one would double it.
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
