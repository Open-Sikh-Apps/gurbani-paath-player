import { Mutex } from "async-mutex";
import debounce from "lodash/debounce";
import {
  PlayerQueue,
  TrackPlayer,
  type PlayerState,
} from "react-native-nitro-player";
import { AppState, type NativeEventSubscription } from "react-native";

import i18n from "@/i18n";
import { attachNativePlayerListeners } from "@/playback/native-listeners";
import {
  freezeSession,
  isNativePlaybackDead,
  persistFromStatus,
  requestNotificationPermission,
  statusFromNative,
  toTrackItems,
  trackInSession,
} from "@/playback/native-status";
import {
  getAlbumRate,
  persistAlbumRate,
  getAlbumResume,
} from "@/playback/resume-store";
import { snapshotsEqual, trackIndex } from "@/playback/session";
import { usePlaybackStore } from "@/playback/status-store";
import {
  clampPlaybackRate,
  DEFAULT_PLAYBACK_RATE,
  RESUME_DEBOUNCE_MS,
  REMOTE_SKIP_SEC,
  IGNORE_PROGRESS_MS,
  PAUSE_REWIND_SEC,
  ANDROID_NOTIFICATION_ICON,
  DEFAULT_REMOTE_PRIMARY,
  type LoadAlbumOptions,
  type PlayerEngine,
  type PlayerSession,
  type PlayerStatus,
  type RemotePrimary,
} from "@/playback/types";

function clampSeek(positionSec: number, durationSec: number): number {
  const duration = durationSec || 0;
  return Math.min(
    Math.max(0, positionSec),
    duration > 0 ? duration : Math.max(0, positionSec),
  );
}

