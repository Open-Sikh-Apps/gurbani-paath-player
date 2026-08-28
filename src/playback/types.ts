import type { L10nText } from "@/types/catalogue";

export const PLAYBACK_RATE_MIN = 0.25;
export const PLAYBACK_RATE_MAX = 2;
export const PLAYBACK_RATE_STEP = 0.25;
export const DEFAULT_PLAYBACK_RATE = 1;

export const RESUME_DEBOUNCE_MS = 1000;
export const REMOTE_SKIP_SEC = 10;
export const IGNORE_PROGRESS_MS = 1200;
export const PAUSE_REWIND_SEC = 2;
/** Android `drawable/` name for the media-session small icon (white silhouette). */
export const ANDROID_NOTIFICATION_ICON = "notification_icon";

export type RemotePrimary = "seek" | "skip";
export const DEFAULT_REMOTE_PRIMARY: RemotePrimary = "seek";

export function clampPlaybackRate(rate: number): number {
  if (!Number.isFinite(rate)) {
    return DEFAULT_PLAYBACK_RATE;
  }
  const stepped = Math.round(rate / PLAYBACK_RATE_STEP) * PLAYBACK_RATE_STEP;
  return Math.min(
    PLAYBACK_RATE_MAX,
    Math.max(PLAYBACK_RATE_MIN, Number(stepped.toFixed(2))),
  );
}

export type SessionTrack = {
  id: string;
  url: string;
  title: L10nText;
  durationSec?: number;
  startAng?: number;
};

export type PlayerSession = {
  albumId: string;
  reciterName: L10nText;
  scriptureId?: string;
  artworkUrl?: string;
  tracks: SessionTrack[];
};

export type LoadAlbumOptions = {
  trackId?: string;
  positionSec?: number;
};

export type PlayerStatus = {
  session: PlayerSession | null;
  playing: boolean;
  currentIndex: number;
  currentTrackId: string | null;
  positionSec: number;
  durationSec: number;
  buffering: boolean;
  error: string | null;
  rate: number;
};

export const idlePlayerStatus: PlayerStatus = {
  session: null,
  playing: false,
  currentIndex: 0,
  currentTrackId: null,
  positionSec: 0,
  durationSec: 0,
  buffering: false,
  error: null,
  rate: DEFAULT_PLAYBACK_RATE,
};

export type PlayerEngine = {
  loadAlbum: (
    session: PlayerSession,
    options?: LoadAlbumOptions,
  ) => Promise<void>;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  skipTo: (trackId: string) => void;
  seekBy: (deltaSec: number) => Promise<void>;
  seekTo: (positionSec: number) => Promise<void>;
  setRate: (rate: number) => Promise<void>;
  setSkipOnSourceError: (enabled: boolean) => Promise<void>;
  setRemotePrimary: (primary: RemotePrimary) => Promise<void>;
  subscribe: (listener: (status: PlayerStatus) => void) => () => void;
  getStatus: () => PlayerStatus;
};
