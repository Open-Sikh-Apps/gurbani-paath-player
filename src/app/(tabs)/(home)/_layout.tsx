import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export const unstable_settings = {
  anchor: "index",
};

export default function HomeStackLayout() {
  const { t } = useTranslation();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: t("home.title") }} />
      <Stack.Screen name="a/[albumId]" options={{ headerShown: false }} />
    </Stack>
  );
}
