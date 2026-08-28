const { withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Copies the status-bar silhouette into `drawable/notification_icon.png`.
 * `/android` is gitignored; prebuild would otherwise drop the media-session icon.
 */
function withAndroidNotificationIcon(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const src = path.join(
        config.modRequest.projectRoot,
        "assets",
        "notification-icon.png",
      );
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "drawable",
      );
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, path.join(destDir, "notification_icon.png"));
      return config;
    },
  ]);
}

module.exports = withAndroidNotificationIcon;
