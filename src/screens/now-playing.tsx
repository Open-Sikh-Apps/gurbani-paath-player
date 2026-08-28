import * as Linking from "expo-linking";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import { IconButton } from "@/components/icon-button";
import { PlaybackScrubber } from "@/components/playback-scrubber";
import { PlaybackStatusLine } from "@/components/playback-status-line";
import {
  getScriptureById,
  resolveL10n,
  useCatalogueStore,
} from "@/catalogue";
import { useChrome } from "@/hooks/use-chrome";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import {
  PLAYBACK_RATE_MAX,
  PLAYBACK_RATE_MIN,
  PLAYBACK_RATE_STEP,
  clampPlaybackRate,
  seekBy,
  seekTo,
  setPlaybackRate,
  skipNext,
  skipPrevious,
  togglePlayPause,
  usePlaybackStore,
  useSleepTimerStore,
} from "@/playback";
import { useThemeColors } from "@/theme/use-theme-colors";
import { ScrollView, Text, View, cn, ui } from "@/tw";

const SEEK_SEC = 10;

function formatRate(rate: number): string {
  return `${parseFloat(rate.toFixed(2))}×`;
}

export function NowPlayingScreen() {
  const { t } = useTranslation();
  const locale = useResolvedLocale();
  const { text, hit, title, playerIcon, playerPlayIcon } = useChrome();
  const colors = useThemeColors();
  const session = usePlaybackStore((state) => state.session);
  const playing = usePlaybackStore((state) => state.playing);
  const currentTrackId = usePlaybackStore((state) => state.currentTrackId);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const positionSec = usePlaybackStore((state) => state.positionSec);
  const durationSec = usePlaybackStore((state) => state.durationSec);
  const rate = usePlaybackStore((state) => state.rate);
  const { navigate } = useDebouncedNavigation();
  const catalogue = useCatalogueStore((state) => state.catalogue);
  const sleepKind = useSleepTimerStore((state) => state.kind);

  if (!session) {
    return (
      <View className={cn("flex-1 items-center justify-center px-6", ui.page)}>
        <Text className={cn("text-center", ui.muted, text)}>
          {t("nowPlaying.placeholder")}
        </Text>
      </View>
    );
  }

  const track = session.tracks.find((item) => item.id === currentTrackId);
  const reciter = resolveL10n(session.reciterName, locale);
  const heading = track ? resolveL10n(track.title, locale) : reciter;
  const isLast = currentIndex >= session.tracks.length - 1;
  const atMinRate = rate <= PLAYBACK_RATE_MIN;
  const atMaxRate = rate >= PLAYBACK_RATE_MAX;
  const scripture = session.scriptureId
    ? getScriptureById(catalogue, session.scriptureId)
    : undefined;
  const showReadAlong = track?.startAng != null && scripture?.sttmCoSlug != null;

  return (
    <ScrollView
      className={cn("flex-1", ui.page)}
      contentContainerClassName="flex-grow justify-between gap-8 px-6 py-6"
    >
      <View className="gap-2">
        <Text className={cn(ui.muted, text)} numberOfLines={1}>
          {reciter}
        </Text>
        <Text className={cn(ui.text, title)} numberOfLines={2}>
          {heading}
        </Text>
        <PlaybackStatusLine />
      </View>

      <PlaybackScrubber
        positionSec={positionSec}
        durationSec={durationSec}
        onSeek={seekTo}
      />

      <View className="flex-row items-center justify-between">
        <IconButton
          name="skip-previous"
          accessibilityLabel={t("player.previous")}
          size={playerIcon}
          color={colors.accent}
          className={hit}
          onPress={skipPrevious}
        />
        <IconButton
          name="replay-10"
          accessibilityLabel={t("player.seekBack")}
          size={playerIcon}
          color={colors.accent}
          className={hit}
          onPress={() => seekBy(-SEEK_SEC)}
        />
        <IconButton
          name={playing ? "pause-circle" : "play-circle"}
          accessibilityLabel={playing ? t("player.pause") : t("player.play")}
          size={playerPlayIcon}
          color={colors.accent}
          className={hit}
          onPress={togglePlayPause}
        />
        <IconButton
          name="forward-10"
          accessibilityLabel={t("player.seekForward")}
          size={playerIcon}
          color={colors.accent}
          className={hit}
          onPress={() => seekBy(SEEK_SEC)}
        />
        <IconButton
          name="skip-next"
          accessibilityLabel={t("player.next")}
          size={playerIcon}
          color={colors.accent}
          className={hit}
          disabled={isLast}
          onPress={skipNext}
        />
      </View>

      <View className="flex-row items-center justify-center gap-6">
        <IconButton
          name="remove"
          accessibilityLabel={t("player.rateSlower")}
          size={playerIcon}
          color={colors.accent}
          className={hit}
          disabled={atMinRate}
          onPress={() => setPlaybackRate(clampPlaybackRate(rate - PLAYBACK_RATE_STEP))}
        />
        <Text className={cn("min-w-16 text-center font-semibold", ui.text, text)}>
          {formatRate(rate)}
        </Text>
        <IconButton
          name="add"
          accessibilityLabel={t("player.rateFaster")}
          size={playerIcon}
          color={colors.accent}
          className={hit}
          disabled={atMaxRate}
          onPress={() => setPlaybackRate(clampPlaybackRate(rate + PLAYBACK_RATE_STEP))}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <IconButton
          name={sleepKind === "off" ? "bedtime" : "nights-stay"}
          accessibilityLabel={t("sleep.title")}
          size={playerIcon}
          color={colors.accent}
          className={hit}
          selected={sleepKind !== "off"}
          onPress={() => navigate("/now-playing/sleep-timer")}
        />
        <IconButton
          name="bookmark-border"
          accessibilityLabel={t("bookmark.add")}
          size={playerIcon}
          color={colors.accent}
          className={hit}
          onPress={() => {
            if (!currentTrackId) {
              return;
            }
            navigate(
              `/now-playing/bookmark-note?albumId=${encodeURIComponent(session.albumId)}&trackId=${encodeURIComponent(currentTrackId)}&positionSec=${positionSec}`,
            );
          }}
        />
        <IconButton
          name="bookmarks"
          accessibilityLabel={t("bookmark.listTitle")}
          size={playerIcon}
          color={colors.accent}
          className={hit}
          onPress={() => navigate("/now-playing/bookmarks")}
        />
        {showReadAlong ? (
          <IconButton
            name="menu-book"
            accessibilityLabel={t("player.readAlong")}
            size={playerIcon}
            color={colors.accent}
            className={hit}
            onPress={() => {
              const slug = scripture?.sttmCoSlug;
              const startAng = track?.startAng;
              if (slug == null || startAng == null) {
                return;
              }
              Alert.alert(t("player.readAlongTitle"), t("player.readAlongBody"), [
                { text: t("player.readAlongCancel"), style: "cancel" },
                {
                  text: t("player.readAlongOpen"),
                  onPress: () => {
                    void Linking.openURL(`https://sttm.co/${slug}/${startAng}`);
                  },
                },
              ]);
            }}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}
