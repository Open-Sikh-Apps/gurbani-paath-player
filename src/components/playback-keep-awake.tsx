import { useEffect } from "react";
import { AppState } from "react-native";
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from "expo-keep-awake";

import { AbortError, retryUntilActivity } from "@/native/retry-until-activity";
import { usePlaybackStore } from "@/playback";
import { usePreferencesStore } from "@/state/preferences-store";

const TAG = "playback-keep-awake";

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
  // Keep the screen on through buffering so a load does not dim mid-wait.
  const wantAwake = enabled && (playing || buffering);

  useEffect(() => {
    let runAbort = new AbortController();

    function apply(): void {
      runAbort.abort();
      runAbort = new AbortController();
      if (!wantAwake) {
        void deactivateQuietly();
        return;
      }
      const { signal } = runAbort;
      // Native deactivate throws before removing the tag if the Activity is
      // gone; activate then skips FLAG_KEEP_SCREEN_ON. Retry until Activity exists.
      void retryUntilActivity(async () => {
        await deactivateQuietly();
        if (!wantAwake || AppState.currentState !== "active") {
          throw new AbortError("keep-awake not needed");
        }
        await activateKeepAwakeAsync(TAG);
      }, signal).catch(() => {
        // Aborted, or Activity never came back.
      });
    }

    apply();
    // Android activity recreate drops FLAG_KEEP_SCREEN_ON; re-apply when we become active.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        apply();
      }
    });
    return () => {
      runAbort.abort();
      sub.remove();
      if (AppState.currentState === "active") {
        void deactivateQuietly();
      }
    };
  }, [wantAwake]);

  return null;
}
