import { Stack } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  getReciterById,
  getSehajPaathCollections,
  resolveL10n,
  useCatalogueStore,
} from "@/catalogue";
import { OverflowMenu } from "@/components/overflow-menu";
import { useChrome } from "@/hooks/use-chrome";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import { useLibraryStore } from "@/state/library-store";
import { FlashList, Pressable, Text, View, cn, ui } from "@/tw";

export function LibraryScreen() {
  const { t } = useTranslation();
  const { body, text, hit, title } = useChrome();
  const locale = useResolvedLocale();
  const catalogue = useCatalogueStore((state) => state.catalogue);
  const albums = useLibraryStore((state) => state.albums);
  const { navigate } = useDebouncedNavigation();

  const saved = useMemo(() => {
    const byId = new Map(
      getSehajPaathCollections(catalogue).map((item) => [item.id, item]),
    );
    return Object.keys(albums)
      .map((id) => byId.get(id))
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [albums, catalogue]);

  return (
    <>
      <Stack.Screen
        options={{
          title: t("library.title"),
          headerRight: () => (
            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("history.title")}
                className={cn("justify-center px-3", hit)}
                onPress={() => navigate("/history")}
              >
                <Text className={cn(ui.accent, text)}>{t("history.title")}</Text>
              </Pressable>
              <OverflowMenu />
            </View>
          ),
        }}
      />
      {saved.length === 0 ? (
        <View className={cn("flex-1 items-center justify-center px-6", ui.page)}>
          <Text className={cn("text-center", ui.muted, body)}>
            {t("library.placeholder")}
          </Text>
        </View>
      ) : (
        <View className={cn("flex-1", ui.page)}>
          <FlashList
            data={saved}
            keyExtractor={(item) => item.id}
            contentContainerClassName="px-6 py-6"
            renderItem={({ item }) => {
              const reciter = getReciterById(catalogue, item.reciterId);
              const heading = reciter
                ? resolveL10n(reciter.name, locale)
                : item.id;
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
                  onPress={() => navigate(`/album/${item.id}`)}
                >
                  <Text className={cn("font-semibold", ui.text, title)}>
                    {heading}
                  </Text>
                  <Text className={cn("mt-1", ui.muted, text)}>
                    {t("catalogue.trackCount", { count: item.tracks.length })}
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
