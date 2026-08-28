import { usePreferencesStore } from "@/state/preferences-store";

export function useSimpleMode() {
  return usePreferencesStore((state) => state.simpleMode);
}

export function useChrome() {
  const simpleMode = useSimpleMode();
  return {
    simpleMode,
    hit: simpleMode ? "min-h-14" : "min-h-12",
    text: simpleMode ? "text-lg" : "text-base",
    title: simpleMode ? "text-2xl font-semibold" : "text-xl font-semibold",
    body: simpleMode ? "text-lg" : "text-base",
    tabIcon: simpleMode ? 28 : 22,
    playerIcon: simpleMode ? 36 : 28,
    playerPlayIcon: simpleMode ? 64 : 52,
    scrubberTrack: simpleMode ? "h-4" : "h-1.5",
    scrubberThumb: simpleMode ? 28 : 16,
  } as const;
}
