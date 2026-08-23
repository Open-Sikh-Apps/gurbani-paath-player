import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getReciterById,
  getSehajPaathCollections,
  loadCatalogue,
  resolveL10n,
  type Catalogue,
} from "@/catalogue";
import { useChrome } from "@/hooks/use-chrome";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import { Image, ScrollView, Text, View, cn, ui } from "@/tw";

export function CataloguePreviewScreen() {
  const { t } = useTranslation();
  const { body, text } = useChrome();
  const locale = useResolvedLocale();
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCatalogue()
      .then((loaded) => {
        if (!cancelled) {
          setCatalogue(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <View className={cn("flex-1 items-center justify-center px-6", ui.page)}>
        <Text className={cn("text-center", ui.text, body)}>
          {t("catalogue.loadError")}
        </Text>
      </View>
    );
  }

  if (!catalogue) {
    return <View className={cn("flex-1", ui.page)} />;
  }

  const albums = getSehajPaathCollections(catalogue);

  return (
    <ScrollView
      className={cn("flex-1", ui.page)}
      contentContainerClassName="gap-3 px-6 py-6"
    >
      <Text className={cn("mb-2", ui.text, body)}>{t("home.fateh")}</Text>
      <Image
        source={{
          uri: catalogue.heroImageUrl,
          headers: {
            "User-Agent":
              "GurbaniPaathPlayerOffline/1.0 (cingh.jasdeep@gmail.com)",
          },
        }}
        className="aspect-4/3 w-full rounded-2xl object-cover"
        accessibilityIgnoresInvertColors
      />
      <Text className={cn(ui.muted, text)}>
        {t("catalogue.version", { version: catalogue.version })}
      </Text>
      {albums.map((album) => {
        const reciter = getReciterById(catalogue, album.reciterId);
        const heading = reciter?.name;
        return (
          <View key={album.id} className="mt-3 gap-1">
            {heading ? (
              <Text className={cn("font-semibold", ui.text, text)}>
                {resolveL10n(heading, locale)}
              </Text>
            ) : null}
            <Text className={cn(ui.muted, text)}>
              {t("catalogue.trackCount", { count: album.tracks.length })}
            </Text>
            {album.tracks.map((track) => (
              <Text key={track.id} className={cn(ui.text, text)}>
                {resolveL10n(track.title, locale)}
              </Text>
            ))}
          </View>
        );
      })}
      <View className="mt-3 gap-1">
        {catalogue.resources.map((resource) => (
          <Text key={resource.id} className={cn(ui.text, text)}>
            {resolveL10n(resource.title, locale)}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}
