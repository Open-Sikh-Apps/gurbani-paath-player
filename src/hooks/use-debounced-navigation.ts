import { router, type Href } from "expo-router";
import { useDebouncedCallback } from "use-debounce";

export const DEBOUNCE_NAVIGATION_DELAY = 500;

export function useDebouncedNavigation() {
  const navigate = useDebouncedCallback(
    (href: string) => {
      router.navigate(href as Href);
    },
    DEBOUNCE_NAVIGATION_DELAY,
    { leading: true, trailing: false },
  );
  return { navigate };
}
