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
  locale: string;
  simpleMode: boolean;
  theme: ThemePreference;
  keepScreenOnWhilePlaying: boolean;
  remotePrimary: RemotePrimary;
  setLocale: (locale: string) => void;
  setSimpleMode: (simpleMode: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  setKeepScreenOnWhilePlaying: (keepScreenOnWhilePlaying: boolean) => void;
  setRemotePrimary: (remotePrimary: RemotePrimary) => void;
  completeWizard: (values: { locale: string; simpleMode: boolean }) => void;
};

function sanitizeLocale(locale: string): string {
  return isLocalePreference(locale) ? locale : FALLBACK_LOCALE;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      hasCompletedWizard: false,
      locale: deviceLocale(),
      simpleMode: false,
      theme: "system",
      keepScreenOnWhilePlaying: false,
      remotePrimary: DEFAULT_REMOTE_PRIMARY,
      setLocale: (locale) => set({ locale: sanitizeLocale(locale) }),
      setSimpleMode: (simpleMode) => set({ simpleMode }),
      setTheme: (theme) => set({ theme }),
      setKeepScreenOnWhilePlaying: (keepScreenOnWhilePlaying) =>
        set({ keepScreenOnWhilePlaying }),
      setRemotePrimary: (remotePrimary) =>
        set({
          remotePrimary: remotePrimary === "skip" ? "skip" : "seek",
        }),
      completeWizard: ({ locale, simpleMode }) =>
        set({
          hasCompletedWizard: true,
          locale: sanitizeLocale(locale),
          simpleMode,
        }),
    }),
    {
      name: "preferences",
      storage: createJSONStorage(() => mmkvStateStorage),
      partialize: (state) => ({
        hasCompletedWizard: state.hasCompletedWizard,
        locale: state.locale,
        simpleMode: state.simpleMode,
        theme: state.theme,
        keepScreenOnWhilePlaying: state.keepScreenOnWhilePlaying,
        remotePrimary: state.remotePrimary === "skip" ? "skip" : "seek",
      }),
    },
  ),
);
