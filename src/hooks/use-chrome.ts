import { usePreferencesStore } from "@/state/preferences-store";

export function useSimpleMode() {
  return usePreferencesStore((state) => state.simpleMode);
}

export function useChrome() {
  const simpleMode = useSimpleMode();
  // Hit/text are NativeWind; icon sizes are dp because vector icons ignore className. Simple-mode hit is 64 so rows stay ≥48.
  return {
    simpleMode,
    hit: simpleMode ? "min-h-16" : "min-h-14",
    text: simpleMode ? "text-xl" : "text-lg",
    title: simpleMode ? "text-3xl font-semibold" : "text-2xl font-semibold",
    subtitle: simpleMode ? "text-2xl" : "text-xl",
    body: simpleMode ? "text-xl" : "text-lg",
    bodySmall: simpleMode ? "text-lg" : "text-base",
    // nowPlayingActionText: simpleMode ? "text-base" : "text-xs",
    nowPlayingActionText: simpleMode ? "text-xs font-semibold" : "text-xs",
    tabIcon: simpleMode ? 32 : 26,
    playerIcon: simpleMode ? 40 : 32,
    playerPlayIcon: simpleMode ? 68 : 56,
    scrubberTrack: simpleMode ? "h-4" : "h-1.5",
    scrubberThumb: simpleMode ? 28 : 16,
  } as const;
}
