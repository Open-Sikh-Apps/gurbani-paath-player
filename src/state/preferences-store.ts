import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  FALLBACK_LOCALE,
  deviceLocale,
  isLocalePreference,
} from "@/i18n/locales";
import { mmkvStateStorage } from "@/state/mmkv";
import type { ThemePreference } from "@/theme/apply-theme";
import {
  DEFAULT_REMOTE_PRIMARY,
  type RemotePrimary,
} from "@/playback/types";

export type { ThemePreference, RemotePrimary };

type PreferencesState = {
  hasCompletedWizard: boolean;
  hasSeenIntroFeedback: boolean;
  locale: string;
  simpleMode: boolean;
  theme: ThemePreference;
  keepScreenOnWhilePlaying: boolean;
  wifiOnlyDownloads: boolean;
  remotePrimary: RemotePrimary;
  setLocale: (locale: string) => void;
  setSimpleMode: (simpleMode: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  setKeepScreenOnWhilePlaying: (keepScreenOnWhilePlaying: boolean) => void;
  setWifiOnlyDownloads: (wifiOnlyDownloads: boolean) => void;
  setRemotePrimary: (remotePrimary: RemotePrimary) => void;
  completeWizard: (values: { locale: string; simpleMode: boolean }) => void;
  markIntroFeedbackSeen: () => void;
};

function sanitizeLocale(locale: string): string {
  return isLocalePreference(locale) ? locale : FALLBACK_LOCALE;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      hasCompletedWizard: false,
      hasSeenIntroFeedback: false,
      // Persist has not hydrated yet; device locale avoids an English flash if anything reads the store early.
      locale: deviceLocale(),
      simpleMode: false,
      theme: "system",
      keepScreenOnWhilePlaying: false,
      // Large paath files; default off-cellular so a first-run download cannot surprise a data cap.
      wifiOnlyDownloads: true,
      remotePrimary: DEFAULT_REMOTE_PRIMARY,
      setLocale: (locale) => set({ locale: sanitizeLocale(locale) }),
      setSimpleMode: (simpleMode) => set({ simpleMode }),
      setTheme: (theme) => set({ theme }),
      setKeepScreenOnWhilePlaying: (keepScreenOnWhilePlaying) =>
        set({ keepScreenOnWhilePlaying }),
      setWifiOnlyDownloads: (wifiOnlyDownloads) => set({ wifiOnlyDownloads }),
      setRemotePrimary: (remotePrimary) =>
        set({
          // Unknown/legacy values become seek so lock-screen buttons never store an invalid pair.
          remotePrimary: remotePrimary === "skip" ? "skip" : "seek",
        }),
      completeWizard: ({ locale, simpleMode }) =>
        set({
          // One write so the wizard cannot be marked complete without the chosen locale/simpleMode.
          hasCompletedWizard: true,
          locale: sanitizeLocale(locale),
          simpleMode,
        }),
      markIntroFeedbackSeen: () => set({ hasSeenIntroFeedback: true }),
    }),
    {
      name: "preferences",
      storage: createJSONStorage(() => mmkvStateStorage),
      partialize: (state) => ({
        hasCompletedWizard: state.hasCompletedWizard,
        // Missing key in older MMKV must not become true and hide the intro prompt.
        hasSeenIntroFeedback: state.hasSeenIntroFeedback === true,
        locale: state.locale,
        simpleMode: state.simpleMode,
        theme: state.theme,
        keepScreenOnWhilePlaying: state.keepScreenOnWhilePlaying,
        // Missing key in older MMKV must stay wifi-only (the original default).
        wifiOnlyDownloads: state.wifiOnlyDownloads !== false,
        remotePrimary: state.remotePrimary === "skip" ? "skip" : "seek",
      }),
    },
  ),
);
