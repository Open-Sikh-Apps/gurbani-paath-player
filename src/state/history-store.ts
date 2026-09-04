import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { historyStateStorage } from "@/state/mmkv";

// Cap so MMKV and the Library list stay bounded.
export const HISTORY_LIMIT = 50;

export type HistoryEntry = {
  albumId: string;
  trackId: string;
  playedAt: number;
};

type HistoryState = {
  items: HistoryEntry[];
  recordPlay: (albumId: string, trackId: string) => void;
};

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      recordPlay: (albumId, trackId) =>
        set((state) => {
          const head = state.items[0];
          // Same track still current after process death is continue, not a new listen.
          if (head?.albumId === albumId && head.trackId === trackId) {
            return state;
          }
          return {
            items: [
              { albumId, trackId, playedAt: Date.now() },
              ...state.items,
            ].slice(0, HISTORY_LIMIT),
          };
        }),
    }),
    {
      name: "history",
      storage: createJSONStorage(() => historyStateStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

/** Playback store calls this so it does not import the React hook. */
export function recordHistoryPlay(albumId: string, trackId: string): void {
  useHistoryStore.getState().recordPlay(albumId, trackId);
}
