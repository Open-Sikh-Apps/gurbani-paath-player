import { Stack, useLocalSearchParams, usePathname } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import {
  getCollectionById,
  getReciterById,
  resolveL10n,
  useCatalogueStore,
  type SehajPaathCollection,
} from "@/catalogue";
import { AppIcon } from "@/components/app-icon";
import { HeaderCloseButton } from "@/components/header-close-button";
import { OverflowMenu } from "@/components/overflow-menu";
import { useChrome } from "@/hooks/use-chrome";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import {
  formatDuration,
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

export function BookmarksScreen() {
  const { t } = useTranslation();
  const locale = useResolvedLocale();
  const { hit, text, body } = useChrome();
  const colors = useThemeColors();
  const { navigate } = useDebouncedNavigation();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ albumId?: string | string[] }>();
  const paramAlbumId = Array.isArray(params.albumId) ? params.albumId[0] : params.albumId;
  const sessionAlbumId = usePlaybackStore((state) => state.session?.albumId);
  const albumId = paramAlbumId ?? sessionAlbumId;
  const session = usePlaybackStore((state) => state.session);
  const items = useBookmarksStore((state) => state.items);
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
    return items
      .filter((item) => item.albumId === albumId)
      .slice()
      .sort((left, right) => {
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
  }, [albumId, catalogue, items, session]);

  function titleFor(bookmark: Bookmark): string {
    const sessionTrack = session?.tracks.find((track) => track.id === bookmark.trackId);
    if (sessionTrack) {
      return resolveL10n(sessionTrack.title, locale);
    }
    const collection = getCollectionById(catalogue, bookmark.albumId);
    if (collection?.kind === "sehaj_paath") {
      const track = collection.tracks.find((item) => item.id === bookmark.trackId);
      if (track) {
        return resolveL10n(track.title, locale);
      }
    }
    return t("bookmark.unavailable");
  }

  function isPlayable(bookmark: Bookmark): boolean {
    if (session?.tracks.some((track) => track.id === bookmark.trackId)) {
      return true;
    }
    const collection = getCollectionById(catalogue, bookmark.albumId);
    return (
      collection?.kind === "sehaj_paath" &&
      collection.tracks.some((track) => track.id === bookmark.trackId)
    );
  }

  async function playBookmark(bookmark: Bookmark): Promise<void> {
    const live = usePlaybackStore.getState();
    if (live.session?.tracks.some((track) => track.id === bookmark.trackId)) {
      await playAlbum(live.session, {
        trackId: bookmark.trackId,
        positionSec: bookmark.positionSec,
      });
      return;
    }
    const collection = getCollectionById(catalogue, bookmark.albumId);
    const sehaj =
      collection?.kind === "sehaj_paath"
        ? (collection as SehajPaathCollection)
        : undefined;
    const track = sehaj?.tracks.find((item) => item.id === bookmark.trackId);
    if (!sehaj || !track) {
      Alert.alert(t("bookmark.unavailable"));
      return;
    }
    const reciter = getReciterById(catalogue, sehaj.reciterId);
    await playAlbum(sessionFromSehajPaath(sehaj, reciter), {
      trackId: bookmark.trackId,
      positionSec: bookmark.positionSec,
    });
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
              return (
                <View
                  className={cn(
                    "mb-4 gap-2 rounded-2xl border px-4 py-4",
                    ui.border,
                    ui.surface,
                  )}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={titleFor(item)}
                    className={hit}
                    onPress={() => void playBookmark(item)}
                  >
                    <Text className={cn(playable ? ui.text : ui.muted, text)}>
                      {titleFor(item)}
                    </Text>
                    <Text className={cn("mt-1", ui.muted, text)}>
                      {playable
                        ? formatDuration(item.positionSec)
                        : t("bookmark.unavailable")}
                    </Text>
                  </Pressable>
                  {item.note ? (
                    <Text className={cn("w-full", ui.muted, text)}>{item.note}</Text>
                  ) : null}
                  <View className="flex-row items-center gap-4">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("bookmark.edit")}
                      className={cn("flex-row items-center gap-2", hit)}
                      onPress={() => {
                        const notePath = pathname.startsWith("/now-playing")
                          ? "/now-playing/bookmark-note"
                          : "/bookmarks/bookmark-note";
                        navigate(
                          `${notePath}?bookmarkId=${encodeURIComponent(item.id)}`,
                        );
                      }}
                    >
                      <AppIcon name="edit" size={20} color={colors.accent} />
                      <Text className={cn(ui.accent, text)}>{t("bookmark.edit")}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("bookmark.delete")}
                      className={cn("flex-row items-center gap-2", hit)}
                      onPress={() => removeBookmark(item.id)}
                    >
                      <AppIcon name="delete" size={20} color={colors.accent} />
                      <Text className={cn(ui.accent, text)}>{t("bookmark.delete")}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    </>
  );
}
