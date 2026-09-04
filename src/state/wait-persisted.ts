import { useDownloadStore } from "@/downloads/store";
import { useResumeStore } from "@/playback/resume-store";
import { useBookmarksStore } from "@/state/bookmarks-store";
import { useHistoryStore } from "@/state/history-store";
import { useLibraryStore } from "@/state/library-store";
import { usePreferencesStore } from "@/state/preferences-store";

type PersistedStore = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
};

/** 4s cap so a stuck persist cannot hang the JS splash. */
function waitPersisted(store: PersistedStore, timeoutMs = 4000): Promise<void> {
  if (store.persist.hasHydrated()) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      unsub();
      resolve();
    };
    const unsub = store.persist.onFinishHydration(finish);
    const timer = setTimeout(finish, timeoutMs);
    // Hydration can finish between the hasHydrated check and the subscribe.
    if (store.persist.hasHydrated()) {
      finish();
    }
  });
}

/** Home / wizard must not paint until MMKV is in. Native splash is already gone. */
export function waitAppPersisted(): Promise<void> {
  return Promise.all([
    waitPersisted(usePreferencesStore),
    waitPersisted(useResumeStore),
    waitPersisted(useDownloadStore),
    waitPersisted(useBookmarksStore),
    waitPersisted(useLibraryStore),
    waitPersisted(useHistoryStore),
  ]).then(() => undefined);
}
