import { getPlayerEngine } from "@/playback/engine";
import { initSleepTimer } from "@/playback/sleep-timer";
import type { LoadAlbumOptions, PlayerSession, RemotePrimary } from "@/playback/types";
import { usePreferencesStore } from "@/state/preferences-store";

export { usePlaybackStore } from "@/playback/status-store";

let started = false;

export function initPlayback(): void {
  if (started) {
    return;
  }
  started = true;
  initSleepTimer();
  void setRemotePrimary(usePreferencesStore.getState().remotePrimary);
}

export async function playAlbum(
  session: PlayerSession,
  options?: LoadAlbumOptions,
): Promise<void> {
  const engine = getPlayerEngine();
  await engine.loadAlbum(session, options);
  engine.play();
}

export function togglePlayPause(): void {
  const engine = getPlayerEngine();
  if (engine.getStatus().playing) {
    engine.pause();
    return;
  }
  engine.play();
}

export function pausePlayback(): void {
  getPlayerEngine().pause();
}

export function setPlaybackRate(rate: number): void {
  void getPlayerEngine().setRate(rate);
}

export function skipNext(): void {
  getPlayerEngine().next();
}

export function skipPrevious(): void {
  getPlayerEngine().previous();
}

export function skipToTrack(trackId: string): void {
  getPlayerEngine().skipTo(trackId);
}

export function seekBy(deltaSec: number): void {
  void getPlayerEngine().seekBy(deltaSec);
}

export function seekTo(positionSec: number): void {
  void getPlayerEngine().seekTo(positionSec);
}

export function setSkipOnSourceError(enabled: boolean): void {
  void getPlayerEngine().setSkipOnSourceError(enabled);
}

export function setRemotePrimary(primary: RemotePrimary): void {
  void getPlayerEngine().setRemotePrimary(primary);
}

export function formatDuration(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
