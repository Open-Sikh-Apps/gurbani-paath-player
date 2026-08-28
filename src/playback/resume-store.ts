import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { clampPlaybackRate, DEFAULT_PLAYBACK_RATE } from "@/playback/types";
import { playbackStateStorage } from "@/state/mmkv";

export type AlbumResume = {
  trackId: string;
  positionSec: number;
  updatedAt: number;
};

type ResumeState = {
  positions: Record<string, AlbumResume>;
  rates: Record<string, number>;
  setResume: (albumId: string, resume: AlbumResume) => void;
  setRate: (albumId: string, rate: number) => void;
};

export const useResumeStore = create<ResumeState>()(
  persist(
    (set) => ({
      positions: {},
      rates: {},
      setResume: (albumId, resume) =>
        set((state) => ({
          positions: { ...state.positions, [albumId]: resume },
        })),
      setRate: (albumId, rate) =>
        set((state) => ({
          rates: { ...state.rates, [albumId]: clampPlaybackRate(rate) },
        })),
    }),
    {
      name: "resume",
      storage: createJSONStorage(() => playbackStateStorage),
      partialize: (state) => ({
        positions: state.positions,
        rates: state.rates,
      }),
    },
  ),
);

export function persistAlbumResume(
  albumId: string,
  resume: AlbumResume,
): void {
  useResumeStore.getState().setResume(albumId, resume);
}

export function persistAlbumRate(albumId: string, rate: number): void {
  useResumeStore.getState().setRate(albumId, rate);
}

export function getAlbumResume(albumId: string): AlbumResume | undefined {
  return useResumeStore.getState().positions[albumId];
}

export function getAlbumRate(albumId: string): number {
  return clampPlaybackRate(
    useResumeStore.getState().rates[albumId] ?? DEFAULT_PLAYBACK_RATE,
  );
}
