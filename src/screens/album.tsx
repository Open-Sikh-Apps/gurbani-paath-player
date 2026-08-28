import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import {
  getCollectionById,
  getReciterById,
  resolveL10n,
  useCatalogueStore,
  type SehajPaathCollection,
  type SehajPaathTrack,
} from "@/catalogue";
import { IconButton } from "@/components/icon-button";
import { HeaderCloseButton } from "@/components/header-close-button";
import { OverflowMenu } from "@/components/overflow-menu";
import { useChrome } from "@/hooks/use-chrome";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import {
  formatDuration,
  playAlbum,
  sessionFromSehajPaath,
  togglePlayPause,
  usePlaybackStore,
  useResumeStore,
  type SessionTrack,
} from "@/playback";
import { useThemeColors } from "@/theme/use-theme-colors";
import { useLibraryStore } from "@/state/library-store";
import { FlashList, Pressable, Text, View, cn, ui } from "@/tw";

type AlbumRow = SessionTrack | SehajPaathTrack;

export function AlbumScreen() {
  const { t } = useTranslation();
  const { body, text, hit, title, tabIcon } = useChrome();
  const locale = useResolvedLocale();
  const colors = useThemeColors();
  const { navigate } = useDebouncedNavigation();
  const { albumId, trackId } = useLocalSearchParams<{
    albumId: string;
    trackId?: string | string[];
  }>();
  const deepTrackId = Array.isArray(trackId) ? trackId[0] : trackId;

  const catalogue = useCatalogueStore((state) => state.catalogue);
  const collection = getCollectionById(catalogue, albumId);
  const sehaj =
    collection?.kind === "sehaj_paath"
      ? (collection as SehajPaathCollection)
      : undefined;
  const reciter = sehaj
    ? getReciterById(catalogue, sehaj.reciterId)
    : undefined;
  const session = usePlaybackStore((state) => state.session);
  const playing = usePlaybackStore((state) => state.playing);
  const currentTrackId = usePlaybackStore((state) => state.currentTrackId);
  const positionSec = usePlaybackStore((state) => state.positionSec);
  const storedResume = useResumeStore((state) => state.positions[albumId]);
  const inLibrary = useLibraryStore((state) => state.albums[albumId] != null);
  const toggleAlbum = useLibraryStore((state) => state.toggleAlbum);

  const liveSession = useMemo(() => {
    if (sehaj) {
      return sessionFromSehajPaath(sehaj, reciter);
    }
    if (session?.albumId === albumId) {
      return session;
    }
    return null;
  }, [albumId, reciter, sehaj, session]);

  const heading = liveSession
    ? resolveL10n(liveSession.reciterName, locale)
    : t("album.title");
  const tracks: AlbumRow[] = sehaj?.tracks ?? liveSession?.tracks ?? [];
  const isCurrentAlbum = session?.albumId === albumId;
  const resume =
    isCurrentAlbum && currentTrackId
      ? { trackId: currentTrackId, positionSec }
      : storedResume;
  const autoPlayed = useRef<string | null>(null);

  useEffect(() => {
    if (!deepTrackId || !liveSession) {
      return;
    }
    const key = `${albumId}:${deepTrackId}`;
    if (autoPlayed.current === key) {
      return;
    }
    autoPlayed.current = key;
    void playAlbum(liveSession, { trackId: deepTrackId, positionSec: 0 });
  }, [albumId, deepTrackId, liveSession]);

  async function playFrom(
    track: AlbumRow,
    positionSec?: number,
  ): Promise<void> {
    if (!liveSession) {
      return;
    }
    if (
      positionSec == null &&
      isCurrentAlbum &&
      currentTrackId === track.id
    ) {
      togglePlayPause();
      return;
    }
    await playAlbum(liveSession, {
      trackId: track.id,
      positionSec: positionSec ?? 0,
    });
  }

  if (!liveSession) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t("album.title"),
            headerBackVisible: false,
            headerLeft: () => <HeaderCloseButton />,
            headerRight: () => <OverflowMenu />,
          }}
        />
        <View className={cn("flex-1 items-center justify-center px-6", ui.page)}>
          <Text className={cn("text-center", ui.muted, body)}>
            {t("album.unavailable")}
          </Text>
        </View>
      </>
    );
  }

  const resumeTrack = resume
    ? tracks.find((track) => track.id === resume.trackId)
    : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          title: heading,
          headerBackVisible: false,
          headerLeft: () => <HeaderCloseButton />,
          headerRight: () => (
            <View className="flex-row items-center">
              <IconButton
                name="bookmarks"
                accessibilityLabel={t("bookmark.listTitle")}
                size={tabIcon}
                color={colors.accent}
                className={hit}
                onPress={() =>
                  navigate(
                    `/bookmarks?albumId=${encodeURIComponent(albumId)}`,
                  )
                }
              />
              <IconButton
                name={inLibrary ? "favorite" : "favorite-border"}
                accessibilityLabel={
                  inLibrary ? t("library.remove") : t("library.add")
                }
                size={tabIcon}
                color={colors.accent}
                className={hit}
                onPress={() => toggleAlbum(albumId)}
              />
              <OverflowMenu />
            </View>
          ),
        }}
      />
      <View className={cn("flex-1", ui.page)}>
        <View className="flex-1">
          <FlashList
          data={tracks}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 py-6"
          ListHeaderComponent={
            <View className="gap-3 py-4">
              <Text className={cn("font-semibold", ui.text, title)}>
                {heading}
              </Text>
              {resumeTrack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("album.resume")}
                  className={cn(
                    "rounded-2xl border px-4 py-3",
                    ui.borderAccent,
                    ui.surface,
                    hit,
                  )}
                  onPress={() =>
                    void playFrom(resumeTrack, resume?.positionSec ?? 0)
                  }
                >
                  <Text className={cn(ui.accent, text)}>
                    {t("album.resume")}
                  </Text>
                  <Text className={cn("mt-1", ui.muted, text)}>
                    {resolveL10n(resumeTrack.title, locale)}
                    {resume
                      ? ` · ${formatDuration(resume.positionSec)}`
                      : null}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const active = isCurrentAlbum && currentTrackId === item.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={resolveL10n(item.title, locale)}
                className={cn(
                  "mb-4 rounded-2xl border px-4 py-4",
                  active ? ui.borderAccent : ui.border,
                  ui.surface,
                  hit,
                )}
                onPress={() => void playFrom(item)}
              >
                <Text className={cn(active ? ui.accent : ui.text, text)}>
                  {resolveL10n(item.title, locale)}
                </Text>
                {item.durationSec != null ? (
                  <Text className={cn("mt-1", ui.muted, text)}>
                    {formatDuration(item.durationSec)}
                  </Text>
                ) : null}
              </Pressable>
            );
          }}
        />
        </View>
      </View>
    </>
  );
}