export function createNitroPlayerEngine(): PlayerEngine {
  let session: PlayerSession | null = null;
  let nativePlaylistId: string | null = null;
  let cachedNative: PlayerState | null = null;
  let rate = DEFAULT_PLAYBACK_RATE;
  let appStateSub: NativeEventSubscription | null = null;
  let configured: Promise<void> | null = null;
  let listenersAttached = false;
  // After skip/seek, native can still emit a few stale progress ticks.
  let ignoreProgressUntil = 0;
  let seekAnchorSec = 0;
  // loadPlaylist emits seek/progress before JS session catches up; drop those ticks.
  let queueSwapInFlight = false;
  let lastError: string | null = null;
  let rewoundForThisPause = false;
  let wasPlaying = false;
  // Distinct from native playWhenReady: error/end/pause must not resume on restore.
  let wantsPlaying = false;
  let skipOnSourceError = false;
  let remotePrimary: RemotePrimary = DEFAULT_REMOTE_PRIMARY;
  const mutex = new Mutex();

  function nativePlayerConfig() {
    return {
      androidAutoEnabled: false,
      carPlayEnabled: false,
      showInNotification: true,
      remoteSkipForwardInterval: REMOTE_SKIP_SEC,
      remoteSkipBackwardInterval: REMOTE_SKIP_SEC,
      lookaheadCount: 1,
      // PlayerConfig has no extra flags; native configure parses this token.
      androidNotificationIcon: [
        `icon:${ANDROID_NOTIFICATION_ICON}`,
        `skipOnError:${skipOnSourceError ? "1" : "0"}`,
        `remotePrimary:${remotePrimary}`,
      ].join(";"),
    };
  }

  // leading + maxWait so 1s progress ticks still persist; trailing-only would reset forever.
  const debouncedPersist = debounce(
    (status: PlayerStatus) => {
      persistFromStatus(status);
    },
    RESUME_DEBOUNCE_MS,
    { leading: true, trailing: true, maxWait: RESUME_DEBOUNCE_MS },
  );

  function currentStatus(): PlayerStatus {
    return statusFromNative(session, cachedNative, rate, lastError);
  }

  function emit(next?: PlayerStatus): void {
    const status = next ?? currentStatus();
    usePlaybackStore.setState(status);
    debouncedPersist(status);
  }

  function persistNow(status: PlayerStatus): void {
    debouncedPersist.cancel();
    persistFromStatus(status);
    if (status.session) {
      persistAlbumRate(status.session.albumId, status.rate);
    }
  }

  function ensureAppState(): void {
    if (appStateSub) {
      return;
    }
    appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        void refreshFromNative().then((status) => {
          if (cachedNative && !isNativePlaybackDead(cachedNative)) {
            persistNow(status);
          }
        });
      }
      if (state === "active") {
        fire(async () => {
          await restoreNativeIfDead();
        });
      }
    });
  }

  async function readNativeRate(): Promise<void> {
    try {
      rate = clampPlaybackRate(await TrackPlayer.getPlaybackSpeed());
    } catch {
      // Keep the last known rate if native read fails.
    }
  }

  async function applyAlbumRate(albumId: string): Promise<void> {
    const saved = getAlbumRate(albumId);
    await TrackPlayer.setPlaybackSpeed(saved);
    rate = saved;
  }

  async function refreshFromNative(): Promise<PlayerStatus> {
    try {
      cachedNative = await TrackPlayer.getState();
    } catch {
      // Released exo throws; keep the last track so the mini player stays up.
      cachedNative = {
        currentTrack: cachedNative?.currentTrack ?? null,
        currentPosition: cachedNative?.currentPosition ?? 0,
        totalDuration: 0,
        currentState: "stopped",
        currentPlaylistId: cachedNative?.currentPlaylistId ?? null,
        currentIndex: cachedNative?.currentIndex ?? -1,
        currentPlayingType: "not-playing",
      };
    }
    await readNativeRate();
    const status = currentStatus();
    emit(status);
    return status;
  }

  function attachListeners(): void {
    if (listenersAttached) {
      return;
    }
    listenersAttached = true;
    attachNativePlayerListeners({
      shouldIgnoreNative: () => queueSwapInFlight,
      onTrackChange: () => {
        // Lock-screen prev/next land here too — they never call engine.previous/next.
        ignoreProgressUntil = Date.now() + IGNORE_PROGRESS_MS;
        seekAnchorSec = 0;
        if (queueSwapInFlight) {
          return;
        }
        void refreshFromNative().then((status) => {
          if (cachedNative && !isNativePlaybackDead(cachedNative)) {
            persistNow(status);
          }
        });
      },
      onPlaybackStateChange: (nativeState, reason) => {
        if (reason === "error") {
          lastError = i18n.t("player.playbackError");
          wantsPlaying = false;
        } else if (reason === "end") {
          wantsPlaying = false;
        } else if (nativeState === "playing" || nativeState === "buffering") {
          lastError = null;
        }
        void refreshFromNative().then(async (status) => {
          const pausedNow =
            wasPlaying && !status.playing && !status.buffering;
          wasPlaying = status.playing;
          if (status.playing) {
            rewoundForThisPause = false;
          }
          // Ended/error map to stopped; seeking then would restart the last seconds.
          if (
            pausedNow &&
            !rewoundForThisPause &&
            nativeState === "paused"
          ) {
            rewoundForThisPause = true;
            await applyPauseRewind();
            return;
          }
          if (
            !status.playing &&
            cachedNative &&
            !isNativePlaybackDead(cachedNative)
          ) {
            persistNow(status);
          }
        });
      },
      onProgress: (position, totalDuration) => {
        if (!cachedNative) {
          return;
        }
        if (
          session &&
          cachedNative.currentTrack?.id &&
          !trackInSession(session, cachedNative.currentTrack.id)
        ) {
          return;
        }
        if (
          Date.now() < ignoreProgressUntil &&
          Math.abs(position - seekAnchorSec) > 3
        ) {
          return;
        }
        cachedNative = {
          ...cachedNative,
          currentPosition: position,
          totalDuration,
        };
        emit();
      },
      onSeek: (position, totalDuration) => {
        if (!cachedNative) {
          return;
        }
        if (
          session &&
          cachedNative.currentTrack?.id &&
          !trackInSession(session, cachedNative.currentTrack.id)
        ) {
          return;
        }
        seekAnchorSec = position;
        ignoreProgressUntil = Date.now() + IGNORE_PROGRESS_MS;
        cachedNative = {
          ...cachedNative,
          currentPosition: position,
          totalDuration,
        };
        persistNow(currentStatus());
        emit();
      },
    });
    i18n.on("languageChanged", (lng: string) => {
      if (!session) {
        return;
      }
      const tracks = toTrackItems(session, lng);
      fire(async () => {
        await TrackPlayer.updateTracks(tracks);
      });
    });
  }

  async function applyPauseRewind(): Promise<void> {
    // Audiobook-style overlap: persist a little before the pause so resume is not mid-word.
    const state = await readNativeState();
    if (!state || state.currentState === "playing") {
      return;
    }
    const next = Math.max(0, state.currentPosition - PAUSE_REWIND_SEC);
    if (next >= state.currentPosition - 0.05) {
      persistNow(currentStatus());
      return;
    }
    seekAnchorSec = next;
    ignoreProgressUntil = Date.now() + IGNORE_PROGRESS_MS;
    await TrackPlayer.seek(next);
    if (cachedNative) {
      cachedNative = { ...cachedNative, currentPosition: next };
    }
    persistNow(currentStatus());
    emit();
  }

  async function seekByOverflowing(deltaSec: number): Promise<void> {
    // Leftover ±10 at a track edge lands on the neighbour; first/last tracks clamp.
    const state = await TrackPlayer.getState();
    const live = session;
    const index = state.currentIndex;
    const position = state.currentPosition;
    const duration =
      state.totalDuration ||
      (live && index >= 0 ? (live.tracks[index]?.durationSec ?? 0) : 0);
    const target = position + deltaSec;

    if (deltaSec < 0 && target < 0 && live && index > 0) {
      const prev = live.tracks[index - 1];
      const overflow = -target;
      const prevDur = prev?.durationSec ?? 0;
      const pos = Math.max(0, prevDur - overflow);
      await TrackPlayer.skipToIndex(index - 1);
      if (pos > 0) {
        await TrackPlayer.seek(pos);
      }
      seekAnchorSec = pos;
      ignoreProgressUntil = Date.now() + IGNORE_PROGRESS_MS;
      return;
    }
    if (
      deltaSec > 0 &&
      duration > 0 &&
      target > duration &&
      live &&
      index >= 0 &&
      index < live.tracks.length - 1
    ) {
      const leftover = target - duration;
      await TrackPlayer.skipToIndex(index + 1);
      if (leftover > 0) {
        await TrackPlayer.seek(leftover);
      }
      seekAnchorSec = leftover;
      ignoreProgressUntil = Date.now() + IGNORE_PROGRESS_MS;
      return;
    }

    const next = clampSeek(target, duration);
    seekAnchorSec = next;
    ignoreProgressUntil = Date.now() + IGNORE_PROGRESS_MS;
    await TrackPlayer.seek(next);
    if (cachedNative) {
      cachedNative = { ...cachedNative, currentPosition: next };
    }
  }

  function enqueue(task: () => Promise<void>): Promise<void> {
    return mutex.runExclusive(task);
  }

  function fire(task: () => Promise<void>): void {
    void enqueue(task).catch(() => {
      void refreshFromNative();
    });
  }

  async function ensureConfigured(): Promise<void> {
    if (!configured) {
      configured = (async () => {
        await requestNotificationPermission();
        await TrackPlayer.configure(nativePlayerConfig());
        await TrackPlayer.setRepeatMode("off");
        attachListeners();
        ensureAppState();
      })().catch((error: unknown) => {
        configured = null;
        throw error;
      });
    }
    await configured;
  }

  async function withNativeReady<T>(action: () => Promise<T>): Promise<T> {
    await ensureConfigured();
    await restoreNativeIfDead();
    return action();
  }

  async function pruneOtherPlaylists(keepId: string): Promise<void> {
    const playlists = PlayerQueue.getAllPlaylists();
    await Promise.all(
      playlists
        .filter((playlist) => playlist.id !== keepId)
        .map((playlist) => PlayerQueue.deletePlaylist(playlist.id)),
    );
  }

  async function applyStartPosition(
    nextSession: PlayerSession,
    options?: LoadAlbumOptions,
  ): Promise<void> {
    // Same album already loaded — seek/skip in place instead of rebuilding the native playlist.
    const index =
      options?.trackId != null
        ? trackIndex(nextSession, options.trackId)
        : await TrackPlayer.getCurrentTrackIndex();
    const startIndex = index >= 0 ? index : 0;
    const currentIndex = await TrackPlayer.getCurrentTrackIndex();
    if (startIndex !== currentIndex) {
      await TrackPlayer.skipToIndex(startIndex);
    }
    const positionSec = options?.positionSec;
    if (positionSec != null && positionSec >= 0) {
      await TrackPlayer.seek(positionSec);
    }
  }

  function resumeLoadOptions(): LoadAlbumOptions | undefined {
    if (!session || session.tracks.length === 0) {
      return undefined;
    }
    const status = currentStatus();
    const stored = getAlbumResume(session.albumId);
    const trackId =
      status.currentTrackId ?? stored?.trackId ?? session.tracks[0]?.id;
    const positionSec =
      status.positionSec > 0
        ? status.positionSec
        : stored?.trackId === trackId
          ? (stored?.positionSec ?? 0)
          : 0;
    return { trackId, positionSec };
  }

  async function readNativeState(): Promise<PlayerState | null> {
    try {
      return await TrackPlayer.getState();
    } catch {
      return null;
    }
  }

  async function rebuildNativeFromSession(
    options = resumeLoadOptions(),
  ): Promise<void> {
    if (!session) {
      return;
    }
    // playSong always starts playback. Reload paused unless the user still wants play.
    await loadIntoNative(session, options);
    if (wantsPlaying) {
      await TrackPlayer.play();
    } else {
      try {
        await TrackPlayer.pause();
      } catch {
        // Fresh load may already be paused.
      }
    }
  }

  async function restoreNativeIfDead(): Promise<void> {
    if (!session) {
      return;
    }
    if (!isNativePlaybackDead(await readNativeState())) {
      return;
    }
    await rebuildNativeFromSession();
  }

  async function loadIntoNative(
    nextSession: PlayerSession,
    options?: LoadAlbumOptions,
  ): Promise<void> {
    await ensureConfigured();
    const outgoing = currentStatus();
    queueSwapInFlight = true;
    ignoreProgressUntil = Date.now() + 2000;
    seekAnchorSec = options?.positionSec ?? 0;
    try {
      if (
        outgoing.session &&
        outgoing.session.albumId !== nextSession.albumId
      ) {
        persistNow(outgoing);
      }
      const frozen = freezeSession(nextSession);
      // Point JS at the incoming album before native load so stale ticks cannot
      // write the new timeline onto the outgoing album id.
      session = frozen;
      const tracks = toTrackItems(frozen);
      const playlistId = await PlayerQueue.createPlaylist(
        frozen.albumId,
        undefined,
        frozen.artworkUrl,
      );
      await PlayerQueue.addTracksToPlaylist(playlistId, tracks);
      await TrackPlayer.setRepeatMode("off");
      const index =
        options?.trackId != null ? trackIndex(frozen, options.trackId) : 0;
      const startIndex = index >= 0 ? index : 0;
      // Pass startIndex here. loadPlaylist(0) then skipToIndex still windows ExoPlayer from N.
      await PlayerQueue.loadPlaylist(playlistId, startIndex);
      const positionSec = options?.positionSec ?? 0;
      if (positionSec > 0) {
        await TrackPlayer.seek(positionSec);
      }
      await applyAlbumRate(frozen.albumId);
      nativePlaylistId = playlistId;
      try {
        await pruneOtherPlaylists(playlistId);
      } catch {
        // Leftover native playlists are not the session source of truth.
      }
      await refreshFromNative();
    } finally {
      queueSwapInFlight = false;
    }
  }

  const engine: PlayerEngine = {
    async loadAlbum(nextSession, options) {
      await enqueue(async () => {
        if (
          session &&
          nativePlaylistId &&
          snapshotsEqual(session, nextSession)
        ) {
          // Same track ids/urls — keep the frozen native queue (catalogue refresh must not rebuild it).
          await ensureConfigured();
          if (isNativePlaybackDead(await readNativeState())) {
            await loadIntoNative(nextSession, options ?? resumeLoadOptions());
            return;
          }
          await applyStartPosition(session, options);
          await applyAlbumRate(session.albumId);
          await refreshFromNative();
          return;
        }
        await loadIntoNative(nextSession, options);
      });
    },
    play() {
      fire(async () => {
        lastError = null;
        wantsPlaying = true;
        const options = resumeLoadOptions();
        try {
          await withNativeReady(() => TrackPlayer.play());
        } catch {
          await rebuildNativeFromSession(options);
          await TrackPlayer.play();
        }
        const after = await refreshFromNative();
        if (
          session &&
          !after.playing &&
          !after.buffering &&
          isNativePlaybackDead(cachedNative)
        ) {
          await rebuildNativeFromSession(options);
          await TrackPlayer.play();
          await refreshFromNative();
        }
      });
    },
    pause() {
      fire(async () => {
        wantsPlaying = false;
        await ensureConfigured();
        await TrackPlayer.pause();
        persistNow(await refreshFromNative());
      });
    },
    next() {
      fire(async () => {
        await withNativeReady(() => TrackPlayer.skipToNext());
        persistNow(await refreshFromNative());
      });
    },
    previous() {
      fire(async () => {
        await withNativeReady(() => TrackPlayer.skipToPrevious());
        persistNow(await refreshFromNative());
      });
    },
    skipTo(trackId) {
      fire(async () => {
        if (!session) {
          return;
        }
        const index = trackIndex(session, trackId);
        if (index < 0) {
          return;
        }
        await withNativeReady(() => TrackPlayer.skipToIndex(index));
        persistNow(await refreshFromNative());
      });
    },
    async seekBy(deltaSec) {
      await enqueue(async () => {
        await withNativeReady(async () => {
          await seekByOverflowing(deltaSec);
        });
        await refreshFromNative();
      });
    },
    async seekTo(positionSec) {
      await enqueue(async () => {
        await withNativeReady(async () => {
          const state = await TrackPlayer.getState();
          const next = clampSeek(positionSec, state.totalDuration);
          seekAnchorSec = next;
          ignoreProgressUntil = Date.now() + IGNORE_PROGRESS_MS;
          await TrackPlayer.seek(next);
          // getState() can still return the pre-seek position; keep the thumb put.
          if (cachedNative) {
            cachedNative = { ...cachedNative, currentPosition: next };
          }
        });
        emit();
      });
    },
    async setRate(nextRate) {
      await enqueue(async () => {
        await ensureConfigured();
        const clamped = clampPlaybackRate(nextRate);
        await TrackPlayer.setPlaybackSpeed(clamped);
        rate = clamped;
        if (session) {
          persistAlbumRate(session.albumId, clamped);
        }
        await refreshFromNative();
      });
    },
    async setSkipOnSourceError(enabled) {
      await enqueue(async () => {
        skipOnSourceError = enabled;
        await ensureConfigured();
        await TrackPlayer.configure(nativePlayerConfig());
      });
    },
    async setRemotePrimary(primary) {
      await enqueue(async () => {
        remotePrimary = primary === "skip" ? "skip" : "seek";
        await ensureConfigured();
        await TrackPlayer.configure(nativePlayerConfig());
      });
    },
    subscribe(listener) {
      listener(usePlaybackStore.getState());
      return usePlaybackStore.subscribe((status) => listener(status));
    },
    getStatus: currentStatus,
  };

  ensureAppState();
  return engine;
}
