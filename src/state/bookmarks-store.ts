import { randomUUID } from "expo-crypto";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { bookmarksStateStorage } from "@/state/mmkv";

export type Bookmark = {
  id: string;
  albumId: string;
  trackId: string;
  positionSec: number;
  note?: string;
  updatedAt: number;
};

type BookmarksState = {
  items: Bookmark[];
  byAlbumId: Record<string, Bookmark[]>;
  addBookmark: (input: {
    albumId: string;
    trackId: string;
    positionSec: number;
    note?: string;
  }) => void;
  updateNote: (id: string, note: string) => void;
  removeBookmark: (id: string) => void;
};

const EMPTY_BOOKMARKS: Bookmark[] = [];

function indexByAlbumId(items: Bookmark[]): Record<string, Bookmark[]> {
  const byAlbumId: Record<string, Bookmark[]> = {};
  for (const item of items) {
    const list = byAlbumId[item.albumId];
    if (list) {
      list.push(item);
    } else {
      byAlbumId[item.albumId] = [item];
    }
  }
  return byAlbumId;
}

function withIndex(items: Bookmark[]): Pick<BookmarksState, "items" | "byAlbumId"> {
  return { items, byAlbumId: indexByAlbumId(items) };
}

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set) => ({
      items: [],
      byAlbumId: {},
      addBookmark: ({ albumId, trackId, positionSec, note }) =>
        set((state) =>
          withIndex([
            ...state.items,
            {
              id: randomUUID(),
              albumId,
              trackId,
              positionSec,
              note: note?.trim() ? note.trim() : undefined,
              updatedAt: Date.now(),
            },
          ]),
        ),
      updateNote: (id, note) =>
        set((state) =>
          withIndex(
            state.items.map((item) =>
              item.id === id
                ? {
                    ...item,
                    note: note.trim() === "" ? undefined : note,
                    updatedAt: Date.now(),
                  }
                : item,
            ),
          ),
        ),
      removeBookmark: (id) =>
        set((state) =>
          withIndex(state.items.filter((item) => item.id !== id)),
        ),
    }),
    {
      name: "bookmarks",
      storage: createJSONStorage(() => bookmarksStateStorage),
      // byAlbumId is derived; persisting it would drift from items after a partial write.
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }
        // Persist skipped byAlbumId; rebuild it or album screens see {}.
        useBookmarksStore.setState(withIndex(state.items));
      },
    },
  ),
);

export function bookmarksForAlbum(albumId: string): Bookmark[] {
  // Stable empty array so hook subscribers do not re-render on every missing album.
  return useBookmarksStore.getState().byAlbumId[albumId] ?? EMPTY_BOOKMARKS;
}
