import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  FALLBACK_LOCALE,
  deviceLocale,
  isLocalePreference,
} from "@/i18n/locales";
import { mmkvStateStorage } from "@/state/mmkv";
import type { ThemePreference } from "@/theme/apply-theme";

export type { ThemePreference };

type PreferencesState = {
  hasCompletedWizard: boolean;
  locale: string;
  simpleMode: boolean;
  theme: ThemePreference;
  setLocale: (locale: string) => void;
  setSimpleMode: (simpleMode: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
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
      setLocale: (locale) => set({ locale: sanitizeLocale(locale) }),
      setSimpleMode: (simpleMode) => set({ simpleMode }),
      setTheme: (theme) => set({ theme }),
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
      }),
    },
  ),
);
