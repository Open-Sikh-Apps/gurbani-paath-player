import { Stack } from "expo-router";

import { useOfflineStackOptions } from "@/hooks/use-offline-stack-options";

// Track deeplink `/a/{id}/t/{id}` needs the album under it so Back pops to the album, not Home.
export const unstable_settings = {
  anchor: "index",
};

export default function AlbumStackLayout() {
  const offlineHeader = useOfflineStackOptions();
  return <Stack screenOptions={offlineHeader} />;
}
