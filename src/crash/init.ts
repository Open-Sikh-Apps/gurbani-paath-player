import * as Sentry from "@sentry/react-native";

import { rememberLaunchBundle } from "@/crash/last-run";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

try {
  Sentry.init({
    // Empty string is still a DSN to the SDK; omit it until EXPO_PUBLIC_SENTRY_DSN is set.
    dsn: dsn || undefined,
    // Dev client already shows the error overlay; skip noise and accidental sends.
    enabled: Boolean(dsn) && !__DEV__,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableLogs: false,
    beforeSend(event) {
      // applyUpdate already captureException's the same native reject as handled.
      const unhandledFetch = event.exception?.values?.some(
        (value) =>
          value.mechanism?.type === "onunhandledrejection" &&
          value.value?.includes("ExpoUpdates.fetchUpdateAsync"),
      );
      if (unhandledFetch) {
        return null;
      }
      return event;
    },
  });
} catch {
  // Native module missing until the next prebuild.
}

rememberLaunchBundle();
