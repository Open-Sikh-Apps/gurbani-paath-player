import * as Linking from "expo-linking";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { resolveL10n, useCatalogueStore } from "@/catalogue";
import { useChrome } from "@/hooks/use-chrome";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";
import { FlashList, Pressable, Text, View, cn, ui } from "@/tw";

type ResourceRow =
  | { type: "header"; id: string; title: string }
  | {
      type: "item";
      id: string;
      title: string;
      description: string;
      url: string;
    };

export function ResourcesScreen() {
  const { t } = useTranslation();
  const { text, body, hit, title } = useChrome();
  const locale = useResolvedLocale();
  const catalogue = useCatalogueStore((state) => state.catalogue);

  const rows = useMemo(() => {
    const next: ResourceRow[] = [];
    for (const section of catalogue.resourceSections) {
      next.push({
        type: "header",
        id: section.id,
        title: resolveL10n(section.title, locale),
      });
      for (const item of catalogue.resources.filter(
        (resource) => resource.sectionId === section.id,
      )) {
        next.push({
          type: "item",
          id: item.id,
          title: resolveL10n(item.title, locale),
          description: resolveL10n(item.description, locale),
          url: item.url,
        });
      }
    }
    return next;
  }, [catalogue, locale]);

  return (
    <View className={cn("flex-1", ui.page)}>
      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        getItemType={(item) => item.type}
        contentContainerClassName="px-6 py-6"
        ListEmptyComponent={
          <Text className={cn("px-2 py-8 text-center", ui.muted, body)}>
            {t("resources.empty")}
          </Text>
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text className={cn("mb-2 mt-4 font-semibold", ui.muted, title)}>
                {item.title}
              </Text>
            );
          }
          return (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={item.title}
              className={cn(
                "mb-4 rounded-2xl border px-4 py-4",
                ui.border,
                ui.surface,
                hit,
              )}
              onPress={() => void Linking.openURL(item.url)}
            >
              <Text className={cn(ui.text, text)}>{item.title}</Text>
              <Text className={cn("mt-1", ui.muted, text)}>{item.description}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
