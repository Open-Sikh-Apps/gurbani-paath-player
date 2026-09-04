import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { NowPlayingAction } from "@/components/now-playing-action";
import { useDebouncedNavigation } from "@/hooks/use-debounced-navigation";
import { usePlaybackStore } from "@/playback";

/** Opens `/a/:id?trackId=` for scroll-only; Album must not playAlbum from this query. */
export function NowPlayingAlbumButton() {
  const { t } = useTranslation();
  const albumId = usePlaybackStore((state) => state.session?.albumId);
  const currentTrackId = usePlaybackStore((state) => state.currentTrackId);
  const { navigate } = useDebouncedNavigation();

  if (!albumId) {
    return null;
  }

  const label = t("nowPlaying.openAlbum");
  return (
    <NowPlayingAction
      name="queue-music"
      accessibilityLabel={label}
      label={label}
      onPress={() => {
        // Dismiss the player modal first so album is not stacked on it. `?trackId=` is scroll-only.
        if (router.canDismiss()) {
          router.dismiss();
        }
        const trackQuery = currentTrackId
          ? `?trackId=${encodeURIComponent(currentTrackId)}`
          : "";
        navigate(`/a/${albumId}${trackQuery}`);
      }}
    />
  );
}
