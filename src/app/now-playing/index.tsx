import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { HeaderCloseButton } from "@/components/header-close-button";
import { NowPlayingAlbumButton } from "@/components/now-playing-album-button";
import { OverflowMenu } from "@/components/overflow-menu";
import { NowPlayingScreen } from "@/screens/now-playing";
import { View } from "@/tw";

export default function NowPlayingRoute() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          title: t("nowPlaying.title"),
          headerLeft: () => <HeaderCloseButton />,
          headerRight: () => (
            <View className="flex-row items-center">
              <NowPlayingAlbumButton />
              <OverflowMenu />
            </View>
          ),
        }}
      />
      <NowPlayingScreen />
    </>
  );
}
