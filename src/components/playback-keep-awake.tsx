import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from "expo-keep-awake";

import { usePlaybackStore } from "@/playback";
import { usePreferencesStore } from "@/state/preferences-store";

const TAG = "playback-keep-awake";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function deactivateQuietly(): Promise<void> {
  try {
    await deactivateKeepAwake(TAG);
  } catch {
    // Throws when the Activity is gone; retry after it is back.
  }
}

export function PlaybackKeepAwake() {
  const enabled = usePreferencesStore((state) => state.keepScreenOnWhilePlaying);
  const playing = usePlaybackStore((state) => state.playing);
  const buffering = usePlaybackStore((state) => state.buffering);
  const wantAwake = enabled && (playing || buffering);
  const wantAwakeRef = useRef(wantAwake);
  wantAwakeRef.current = wantAwake;

  useEffect(() => {
    let cancelled = false;

    async function apply(): Promise<void> {
      // Native deactivate throws before removing the tag if the Activity is
      // gone; activate then skips FLAG_KEEP_SCREEN_ON. Retry until Activity exists.
      for (let attempt = 0; attempt < 6 && !cancelled; attempt += 1) {
        if (attempt > 0) {
          await wait(150 * attempt);
        }
        if (cancelled) {
          return;
        }
        await deactivateQuietly();
        if (!wantAwakeRef.current || AppState.currentState !== "active") {
          return;
        }
        try {
          await activateKeepAwakeAsync(TAG);
          return;
        } catch {
          // Activity still gone; loop.
        }
      }
    }

    void apply();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void apply();
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
      if (AppState.currentState === "active") {
        void deactivateQuietly();
      }
    };
  }, [wantAwake]);

  return null;
}
