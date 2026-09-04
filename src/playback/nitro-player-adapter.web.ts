import {
  getAlbumRate,
  persistAlbumRate,
  persistAlbumResume,
} from "@/playback/resume-store";
import { getSessionTrack, snapshotsEqual, trackIndex, withLocalUrls } from "@/playback/session";
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
  // Catalogue objects must not mutate the live queue if a refresh rewrites them.
  return {
    ...session,
    tracks: session.tracks.map((track) => ({ ...track })),
  };
}

function persistFromStatus(status: PlayerStatus): void {
  if (!status.session || !status.currentTrackId) {
    return;
  }
  // Album-end already wrote the last frame. Later ticks can report 0.
  if (status.albumEnded) {
    return;
  }
  persistAlbumResume(status.session.albumId, {
    trackId: status.currentTrackId,
    positionSec: status.positionSec,
    updatedAt: Date.now(),
    ...(status.durationSec > 0 ? { durationSec: status.durationSec } : {}),
  });
}

/** Web PlayerEngine stand-in: same API, no TrackPlayer. Used by Expo web only. */
export function createNitroPlayerEngine(): PlayerEngine {
  let status: PlayerStatus = idlePlayerStatus;
  let resumeTimer: ReturnType<typeof setTimeout> | null = null;
  let lastResumePersistAt = 0;
  let pendingResume: PlayerStatus | null = null;
  const listeners = new Set<(next: PlayerStatus) => void>();

  /** Flush resume immediately (cancel the 1s debounce). */
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
    // Keep MMKV off the seek/progress tick; persistNow still flushes immediately on pause.
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
      albumEnded: false,
    };
  }

  // Match native: last-track seek to the end is album-over, not a stuck last frame.
  function atAlbumEnd(next: PlayerStatus): boolean {
    const last =
      next.session != null &&
      next.currentIndex >= next.session.tracks.length - 1;
    return (
      last && next.durationSec > 0 && next.positionSec >= next.durationSec - 0.75
    );
  }

  function emitPosition(positionSec: number): void {
    if (!status.session) {
      return;
    }
    const duration = status.durationSec || 0;
    const clamped = Math.min(
      Math.max(0, positionSec),
      duration > 0 ? duration : Math.max(0, positionSec),
    );
    const ended = atAlbumEnd({ ...status, positionSec: clamped });
    emit({
      ...status,
      playing: ended ? false : status.playing,
      positionSec: clamped,
      albumEnded: ended,
    });
  }

  return {
    async loadAlbum(nextSession, options) {
      if (status.session && snapshotsEqual(status.session, nextSession)) {
        // Same track ids/urls — keep the frozen session (catalogue refresh must not rebuild it).
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
          albumEnded: false,
        });
        return;
      }
      emit(applyOptions(freezeSession(nextSession), options));
    },
    play() {
      if (!status.session) {
        return;
      }
      // Native play() at the last frame is a no-op; restart from 0 like the adapter.
      emit({
        ...status,
        playing: true,
        albumEnded: false,
        positionSec: status.albumEnded ? 0 : status.positionSec,
      });
    },
    pause() {
      if (!status.session) {
        return;
      }
      // Same 2s overlap as native so resume is not mid-word.
      const positionSec = Math.max(0, status.positionSec - PAUSE_REWIND_SEC);
      const next = { ...status, playing: false, positionSec };
      persistFromStatus(next);
      emit(next);
    },
    next() {
      if (!status.session) {
        return;
      }
      if (status.currentIndex >= status.session.tracks.length - 1) {
        return;
      }
      const resolved = withLocalUrls(status.session);
      const currentIndex = Math.min(
        status.currentIndex + 1,
        resolved.tracks.length - 1,
      );
      const track = resolved.tracks[currentIndex];
      emit({
        ...status,
        session: freezeSession(resolved),
        currentIndex,
        currentTrackId: track?.id ?? null,
        positionSec: 0,
        durationSec: track?.durationSec ?? 0,
        albumEnded: false,
      });
    },
    previous() {
      if (!status.session) {
        return;
      }
      if (status.currentIndex <= 0) {
        return;
      }
      const resolved = withLocalUrls(status.session);
      const currentIndex = Math.max(0, status.currentIndex - 1);
      const track = resolved.tracks[currentIndex];
      emit({
        ...status,
        session: freezeSession(resolved),
        currentIndex,
        currentTrackId: track?.id ?? null,
        positionSec: 0,
        durationSec: track?.durationSec ?? 0,
        albumEnded: false,
      });
    },
    skipTo(trackId) {
      if (!status.session) {
        return;
      }
      const resolved = withLocalUrls(status.session);
      emit(applyOptions(freezeSession(resolved), { trackId, positionSec: 0 }));
    },
    async seekBy(deltaSec) {
      emitPosition(status.positionSec + deltaSec);
    },
    async seekTo(positionSec) {
      emitPosition(positionSec);
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
    syncLiveQueueSources() {
      if (!status.session) {
        return;
      }
      const currentTrackId = status.currentTrackId;
      const resolved = withLocalUrls(status.session);
      // Pin the playing item so a finished download does not restart the current stream.
      const frozen = currentTrackId
        ? getSessionTrack(status.session, currentTrackId)
        : undefined;
      const merged =
        status.playing && currentTrackId && frozen
          ? {
              ...resolved,
              tracks: resolved.tracks.map((track) =>
                track.id === currentTrackId
                  ? { ...track, url: frozen.url }
                  : track,
              ),
            }
          : resolved;
      if (snapshotsEqual(status.session, merged)) {
        return;
      }
      emit({ ...status, session: freezeSession(merged) });
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
