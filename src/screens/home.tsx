import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, RefreshControl } from "react-native";

import {
  getReciterById,
  refreshCatalogue,
  resolveL10n,
  sehajPaathGroupsByScripture,
  useCatalogueStore,
  type SehajPaathCollection,
  type SehajPaathTrack,
} from "@/catalogue";
import { fileKey, useDownloadStore, useIsOnline } from "@/downloads";
import { AppIcon } from "@/components/app-icon";
import { CatalogueImage } from "@/components/catalogue-image";
import { OverflowMenu } from "@/components/overflow-menu";
import { useChrome } from "@/hooks/use-chrome";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Pressable, ScrollView, Text, View, cn, ui } from "@/tw";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { usePlaybackStore } from "@/playback";
import { usePreferencesStore } from "@/state/preferences-store";
import { clearToast, showToast } from "@/feedback/toast";

function HomeAlbumRow({ album }: { album: SehajPaathCollection }) {
  const { t } = useTranslation();
  const { hit, subtitle, tabIcon } = useChrome();
  const locale = useResolvedLocale();
  const colors = useThemeColors();
  const { navigate } = useDebouncedNavigation();
  const catalogue = useCatalogueStore((state) => state.catalogue);
  const reciter = getReciterById(catalogue, album.reciterId);
  const heading = reciter
    ? resolveL10n(reciter.name, locale)
    : album.title
      ? resolveL10n(album.title, locale)
      : album.id;
  const isCurrentAlbum = usePlaybackStore(
    (state) => state.session?.albumId === album.id,
  );
  const statusLabel = usePlaybackStore((state) => {
    if (state.session?.albumId !== album.id) {
      return null;
    }
    return state.playing || state.buffering ? "playing" : "paused";
  });
  const downloaded = useDownloadStore((state) => {
    if (album.tracks.length === 0) {
      return false;
    }
    return album.tracks.every(
      (track: SehajPaathTrack) =>
        state.files[fileKey(track.id, track.url)]?.status === "completed",
    );
  });
  const liveLabel =
    statusLabel === "playing"
      ? t("album.playing")
      : statusLabel === "paused"
        ? t("album.paused")
        : null;

  return (
    <Pressable
      key={album.id}
      accessibilityRole="button"
      accessibilityLabel={
        liveLabel ? `${heading}. ${liveLabel}` : heading
      }
      accessibilityState={{ selected: isCurrentAlbum }}
      className={cn(
        "rounded-2xl border px-4 py-4",
        isCurrentAlbum ? ui.borderAccent : ui.border,
        ui.surface,
        hit,
      )}
      onPress={() => navigate(`/a/${album.id}`)}
    >
      <View className="flex-row items-center gap-2">
        <Text
          className={cn(
            "min-w-0 flex-1 font-semibold",
            ui.text,
            subtitle,
          )}
        >
          {heading}
        </Text>
        {downloaded ? (
          <AppIcon
            name="download-done"
            size={tabIcon}
            color={colors.accent}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const { t } = useTranslation();
  const { body, title } = useChrome();
  const locale = useResolvedLocale();
  const colors = useThemeColors();
  const catalogue = useCatalogueStore((state) => state.catalogue);
  const status = useCatalogueStore((state) => state.status);
  const groups = sehajPaathGroupsByScripture(catalogue);
  const online = useIsOnline();
  const [userRefreshing, setUserRefreshing] = useState(false);
  const pullRefreshing = userRefreshing && status === "refreshing";
  const lastCatalogueToast = useRef<"updating" | "error" | null>(null);
  const hasSeenIntroFeedback = usePreferencesStore(
    (state) => state.hasSeenIntroFeedback,
  );
  const markIntroFeedbackSeen = usePreferencesStore(
    (state) => state.markIntroFeedbackSeen,
  );

  useEffect(() => {
    if (hasSeenIntroFeedback) {
      return;
    }
    // Mark seen before the alert so a remount cannot stack dialogs.
    markIntroFeedbackSeen();
    Alert.alert(t("intro.title"), t("intro.body"), [
      { text: t("intro.dismiss") },
    ]);
  }, [hasSeenIntroFeedback, markIntroFeedbackSeen, t]);

  useEffect(() => {
    if (status !== "refreshing") {
      setUserRefreshing(false);
    }
  }, [status]);

  // Silent catalogue refresh has no spinner — toast "Updating…". A user pull
  // already has RefreshControl, so skip the toast. The ref avoids stacking
  // the same status. Idle delayed-clears so the toast does not flash off.
  useEffect(() => {
    if (status === "refreshing" && !userRefreshing) {
      if (lastCatalogueToast.current === "updating") {
        return;
      }
      lastCatalogueToast.current = "updating";
      showToast(t("catalogue.updating"), false);
    } else if (status === "error") {
      if (lastCatalogueToast.current === "error") {
        return;
      }
      lastCatalogueToast.current = "error";
      showToast(t("catalogue.refreshError"));
    } else if (status === "idle") {
      if (lastCatalogueToast.current) {
        clearToast(true);
      }
      lastCatalogueToast.current = null;
    }
  }, [status, t, userRefreshing]);

  return (
    <>
      <Stack.Screen
        options={{
          title: t("home.title"),
          headerRight: () => (
            <OverflowMenu
              extraItems={[
                {
                  key: "refresh",
                  icon: "refresh",
                  label: t("home.refreshCatalogue"),
                  disabled: !online,
                  onPress: () => {
                    void refreshCatalogue();
                  },
                },
              ]}
            />
          ),
        }}
      />
      <ScrollView
        className={cn("flex-1", ui.page)}
        contentContainerClassName="gap-4 px-6 py-6"
        refreshControl={
          <RefreshControl
            // Only a user pull drives this — silent cold-start refresh must not inset the list.
            refreshing={pullRefreshing}
            onRefresh={() => {
              setUserRefreshing(true);
              void refreshCatalogue();
            }}
            tintColor={colors.accent}
            enabled={online}
          />
        }
      >
        <Text className={cn(ui.text, body)}>{t("home.fateh")}</Text>

        {groups.length === 0 ? null : (
          groups.map(({ scripture, collections }) => {
            const scriptureName = resolveL10n(scripture.name, locale);
            return (
              <View key={scripture.id} className="gap-3">
                <View className="flex-row flex-wrap">
                  <Text className={cn(title, ui.text, "font-semibold shrink-0 max-w-full")}>
                    {`${t("collection.sehaj_paath")} · `}
                  </Text>
                  <Text className={cn(title, ui.text, "font-semibold shrink-0 max-w-full")}>
                    {scriptureName}
                  </Text>
                </View>
                <CatalogueImage
                  uri={scripture.imageUrl}
                  className="aspect-square"
                  accessibilityLabel={scriptureName}
                />
                {collections.map((album) => (
                  <HomeAlbumRow key={album.id} album={album} />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}
