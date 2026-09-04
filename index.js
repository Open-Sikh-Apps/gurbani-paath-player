// Headless JS after process death has no React tree — register this before Expo Router.
try {
  if (process.env.EXPO_OS !== "web") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notifee = require("react-native-notify-kit").default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { EventType } = require("react-native-notify-kit");
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type !== EventType.PRESS) {
        return;
      }
      const albumId = detail?.notification?.data?.albumId;
      if (typeof albumId !== "string" || albumId.length === 0) {
        return;
      }
      // Keep in sync with PENDING_ALBUM_* in src/downloads/notify.ts
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createMMKV } = require("react-native-mmkv");
      createMMKV({ id: "notification-open" }).set("albumId", albumId);
    });
  }
} catch {
  // Native module is absent on web and in some Expo Go loads.
}

// Keep native splash until RootLayout paints JsSplash, then hideAsync there.
try {
  if (process.env.EXPO_OS !== "web") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("expo-splash-screen").preventAutoHideAsync();
  }
} catch {
  // Config plugin is not in this binary yet, or the module is missing on web.
}

try {
  if (process.env.EXPO_OS !== "web") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("./src/crash/init");
  }
} catch {
  // Native Sentry is not in this binary yet (Metro / web).
}

import "expo-router/entry";
