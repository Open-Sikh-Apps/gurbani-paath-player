import { createMMKV } from "react-native-mmkv";
import type { StateStorage } from "zustand/middleware";

function stateStorageFrom(mmkv: ReturnType<typeof createMMKV>): StateStorage {
  return {
    setItem: (name, value) => {
      mmkv.set(name, value);
    },
    getItem: (name) => mmkv.getString(name) ?? null,
    removeItem: (name) => {
      mmkv.remove(name);
    },
  };
}

// Separate ids so clearing downloads/history cannot wipe preferences or the catalogue cache.
const preferencesMmkv = createMMKV({ id: "preferences" });
export const mmkvStateStorage = stateStorageFrom(preferencesMmkv);

export const catalogueMmkv = createMMKV({ id: "catalogue" });
export const playbackMmkv = createMMKV({ id: "playback" });
export const playbackStateStorage = stateStorageFrom(playbackMmkv);

const bookmarksMmkv = createMMKV({ id: "bookmarks" });
export const bookmarksStateStorage = stateStorageFrom(bookmarksMmkv);

const libraryMmkv = createMMKV({ id: "library" });
export const libraryStateStorage = stateStorageFrom(libraryMmkv);

const downloadsMmkv = createMMKV({ id: "downloads" });
export const downloadsStateStorage = stateStorageFrom(downloadsMmkv);

const historyMmkv = createMMKV({ id: "history" });
export const historyStateStorage = stateStorageFrom(historyMmkv);
