import { Stack, useLocalSearchParams, usePathname } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import {
  getCollectionById,
  getReciterById,
  getScriptureById,
  getTrackInCollection,
  resolveL10n,
  useCatalogueStore,
  type SehajPaathCollection,
} from "@/catalogue";
import { confirmRemove } from "@/components/album-action-row";
import { playableUrlFor, useIsOnline } from "@/downloads";
import { AppIcon } from "@/components/app-icon";
import { HeaderCloseButton } from "@/components/header-close-button";
import { OverflowMenu } from "@/components/overflow-menu";
import { useChrome } from "@/hooks/use-chrome";
import { LIST_PLAY_PRESS_DELAY_MS } from "@/hooks/list-play-press";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import {
  formatDuration,
  getSessionTrack,
  playAlbum,
  sessionFromSehajPaath,
  usePlaybackStore,
} from "@/playback";
import {
  useBookmarksStore,
  type Bookmark,
} from "@/state/bookmarks-store";
import { useThemeColors } from "@/theme/use-theme-colors";
import { FlashList, Pressable, Text, View, cn, ui } from "@/tw";
import { showToast } from "@/feedback/toast";

// Stable empty array so the Zustand selector does not churn every render.
const EMPTY_ALBUM_BOOKMARKS: Bookmark[] = [];

