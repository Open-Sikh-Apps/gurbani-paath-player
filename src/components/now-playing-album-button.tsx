import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { IconButton } from "@/components/icon-button";
import { useChrome } from "@/hooks/use-chrome";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { usePlaybackStore } from "@/playback";
import { useThemeColors } from "@/theme/use-theme-colors";

export function NowPlayingAlbumButton() {
  const { t } = useTranslation();
  const { tabIcon, hit } = useChrome();
  const colors = useThemeColors();
  const albumId = usePlaybackStore((state) => state.session?.albumId);
  const { navigate } = useDebouncedNavigation();

  if (!albumId) {
    return null;
  }

  return (
    <IconButton
      name="queue-music"
      accessibilityLabel={t("nowPlaying.openAlbum")}
      size={tabIcon}
      color={colors.accent}
      className={hit}
      onPress={() => {
        if (router.canDismiss()) {
          router.dismiss();
        }
        navigate(`/a/${albumId}`);
      }}
    />
  );
}
