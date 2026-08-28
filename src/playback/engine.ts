import { createNitroPlayerEngine } from "@/playback/nitro-player-adapter";
import type { PlayerEngine } from "@/playback/types";

let engine: PlayerEngine | null = null;

export function getPlayerEngine(): PlayerEngine {
  if (!engine) {
    engine = createNitroPlayerEngine();
  }
  return engine;
}