export function BookmarksScreen() {
  const { t } = useTranslation();
  const locale = useResolvedLocale();
  const { hit, text, body, tabIcon } = useChrome();
  const colors = useThemeColors();
  const { navigate } = useDebouncedNavigation();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ albumId?: string | string[] }>();
  const paramAlbumId = Array.isArray(params.albumId) ? params.albumId[0] : params.albumId;
  const sessionAlbumId = usePlaybackStore((state) => state.session?.albumId);
  // Nested Now Playing list has no albumId param; fall back to the live session.
  const albumId = paramAlbumId ?? sessionAlbumId;
  const online = useIsOnline();
  const session = usePlaybackStore((state) => state.session);
  const albumBookmarks = useBookmarksStore(
    (state) =>
      (albumId ? state.byAlbumId[albumId] : undefined) ?? EMPTY_ALBUM_BOOKMARKS,
  );
  const removeBookmark = useBookmarksStore((state) => state.removeBookmark);
  const catalogue = useCatalogueStore((state) => state.catalogue);

  const bookmarks = useMemo(() => {
    if (!albumId) {
      return [];
    }
    const sessionOrder = new Map(
      (session?.tracks ?? []).map((track, index) => [track.id, index]),
    );
    const collection = getCollectionById(catalogue, albumId);
    const catalogueOrder = new Map(
      collection?.kind === "sehaj_paath"
        ? collection.tracks.map((track, index) => [track.id, index])
        : [],
    );
    // Session order first, then catalogue; missing tracks sink to the end.
    return albumBookmarks.slice().sort((left, right) => {
      const leftIndex =
        sessionOrder.get(left.trackId) ??
        catalogueOrder.get(left.trackId) ??
        Number.MAX_SAFE_INTEGER;
      const rightIndex =
        sessionOrder.get(right.trackId) ??
        catalogueOrder.get(right.trackId) ??
        Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      return left.positionSec - right.positionSec;
    });
  }, [albumId, albumBookmarks, catalogue, session]);

  function titleFor(bookmark: Bookmark): string {
    const sessionTrack = session
      ? getSessionTrack(session, bookmark.trackId)
      : undefined;
    if (sessionTrack) {
      return resolveL10n(sessionTrack.title, locale);
    }
    const track = getTrackInCollection(catalogue, bookmark.albumId, bookmark.trackId);
    if (track) {
      return resolveL10n(track.title, locale);
    }
    return t("bookmark.unavailable");
  }

  function isPlayable(bookmark: Bookmark): boolean {
    if (session && getSessionTrack(session, bookmark.trackId)) {
      return true;
    }
    return getTrackInCollection(catalogue, bookmark.albumId, bookmark.trackId) != null;
  }

  function isAvailableOffline(bookmark: Bookmark): boolean {
    const sessionTrack = session
      ? getSessionTrack(session, bookmark.trackId)
      : undefined;
    if (sessionTrack) {
      return playableUrlFor(sessionTrack.id, sessionTrack.remoteUrl) != null;
    }
    const track = getTrackInCollection(
      catalogue,
      bookmark.albumId,
      bookmark.trackId,
    );
    if (!track) {
      return false;
    }
    return playableUrlFor(track.id, track.url) != null;
  }

  function openPlayerIfNeeded(): void {
    // Already on the Now Playing stack (nested bookmarks) — do not push another modal.
    if (pathname.startsWith("/now-playing")) {
      return;
    }
    navigate("/now-playing");
  }

  async function playBookmark(bookmark: Bookmark): Promise<void> {
    const live = usePlaybackStore.getState();
    // Prefer the frozen session so a catalogue refresh cannot rebuild the live queue.
    if (live.session && getSessionTrack(live.session, bookmark.trackId)) {
      const started = await playAlbum(live.session, {
        trackId: bookmark.trackId,
        positionSec: bookmark.positionSec,
      });
      if (started) {
        // Already on the player — skip a second modal; toast so the seek is noticeable.
        if (pathname.startsWith("/now-playing")) {
          showToast(t("bookmark.resumed"));
        }
        openPlayerIfNeeded();
      }
      return;
    }
    const collection = getCollectionById(catalogue, bookmark.albumId);
    const sehaj =
      collection?.kind === "sehaj_paath"
        ? (collection as SehajPaathCollection)
        : undefined;
    const track = getTrackInCollection(catalogue, bookmark.albumId, bookmark.trackId);
    if (!sehaj || !track) {
      Alert.alert(t("bookmark.unavailable"));
      return;
    }
    const reciter = getReciterById(catalogue, sehaj.reciterId);
    const scripture = getScriptureById(catalogue, sehaj.scriptureId);
    const started = await playAlbum(
      sessionFromSehajPaath(sehaj, reciter, scripture),
      {
        trackId: bookmark.trackId,
        positionSec: bookmark.positionSec,
      },
    );
    if (started) {
      if (pathname.startsWith("/now-playing")) {
        showToast(t("bookmark.resumed"));
      }
      openPlayerIfNeeded();
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("bookmark.listTitle"),
          headerLeft: () => <HeaderCloseButton />,
          headerRight: () => <OverflowMenu />,
        }}
      />
      <View className={cn("flex-1", ui.page)}>
        {bookmarks.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className={cn("text-center", ui.muted, body)}>
              {t("bookmark.empty")}
            </Text>
          </View>
        ) : (
          <FlashList
            data={bookmarks}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-6 py-6"
            renderItem={({ item }) => {
              const playable = isPlayable(item);
              const muted = playable && !online && !isAvailableOffline(item);
              const canPlay = playable && !muted;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={titleFor(item)}
                  accessibilityState={{ disabled: !canPlay }}
                  unstable_pressDelay={LIST_PLAY_PRESS_DELAY_MS}
                  disabled={!canPlay}
                  onPress={() => void playBookmark(item)}
                  className={cn(
                    "mb-4 gap-2 rounded-2xl border px-4 py-4",
                    ui.border,
                    ui.surface,
                    hit,
                    muted && "opacity-40",
                  )}
                >
                  <View>
                    <Text className={cn(canPlay ? ui.text : ui.muted, text)}>
                      {titleFor(item)}
                    </Text>
                    <Text className={cn("mt-1", ui.muted, text)}>
                      {playable
                        ? formatDuration(item.positionSec)
                        : t("bookmark.unavailable")}
                    </Text>
                  </View>
                  {item.note ? (
                    <Text className={cn("w-full", ui.muted, text)}>{item.note}</Text>
                  ) : null}
                  <View className="flex-row items-center gap-4">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("bookmark.edit")}
                      className={cn("flex-row items-center gap-2", hit)}
                      onPress={() => {
                        // Stay on this stack so back does not jump the player modal to root bookmarks.
                        const notePath = pathname.startsWith("/now-playing")
                          ? "/now-playing/bookmark-note"
                          : "/bookmarks/bookmark-note";
                        navigate(
                          `${notePath}?bookmarkId=${encodeURIComponent(item.id)}`,
                        );
                      }}
                    >
                      <AppIcon name="edit" size={tabIcon} color={colors.accent} />
                      <Text className={cn(ui.accent, text)}>{t("bookmark.edit")}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("bookmark.delete")}
                      className={cn("flex-row items-center gap-2", hit)}
                      onPress={() => {
                        confirmRemove({
                          title: t("bookmark.deleteTitle"),
                          body: t("bookmark.deleteBody"),
                          confirm: t("bookmark.delete"),
                          cancel: t("bookmark.cancel"),
                          onConfirm: () => removeBookmark(item.id),
                        });
                      }}
                    >
                      <AppIcon name="delete" size={tabIcon} color={colors.accent} />
                      <Text className={cn(ui.accent, text)}>{t("bookmark.delete")}</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </>
  );
}
