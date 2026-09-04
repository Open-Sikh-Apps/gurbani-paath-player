import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { clampPlaybackRate, DEFAULT_PLAYBACK_RATE } from "@/playback/types";
import { playbackStateStorage } from "@/state/mmkv";

export type AlbumResume = {
  trackId: string;
  positionSec: number;
  updatedAt: number;
  // Length we measured when writing (native). Catalogue durationSec can disagree with the file.
  durationSec?: number;
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

/** Near start or last-frame is not a mid-listen; history and album omit the time. */
export const RESUME_MIN_SEC = 1;
export const RESUME_END_SEC = 0.75;

export function midTrackResumeSec(
  positionSec: number,
  durationSec: number | undefined,
): number | null {
  if (positionSec < RESUME_MIN_SEC) {
    return null;
  }
  if (
    durationSec != null &&
    durationSec > 0 &&
    positionSec >= durationSec - RESUME_END_SEC
  ) {
    return null;
  }
  return positionSec;
}

/** Last-frame on the last track (or live albumEnded) is finished — play from 0, do not show resume time. */
export function isEndedAlbumResume(
  resume: { trackId: string; positionSec: number },
  lastTrackId: string | undefined,
  durationSec: number | undefined,
  liveAlbumEnded: boolean,
): boolean {
  if (liveAlbumEnded) {
    return true;
  }
  if (!lastTrackId || resume.trackId !== lastTrackId) {
    return false;
  }
  return (
    durationSec != null &&
    durationSec > 0 &&
    resume.positionSec >= durationSec - RESUME_END_SEC
  );
}

export function getAlbumRate(albumId: string): number {
  return clampPlaybackRate(
    useResumeStore.getState().rates[albumId] ?? DEFAULT_PLAYBACK_RATE,
  );
}
