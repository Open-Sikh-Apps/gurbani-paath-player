import { AppState } from "react-native";
import { create } from "zustand";

import { getPlayerEngine } from "@/playback/engine";
import { usePlaybackStore } from "@/playback/status-store";
import { PLAYBACK_RATE_MIN, type PlayerStatus } from "@/playback/types";

export type SleepKind = "off" | "track" | "album" | "duration" | "tracks";

type SleepTimerState = {
  kind: SleepKind;
  deadlineAt: number | null;
  remainingSec: number;
  remainingTrackEnds: number;
  armedTrackId: string | null;
  armedIndex: number | null;
};

const idle: SleepTimerState = {
  kind: "off",
  deadlineAt: null,
  remainingSec: 0,
  remainingTrackEnds: 0,
  armedTrackId: null,
  armedIndex: null,
};

export const useSleepTimerStore = create<SleepTimerState>(() => ({ ...idle }));

let started = false;
let tickTimer: ReturnType<typeof setInterval> | null = null;

function remainingContentSec(
  status: PlayerStatus,
  kind: "track" | "album",
): number {
  if (!status.session) {
    return 0;
  }
  const current = Math.max(0, status.durationSec - status.positionSec);
  if (kind === "track") {
    return current;
  }
  const rest = status.session.tracks
    .slice(status.currentIndex + 1)
    .reduce((sum, track) => sum + (track.durationSec ?? 0), 0);
  return current + rest;
}

function wallSec(contentSec: number, rate: number): number {
  return contentSec / Math.max(rate, PLAYBACK_RATE_MIN);
}

function stopTicker(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

function startTicker(): void {
  if (tickTimer) {
    return;
  }
  tickTimer = setInterval(tick, 1000);
}

function fire(): void {
  getPlayerEngine().pause();
  useSleepTimerStore.setState({ ...idle });
  stopTicker();
}

function tick(): void {
  const sleep = useSleepTimerStore.getState();
  if (sleep.kind === "off") {
    return;
  }
  const status = usePlaybackStore.getState();
  const now = Date.now();

  if (sleep.kind === "duration") {
    const remaining = Math.max(0, ((sleep.deadlineAt ?? now) - now) / 1000);
    useSleepTimerStore.setState({ remainingSec: remaining });
    if (remaining <= 0) {
      fire();
    }
    return;
  }

  if (sleep.kind === "tracks") {
    tickTracks(sleep, status, now);
    return;
  }

  // Natural track end is a near-zero remaining then a new trackId. User skip
  // jumps earlier, so re-arm instead of pausing.
  if (
    sleep.kind === "track" &&
    sleep.armedTrackId &&
    status.currentTrackId &&
    status.currentTrackId !== sleep.armedTrackId
  ) {
    if (sleep.remainingSec < 5) {
      fire();
      return;
    }
    useSleepTimerStore.setState({ armedTrackId: status.currentTrackId });
  }

  const content = remainingContentSec(status, sleep.kind);
  const remaining = wallSec(content, status.rate);
  useSleepTimerStore.setState({
    remainingSec: remaining,
    deadlineAt: now + remaining * 1000,
    armedTrackId:
      sleep.kind === "track"
        ? (status.currentTrackId ?? sleep.armedTrackId)
        : sleep.armedTrackId,
  });
  if (content <= 0.35) {
    fire();
  }
}

function tickTracks(
  sleep: SleepTimerState,
  status: PlayerStatus,
  now: number,
): void {
  let remainingEnds = sleep.remainingTrackEnds;
  if (
    sleep.armedTrackId &&
    status.currentTrackId &&
    status.currentTrackId !== sleep.armedTrackId
  ) {
    // Only skip-next / natural next consume a count; skip-previous does not.
    const movedForward = status.currentIndex > (sleep.armedIndex ?? -1);
    if (movedForward) {
      remainingEnds -= 1;
      if (remainingEnds <= 0) {
        fire();
        return;
      }
    }
  }

  const content = remainingContentSec(status, "track");
  const remaining = wallSec(content, status.rate);
  useSleepTimerStore.setState({
    remainingSec: remaining,
    remainingTrackEnds: remainingEnds,
    deadlineAt: now + remaining * 1000,
    armedTrackId: status.currentTrackId ?? sleep.armedTrackId,
    armedIndex: status.currentIndex,
  });
  if (remainingEnds <= 1 && content <= 0.35) {
    fire();
  }
}

export function initSleepTimer(): void {
  if (started) {
    return;
  }
  started = true;
  usePlaybackStore.subscribe(() => tick());
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      tick();
    }
  });
}

export function cancelSleepTimer(): void {
  useSleepTimerStore.setState({ ...idle });
  stopTicker();
}

export function armSleepTrack(): void {
  const status = usePlaybackStore.getState();
  const content = remainingContentSec(status, "track");
  const remaining = wallSec(content, status.rate);
  useSleepTimerStore.setState({
    kind: "track",
    remainingSec: remaining,
    remainingTrackEnds: 0,
    deadlineAt: Date.now() + remaining * 1000,
    armedTrackId: status.currentTrackId,
    armedIndex: status.currentIndex,
  });
  startTicker();
}

export function armSleepAlbum(): void {
  const status = usePlaybackStore.getState();
  const content = remainingContentSec(status, "album");
  const remaining = wallSec(content, status.rate);
  useSleepTimerStore.setState({
    kind: "album",
    remainingSec: remaining,
    remainingTrackEnds: 0,
    deadlineAt: Date.now() + remaining * 1000,
    armedTrackId: null,
    armedIndex: null,
  });
  startTicker();
}

export function armSleepDuration(hours: number, minutes: number): void {
  const totalSec = Math.max(0, hours) * 3600 + Math.max(0, minutes) * 60;
  if (totalSec <= 0) {
    return;
  }
  useSleepTimerStore.setState({
    kind: "duration",
    remainingSec: totalSec,
    remainingTrackEnds: 0,
    deadlineAt: Date.now() + totalSec * 1000,
    armedTrackId: null,
    armedIndex: null,
  });
  startTicker();
}

export function armSleepTracks(count: number): void {
  const n = Math.max(1, Math.floor(count));
  const status = usePlaybackStore.getState();
  const content = remainingContentSec(status, "track");
  const remaining = wallSec(content, status.rate);
  useSleepTimerStore.setState({
    kind: "tracks",
    remainingTrackEnds: n,
    remainingSec: remaining,
    deadlineAt: Date.now() + remaining * 1000,
    armedTrackId: status.currentTrackId,
    armedIndex: status.currentIndex,
  });
  startTicker();
}

export function isSleepArmed(): boolean {
  return useSleepTimerStore.getState().kind !== "off";
}
