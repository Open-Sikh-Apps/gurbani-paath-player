import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { libraryStateStorage } from "@/state/mmkv";

type LibraryEntry = {
  updatedAt: number;
};

type LibraryState = {
  albums: Record<string, LibraryEntry>;
  addAlbum: (albumId: string) => void;
  removeAlbum: (albumId: string) => void;
  toggleAlbum: (albumId: string) => void;
};

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      albums: {},
      addAlbum: (albumId) =>
        set((state) => ({
          albums: {
            ...state.albums,
            [albumId]: { updatedAt: Date.now() },
          },
        })),
      removeAlbum: (albumId) => {
        const next = { ...get().albums };
        delete next[albumId];
        set({ albums: next });
      },
      toggleAlbum: (albumId) => {
        if (get().albums[albumId]) {
          get().removeAlbum(albumId);
          return;
        }
        get().addAlbum(albumId);
      },
    }),
    {
      name: "library",
      storage: createJSONStorage(() => libraryStateStorage),
      partialize: (state) => ({ albums: state.albums }),
    },
  ),
);

export function isAlbumInLibrary(albumId: string): boolean {
  return useLibraryStore.getState().albums[albumId] != null;
}
