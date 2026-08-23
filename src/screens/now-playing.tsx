import { useTranslation } from "react-i18next";

import { useChrome } from "@/hooks/use-chrome";
import { Text, View, cn, ui } from "@/tw";

export function NowPlayingScreen() {
  const { t } = useTranslation();
  const { body } = useChrome();

  return (
    <View className={cn("flex-1 items-center justify-center px-6", ui.page)}>
      <Text className={cn("text-center", ui.muted, body)}>
        {t("nowPlaying.placeholder")}
      </Text>
    </View>
  );
}
