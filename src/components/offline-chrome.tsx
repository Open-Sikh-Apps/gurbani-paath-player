import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useDownloadStore, useIsOnline } from "@/downloads";
import { useChrome } from "@/hooks/use-chrome";
import { Text, View, cn, ui } from "@/tw";

export function OfflineChrome({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { text } = useChrome();
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  const hasDownloads = useDownloadStore((state) => state.hasCompleted);
  // Consume the top inset in the banner so JS chrome below does not pad twice.
  const provided = online ? insets : { ...insets, top: 0 };

  return (
    <SafeAreaInsetsContext.Provider value={provided}>
      {online ? null : (
        <View
          className={cn("px-4 py-2", ui.fillAccent)}
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className={cn("text-center font-semibold", ui.accentFg, text)}>
            {t("offline.banner")}
            {/* Only mention downloads when some files are actually on disk. */}
            {hasDownloads ? ` ${t("offline.bannerDownloads")}` : ""}
          </Text>
        </View>
      )}
      {children}
    </SafeAreaInsetsContext.Provider>
  );
}
