import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { HeaderCloseButton } from "@/components/header-close-button";
import { NowPlayingScreen } from "@/screens/now-playing";

export default function NowPlayingRoute() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          title: t("nowPlaying.title"),
          headerLeft: () => <HeaderCloseButton />,
        }}
      />
      <NowPlayingScreen />
    </>
  );
}
