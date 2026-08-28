import { useTranslation } from "react-i18next";

import { PlaybackStatusLine } from "@/components/playback-status-line";
import { resolveL10n } from "@/catalogue";
import { IconButton } from "@/components/icon-button";
import { useChrome } from "@/hooks/use-chrome";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import { togglePlayPause, usePlaybackStore } from "@/playback";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Pressable, Text, View, cn, ui } from "@/tw";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";

export function MiniPlayer() {
  const { t } = useTranslation();
  const { text, hit, tabIcon } = useChrome();
  const locale = useResolvedLocale();
  const colors = useThemeColors();
  const session = usePlaybackStore((state) => state.session);
  const playing = usePlaybackStore((state) => state.playing);
  const currentTrackId = usePlaybackStore((state) => state.currentTrackId);
  const { navigate } = useDebouncedNavigation();

  if (!session) {
    return null;
  }

  const track = session.tracks.find((item) => item.id === currentTrackId);
  const label = track
    ? resolveL10n(track.title, locale)
    : resolveL10n(session.reciterName, locale);

  return (
    <View className={cn("flex-row items-center border-b px-3 py-1", ui.border)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("miniPlayer.open")}
        className={cn("min-w-0 flex-1 justify-center px-1", hit)}
        onPress={() => navigate("/now-playing")}
      >
        <Text className={cn(ui.text, text)} numberOfLines={1}>
          {label}
        </Text>
        <Text className={cn(ui.muted, text)} numberOfLines={1}>
          {resolveL10n(session.reciterName, locale)}
        </Text>
        <PlaybackStatusLine className="mt-0.5" />
      </Pressable>
      <IconButton
        name={playing ? "pause" : "play-arrow"}
        accessibilityLabel={playing ? t("player.pause") : t("player.play")}
        size={tabIcon}
        color={colors.accent}
        className={hit}
        onPress={togglePlayPause}
      />
    </View>
  );
}
