import {
  resolveLocalePreference,
} from "@/i18n/locales";
import { usePreferencesStore } from "@/state/preferences-store";

export function useResolvedLocale(): string {
  const preference = usePreferencesStore((state) => state.locale);

  return resolveLocalePreference(preference);
}
