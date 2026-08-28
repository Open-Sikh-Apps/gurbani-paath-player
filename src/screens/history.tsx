import { Stack } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  getCollectionById,
  getReciterById,
  resolveL10n,
  useCatalogueStore,
} from "@/catalogue";
import { OverflowMenu } from "@/components/overflow-menu";
import { useChrome } from "@/hooks/use-chrome";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import { useResumeStore } from "@/playback";
import { FlashList, Pressable, Text, View, cn, ui } from "@/tw";
import { HeaderCloseButton } from "@/components/header-close-button";

const HISTORY_LIMIT = 10;

export function HistoryScreen() {
  const { t } = useTranslation();
  const { body, text, hit, title } = useChrome();
  const locale = useResolvedLocale();
  const catalogue = useCatalogueStore((state) => state.catalogue);
  const positions = useResumeStore((state) => state.positions);
  const { navigate } = useDebouncedNavigation();

  const entries = useMemo(
    () =>
      Object.entries(positions)
        .sort((left, right) => right[1].updatedAt - left[1].updatedAt)
        .slice(0, HISTORY_LIMIT)
        .map(([albumId]) => albumId),
    [positions],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t("history.title"),
          headerBackVisible: false,
          headerLeft: () => <HeaderCloseButton />,
          headerRight: () => <OverflowMenu />,
        }}
      />
      {entries.length === 0 ? (
        <View className={cn("flex-1 items-center justify-center px-6", ui.page)}>
          <Text className={cn("text-center", ui.muted, body)}>
            {t("history.empty")}
          </Text>
        </View>
      ) : (
        <View className={cn("flex-1", ui.page)}>
          <FlashList
            data={entries}
            keyExtractor={(item) => item}
            contentContainerClassName="px-6 py-6"
            renderItem={({ item: albumId }) => {
              const collection = getCollectionById(catalogue, albumId);
              const reciter =
                collection?.kind === "sehaj_paath"
                  ? getReciterById(catalogue, collection.reciterId)
                  : undefined;
              const heading = reciter
                ? resolveL10n(reciter.name, locale)
                : t("album.unavailable");
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={heading}
                  className={cn(
                    "mb-4 rounded-2xl border px-4 py-4",
                    ui.border,
                    ui.surface,
                    hit,
                  )}
                  onPress={() => navigate(`/album/${albumId}`)}
                >
                  <Text className={cn("font-semibold", ui.text, title)}>
                    {heading}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}
    </>
  );
}
