import { create } from "zustand";

type NotificationOpenState = {
  albumId: string | null;
  requestAlbum: (albumId: string) => void;
  clearAlbum: () => void;
};

/** In-memory only. Persisting would reopen the album on the next cold start. */
export const useNotificationOpenStore = create<NotificationOpenState>(
  (set) => ({
    albumId: null,
    requestAlbum: (albumId) => set({ albumId }),
    clearAlbum: () => set({ albumId: null }),
  }),
);
