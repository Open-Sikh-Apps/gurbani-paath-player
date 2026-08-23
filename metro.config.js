const { writePaletteCss } = require("./scripts/write-palette-css.cjs");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

writePaletteCss();

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  // inline variables break PlatformColor in CSS variables
  inlineVariables: false,
  // We add className support manually via @/tw
  globalClassNamePolyfill: false,
});
