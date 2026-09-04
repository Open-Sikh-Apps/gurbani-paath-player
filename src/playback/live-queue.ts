import { getPlayerEngine } from "@/playback/engine";

/** Downloads call this via dynamic import so playback ↔ downloads do not import each other statically. */
export function notifyLiveQueueSourcesChanged(): void {
  getPlayerEngine().syncLiveQueueSources();
}
