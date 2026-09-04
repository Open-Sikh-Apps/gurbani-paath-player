import type { ComponentProps } from "react";
import { Stack } from "expo-router";

import { useIsOnline } from "@/downloads";

type StackOptions = NonNullable<ComponentProps<typeof Stack>["screenOptions"]>;

/**
 * Nested stacks wrap SafeAreaProviderCompat, and on Android 15
 * `statusBarTranslucent` / `topInsetEnabled` no longer change the native header.
 * Expo's newer `unstable_headerInsets` is not in SDK 57's expo-router, so this
 * uses `disableTopInsetApplication`. `statusBarTranslucent: false` still drives
 * iOS `headerTopInsetEnabled` so the banner can own the status-bar inset.
 */
export function useOfflineStackOptions(): StackOptions {
  const online = useIsOnline();
  if (online) {
    return {};
  }
  return {
    statusBarTranslucent: false,
    navigationBarTranslucent: false,
    unstable_nativeProps: {
      headerConfig: {
        disableTopInsetApplication: true,
      },
    },
  } as StackOptions;
}
