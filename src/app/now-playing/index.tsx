import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { HeaderCloseButton } from "@/components/header-close-button";
import { OverflowMenu } from "@/components/overflow-menu";
import { NowPlayingScreen } from "@/screens/now-playing";

export default function NowPlayingRoute() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          title: t("nowPlaying.title"),
          // Full-screen modal has no parent title to generate Back; this dismisses the modal.
          headerLeft: () => <HeaderCloseButton />,
          headerRight: () => <OverflowMenu />,
        }}
      />
      <NowPlayingScreen />
    </>
  );
}
