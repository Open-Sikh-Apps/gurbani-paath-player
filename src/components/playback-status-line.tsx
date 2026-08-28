import { useTranslation } from "react-i18next";

import { useChrome } from "@/hooks/use-chrome";
import { usePlaybackStore } from "@/playback";
import { Text, View, cn, ui } from "@/tw";

export function PlaybackStatusLine({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { text } = useChrome();
  const buffering = usePlaybackStore((state) => state.buffering);
  const error = usePlaybackStore((state) => state.error);
  const message = error ?? (buffering ? t("player.buffering") : " ");

  return (
    <View className={cn("min-h-12 justify-center", className)}>
      <Text
        className={cn(error ? ui.accent : ui.muted, text)}
        numberOfLines={2}
      >
        {message}
      </Text>
    </View>
  );
}
