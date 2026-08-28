import {
  PermissionsAndroid,
  Platform,
} from "react-native";
import type { PlayerState, TrackItem } from "react-native-nitro-player";

import { resolveL10n } from "@/catalogue/resolve-l10n";
import i18n from "@/i18n";
import { FALLBACK_LOCALE } from "@/i18n/locales-constants";
import { persistAlbumResume } from "@/playback/resume-store";
import {
  idlePlayerStatus,
  type PlayerSession,
  type PlayerStatus,
  type SessionTrack,
} from "@/playback/types";

export function currentLocale(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? FALLBACK_LOCALE;
}

export function freezeSession(session: PlayerSession): PlayerSession {
  // Catalogue objects must not mutate the live queue if a refresh rewrites them.
  return {
    ...session,
    tracks: session.tracks.map((track) => ({ ...track })),
  };
}

export function toTrackItems(
  session: PlayerSession,
  locale = currentLocale(),
): TrackItem[] {
  const reciter = resolveL10n(session.reciterName, locale);
  return session.tracks.map((track) => ({
    id: track.id,
    title: resolveL10n(track.title, locale),
    artist: reciter,
    album: reciter,
    duration: track.durationSec ?? 0,
    url: track.url,
    artwork: session.artworkUrl,
    extraPayload:
      track.startAng != null ? { startAng: track.startAng } : undefined,
  }));
}

export function trackInSession(
  session: PlayerSession,
  trackId: string | null | undefined,
): SessionTrack | undefined {
  if (!trackId) {
    return undefined;
  }
  return session.tracks.find((item) => item.id === trackId);
}

export function statusFromNative(
  session: PlayerSession | null,
  state: PlayerState | null,
  rate: number,
  error: string | null = null,
): PlayerStatus {
  if (!session || !state) {
    return { ...idlePlayerStatus, rate, error };
  }
  const nativeId = state.currentTrack?.id;
  // Foreign native id = previous album still reporting. Do not map that
  // timeline onto this session by index (that wrote seek position onto the wrong album).
  if (nativeId && !trackInSession(session, nativeId)) {
    return {
      ...idlePlayerStatus,
      session,
      buffering: true,
      error,
      rate,
    };
  }
  const currentIndex = Math.max(0, state.currentIndex);
  const track =
    trackInSession(session, nativeId) ?? session.tracks[currentIndex];
  return {
    session,
    playing: state.currentState === "playing",
    currentIndex,
    currentTrackId: track?.id ?? nativeId ?? null,
    positionSec: state.currentPosition,
    durationSec: state.totalDuration || track?.durationSec || 0,
    buffering: state.currentState === "buffering",
    error,
    rate,
  };
}

export function persistFromStatus(status: PlayerStatus): void {
  if (!status.session || !status.currentTrackId) {
    return;
  }
  const track = trackInSession(status.session, status.currentTrackId);
  const duration = track?.durationSec ?? status.durationSec;
  // Refuse a position past the track; album-swap ticks were persisting the other album's seek.
  if (duration > 0 && status.positionSec > duration + 1) {
    return;
  }
  persistAlbumResume(status.session.albumId, {
    trackId: status.currentTrackId,
    positionSec: Math.max(0, status.positionSec),
    updatedAt: Date.now(),
  });
}

// Service death / audio-focus stop leaves ExoPlayer STATE_IDLE. play() without
// prepare() is a no-op; currentTrack can still be set, so null-track is not enough.
export function isNativePlaybackDead(state: PlayerState | null): boolean {
  if (!state?.currentTrack?.id) {
    return true;
  }
  if (state.currentPlayingType === "not-playing") {
    return true;
  }
  return state.currentState === "stopped";
}

export async function requestNotificationPermission(): Promise<void> {
  // Android 13+ hides the playback shade without POST_NOTIFICATIONS.
  if (Platform.OS !== "android" || Platform.Version < 33) {
    return;
  }
  await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
}
