import { Stack } from "expo-router";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl } from "react-native";

import {
  REMOTE_IMAGE_HEADERS,
  getReciterById,
  getSehajPaathCollections,
  refreshCatalogue,
  resolveL10n,
  useCatalogueStore,
} from "@/catalogue";
import { OverflowMenu } from "@/components/overflow-menu";
import { useChrome } from "@/hooks/use-chrome";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Image, Pressable, ScrollView, Text, cn, ui } from "@/tw";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";

export function HomeScreen() {
  const { t } = useTranslation();
  const { body, text, hit, title } = useChrome();
  const locale = useResolvedLocale();
  const colors = useThemeColors();
  const catalogue = useCatalogueStore((state) => state.catalogue);
  const status = useCatalogueStore((state) => state.status);
  const albums = getSehajPaathCollections(catalogue);
  const { navigate } = useDebouncedNavigation();

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
            refreshing={status === "refreshing"}
            onRefresh={() => void refreshCatalogue()}
            tintColor={colors.accent}
          />
        }
      >
        <Text className={cn(ui.text, body)}>{t("home.fateh")}</Text>
        {status === "error" ? (
          <Text className={cn("text-center", ui.muted, text)}>
            {t("catalogue.refreshError")}
          </Text>
        ) : null}
        <Image
          source={{
            uri: catalogue.heroImageUrl,
            headers: REMOTE_IMAGE_HEADERS,
          }}
          cachePolicy="memory-disk"
          className="aspect-4/3 w-full rounded-2xl object-cover"
          accessibilityLabel={t("home.heroA11y")}
          accessibilityIgnoresInvertColors
        />
        {albums.map((album) => {
          const reciter = getReciterById(catalogue, album.reciterId);
          const heading = reciter
            ? resolveL10n(reciter.name, locale)
            : album.id;
          return (
            <Pressable
              key={album.id}
              accessibilityRole="button"
              accessibilityLabel={heading}
              className={cn(
                "rounded-2xl border px-4 py-4",
                ui.border,
                ui.surface,
                hit,
              )}
              onPress={() => navigate(`/a/${album.id}`)}
            >
              <Text className={cn("font-semibold", ui.text, title)}>
                {heading}
              </Text>
              <Text className={cn("mt-1", ui.muted, text)}>
                {t("catalogue.trackCount", { count: album.tracks.length })}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}
