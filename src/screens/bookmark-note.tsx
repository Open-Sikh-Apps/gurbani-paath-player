import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getTrackInCollection,
  resolveL10n,
  useCatalogueStore,
} from "@/catalogue";
import { useChrome } from "@/hooks/use-chrome";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import { formatDuration, getSessionTrack, usePlaybackStore } from "@/playback";
import { useBookmarksStore } from "@/state/bookmarks-store";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Pressable, ScrollView, Text, TextInput, View, cn, ui } from "@/tw";
import { HeaderCloseButton } from "@/components/header-close-button";
import { OverflowMenu } from "@/components/overflow-menu";
import { showToast } from "@/feedback/toast";

export function BookmarkNoteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const locale = useResolvedLocale();
  const { hit, text, body } = useChrome();
  const colors = useThemeColors();
  const addBookmark = useBookmarksStore((state) => state.addBookmark);
  const updateNote = useBookmarksStore((state) => state.updateNote);
  const items = useBookmarksStore((state) => state.items);
  const session = usePlaybackStore((state) => state.session);
  const catalogue = useCatalogueStore((state) => state.catalogue);
  const params = useLocalSearchParams<{
    albumId?: string;
    trackId?: string;
    positionSec?: string;
    bookmarkId?: string;
  }>();
  const bookmarkId = Array.isArray(params.bookmarkId)
    ? params.bookmarkId[0]
    : params.bookmarkId;
  const existing = bookmarkId
    ? items.find((item) => item.id === bookmarkId)
    : undefined;
  const albumId = existing?.albumId ?? params.albumId;
  const trackId = existing?.trackId ?? params.trackId;
  const positionSec = existing?.positionSec ?? Number(params.positionSec ?? "0");
  const stamp = Number.isFinite(positionSec) ? positionSec : 0;
  const editing = Boolean(existing);
  const canSave = Boolean(albumId && trackId);
  const [note, setNote] = useState(existing?.note ?? "");

  // Re-sync when the route bookmarkId changes, not on every store tick —
  // otherwise typing would reset if another bookmark write lands.
  useEffect(() => {
    if (!bookmarkId) {
      setNote("");
      return;
    }
    const found = useBookmarksStore
      .getState()
      .items.find((item) => item.id === bookmarkId);
    setNote(found?.note ?? "");
  }, [bookmarkId]);

  function trackTitle(): string {
    if (!trackId) {
      return t("bookmark.unavailable");
    }
    // Frozen session outlives a catalogue drop; prefer it over lookups.
    const sessionTrack = session ? getSessionTrack(session, trackId) : undefined;
    if (sessionTrack) {
      return resolveL10n(sessionTrack.title, locale);
    }
    if (!albumId) {
      return t("bookmark.unavailable");
    }
    const track = getTrackInCollection(catalogue, albumId, trackId);
    if (track) {
      return resolveL10n(track.title, locale);
    }
    return t("bookmark.unavailable");
  }

  function save(): void {
    if (existing) {
      updateNote(existing.id, note);
      router.back();
      return;
    }
    if (!albumId || !trackId) {
      return;
    }
    addBookmark({
      albumId,
      trackId,
      positionSec: stamp,
      note,
    });
    showToast(t("bookmark.saved"));
    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: editing ? t("bookmark.edit") : t("bookmark.add"),
          headerLeft: () => <HeaderCloseButton />,
          headerRight: () => <OverflowMenu />,
        }}
      />
      <ScrollView
        className={cn("flex-1", ui.page)}
        contentContainerClassName="gap-4 px-6 py-6"
      >
        <View className="gap-1">
          <Text className={cn(ui.text, text)}>{trackTitle()}</Text>
          <Text className={cn(ui.muted, text)}>{formatDuration(stamp)}</Text>
        </View>
        <TextInput
          accessibilityLabel={t("bookmark.note")}
          className={cn("min-h-32 rounded-2xl border px-4 py-3", ui.border, ui.text, text)}
          placeholder={`${t("bookmark.note")}: ${t("bookmark.noteHint")}`}
          placeholderTextColor={colors.textMuted}
          multiline
          value={note}
          onChangeText={setNote}
        />
        <View className="gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            className={cn(
              "items-center justify-center rounded-2xl border px-4",
              ui.borderAccent,
              hit,
              !canSave && "opacity-40",
            )}
            disabled={!canSave}
            onPress={save}
          >
            <Text className={cn(ui.accent, text)}>{t("bookmark.save")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className={cn(
              "items-center justify-center rounded-2xl border px-4",
              ui.border,
              ui.surface,
              hit,
            )}
            onPress={() => router.back()}
          >
            <Text className={cn(ui.text, text)}>{t("bookmark.cancel")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
