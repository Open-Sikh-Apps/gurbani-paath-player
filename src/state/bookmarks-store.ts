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
  addBookmark: (input: {
    albumId: string;
    trackId: string;
    positionSec: number;
    note?: string;
  }) => void;
  updateNote: (id: string, note: string) => void;
  removeBookmark: (id: string) => void;
};

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set) => ({
      items: [],
      addBookmark: ({ albumId, trackId, positionSec, note }) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              id: randomUUID(),
              albumId,
              trackId,
              positionSec,
              note: note?.trim() ? note.trim() : undefined,
              updatedAt: Date.now(),
            },
          ],
        })),
      updateNote: (id, note) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  note: note.trim() === "" ? undefined : note,
                  updatedAt: Date.now(),
                }
              : item,
          ),
        })),
      removeBookmark: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
    }),
    {
      name: "bookmarks",
      storage: createJSONStorage(() => bookmarksStateStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export function bookmarksForAlbum(albumId: string): Bookmark[] {
  return useBookmarksStore
    .getState()
    .items.filter((item) => item.albumId === albumId);
}
