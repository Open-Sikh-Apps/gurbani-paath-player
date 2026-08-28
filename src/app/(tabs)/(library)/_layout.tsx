import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";


export const unstable_settings = {
  anchor: "index",
};

export default function LibraryStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t("library.title") }} />
      <Stack.Screen name="history" options={{ title: t("history.title") }} />
      <Stack.Screen name="album/[albumId]" options={{ headerShown: false }} />
    </Stack>
  );
}
