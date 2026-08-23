import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { useChrome } from "@/hooks/use-chrome";
import { Text, View, cn, ui } from "@/tw";

export function AlbumScreen() {
  const { t } = useTranslation();
  const { body } = useChrome();
  const { albumId, trackId } = useLocalSearchParams<{
    albumId: string;
    trackId?: string | string[];
  }>();
  const track = Array.isArray(trackId) ? trackId[0] : trackId;

  return (
    <>
      <Stack.Screen options={{ title: t("album.title") }} />
      <View className={cn("flex-1 items-center justify-center px-6", ui.page)}>
        <Text className={cn("text-center", ui.muted, body)}>
          {track
            ? t("album.trackPlaceholder", { albumId, trackId: track })
            : t("album.placeholder", { albumId })}
        </Text>
      </View>
    </>
  );
}
