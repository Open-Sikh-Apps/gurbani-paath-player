import { Stack } from "expo-router";

import { useOfflineStackOptions } from "@/hooks/use-offline-stack-options";

// Track screen needs the album under it so Back pops to the album, not Library root.
export const unstable_settings = {
  anchor: "index",
};

export default function LibraryAlbumLayout() {
  const offlineHeader = useOfflineStackOptions();
  return <Stack screenOptions={offlineHeader} />;
}
