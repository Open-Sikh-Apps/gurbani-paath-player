import {
  getAlbumRate,
  persistAlbumRate,
  persistAlbumResume,
} from "@/playback/resume-store";
import { snapshotsEqual, trackIndex } from "@/playback/session";
import {
  clampPlaybackRate,
  idlePlayerStatus,
  PAUSE_REWIND_SEC,
  type LoadAlbumOptions,
  type PlayerEngine,
  type PlayerSession,
  type PlayerStatus,
} from "@/playback/types";

const RESUME_DEBOUNCE_MS = 1000;

function freezeSession(session: PlayerSession): PlayerSession {
  return {
    ...session,
    tracks: session.tracks.map((track) => ({ ...track })),
  };
}

function persistFromStatus(status: PlayerStatus): void {
  if (!status.session || !status.currentTrackId) {
    return;
  }
  persistAlbumResume(status.session.albumId, {
    trackId: status.currentTrackId,
    positionSec: status.positionSec,
    updatedAt: Date.now(),
  });
}

export function createNitroPlayerEngine(): PlayerEngine {
  let status: PlayerStatus = idlePlayerStatus;
  let resumeTimer: ReturnType<typeof setTimeout> | null = null;
  let lastResumePersistAt = 0;
  let pendingResume: PlayerStatus | null = null;
  const listeners = new Set<(next: PlayerStatus) => void>();

  function persistNow(next: PlayerStatus): void {
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
    pendingResume = null;
    lastResumePersistAt = Date.now();
    persistFromStatus(next);
  }

  function emit(next: PlayerStatus): void {
    status = next;
    for (const listener of listeners) {
      listener(status);
    }
    pendingResume = status;
    const wait = RESUME_DEBOUNCE_MS - (Date.now() - lastResumePersistAt);
    if (wait <= 0) {
      persistNow(status);
      return;
    }
    if (resumeTimer) {
      return;
    }
    resumeTimer = setTimeout(() => {
      resumeTimer = null;
      lastResumePersistAt = Date.now();
      if (pendingResume) {
        persistFromStatus(pendingResume);
        pendingResume = null;
      }
    }, wait);
  }

  function applyOptions(
    session: PlayerSession,
    options?: LoadAlbumOptions,
  ): PlayerStatus {
    const index =
      options?.trackId != null ? trackIndex(session, options.trackId) : 0;
    const currentIndex = index >= 0 ? index : 0;
    const track = session.tracks[currentIndex];
    return {
      session,
      playing: false,
      currentIndex,
      currentTrackId: track?.id ?? null,
      positionSec: options?.positionSec ?? 0,
      durationSec: track?.durationSec ?? 0,
      buffering: false,
      error: null,
      rate: getAlbumRate(session.albumId),
    };
  }

  return {
    async loadAlbum(nextSession, options) {
      if (status.session && snapshotsEqual(status.session, nextSession)) {
        const index =
          options?.trackId != null
            ? trackIndex(status.session, options.trackId)
            : status.currentIndex;
        const currentIndex = index >= 0 ? index : status.currentIndex;
        const track = status.session.tracks[currentIndex];
        emit({
          ...status,
          currentIndex,
          currentTrackId: track?.id ?? null,
          positionSec:
            options?.positionSec ??
            (currentIndex === status.currentIndex ? status.positionSec : 0),
          durationSec: track?.durationSec ?? 0,
          error: null,
          rate: getAlbumRate(status.session.albumId),
        });
        return;
      }
      emit(applyOptions(freezeSession(nextSession), options));
    },
    play() {
      if (!status.session) {
        return;
      }
      emit({ ...status, playing: true });
    },
    pause() {
      if (!status.session) {
        return;
      }
      const positionSec = Math.max(0, status.positionSec - PAUSE_REWIND_SEC);
      const next = { ...status, playing: false, positionSec };
      persistFromStatus(next);
      emit(next);
    },
    next() {
      if (!status.session) {
        return;
      }
      const currentIndex = Math.min(
        status.currentIndex + 1,
        status.session.tracks.length - 1,
      );
      const track = status.session.tracks[currentIndex];
      emit({
        ...status,
        currentIndex,
        currentTrackId: track?.id ?? null,
        positionSec: 0,
        durationSec: track?.durationSec ?? 0,
      });
    },
    previous() {
      if (!status.session) {
        return;
      }
      const currentIndex = Math.max(0, status.currentIndex - 1);
      const track = status.session.tracks[currentIndex];
      emit({
        ...status,
        currentIndex,
        currentTrackId: track?.id ?? null,
        positionSec: 0,
        durationSec: track?.durationSec ?? 0,
      });
    },
    skipTo(trackId) {
      if (!status.session) {
        return;
      }
      emit(applyOptions(status.session, { trackId, positionSec: 0 }));
    },
    async seekBy(deltaSec) {
      if (!status.session) {
        return;
      }
      const duration = status.durationSec || 0;
      const positionSec = Math.min(
        Math.max(0, status.positionSec + deltaSec),
        duration > 0 ? duration : status.positionSec + deltaSec,
      );
      emit({ ...status, positionSec });
    },
    async seekTo(positionSec) {
      if (!status.session) {
        return;
      }
      const duration = status.durationSec || 0;
      emit({
        ...status,
        positionSec: Math.min(
          Math.max(0, positionSec),
          duration > 0 ? duration : Math.max(0, positionSec),
        ),
      });
    },
    async setRate(nextRate) {
      if (!status.session) {
        return;
      }
      const rate = clampPlaybackRate(nextRate);
      persistAlbumRate(status.session.albumId, rate);
      emit({ ...status, rate });
    },
    async setSkipOnSourceError() {
      // Web adapter has no native skip-on-error.
    },
    async setRemotePrimary() {
      // Web adapter has no lock-screen command slots.
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(status);
      return () => {
        listeners.delete(listener);
      };
    },
    getStatus: () => status,
  };
}
