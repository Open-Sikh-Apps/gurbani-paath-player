import { ExpoConfig, ConfigContext } from "expo/config";
// Expo loads this as CJS; tsx lets it import TypeScript modules.
import "tsx/cjs";

export default ({ config }: ConfigContext): ExpoConfig => ({
  // Spread app.json so EAS/plugins can mutate the object; this file only fills name/slug fallbacks.
  ...config,
  name: process.env.APP_VARIANT === "development" ? "Gurbani audio player (dev)" : config.name ?? "Gurbani audio player",
  slug: config.slug ?? "gurbani-audio-player",
  scheme: process.env.APP_VARIANT === "development" ? "gurbaniaudioplayer-dev" : config.scheme ?? "gurbaniaudioplayer",
  android: {
    ...config.android,
    package: process.env.APP_VARIANT === "development" ? "com.opensikhapps.gurbaniaudioplayer.dev" : config.android?.package ?? "com.opensikhapps.gurbaniaudioplayer",
    googleServicesFile: process.env.APP_VARIANT === "development" ? "./google-services-dev.json" : config.android?.googleServicesFile ?? "./google-services.json",
  },
  ios: {
    ...config.ios,
    bundleIdentifier: process.env.APP_VARIANT === "development" ? "com.opensikhapps.gurbaniaudioplayer.dev" : config.ios?.bundleIdentifier ?? "com.opensikhapps.gurbaniaudioplayer",
    googleServicesFile: process.env.APP_VARIANT === "development" ? "./GoogleService-Info-dev.plist" : config.ios?.googleServicesFile ?? "./GoogleService-Info.plist",
    "associatedDomains": process.env.APP_VARIANT === "development" ? ["applinks:gurbaniaudioplayer.opensikhapps.com.dev"] : config.ios?.associatedDomains ?? [
      "applinks:gurbaniaudioplayer.opensikhapps.com"
    ],
  }
});
