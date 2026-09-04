import { useEffect } from "react";
import { router, type Href } from "expo-router";

import { useNotificationOpenStore } from "@/state/notification-open-store";
import { usePreferencesStore } from "@/state/preferences-store";

/** Headless notify tap stores albumId; this navigates once the wizard Stack exists. */
export function FlushNotificationOpens() {
  const albumId = useNotificationOpenStore((state) => state.albumId);
  const hasCompletedWizard = usePreferencesStore(
    (state) => state.hasCompletedWizard,
  );

  useEffect(() => {
    if (!hasCompletedWizard || !albumId) {
      return;
    }
    // Next to a committed Stack so download-notification taps never race Root Layout.
    router.navigate(`/a/${albumId}` as Href);
    useNotificationOpenStore.getState().clearAlbum();
  }, [albumId, hasCompletedWizard]);

  return null;
}
