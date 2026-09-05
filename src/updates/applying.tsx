import { create } from "zustand";
import { ActivityIndicator, Appearance } from "react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useChrome } from "@/hooks/use-chrome";
import { SPLASH_IMAGE_WIDTH } from "@/splash/constants";
import {
  colorsFor,
  type ColorSchemeName,
} from "@/theme/colors";
import { useIsDark } from "@/theme/use-theme-colors";
import { Image, Text, View, cn } from "@/tw";

const splashLight = require("../../assets/icon-light.png");
const splashDark = require("../../assets/icon-dark.png");

type ApplyingState = {
  applying: boolean;
  setApplying: (applying: boolean) => void;
};

/** Lives outside the splash so Settings / busy-confirm can show the same spinner. */
export const useOtaApplyingStore = create<ApplyingState>((set) => ({
  applying: false,
  setApplying: (applying) => set({ applying }),
}));

function SplashChrome({
  message,
  overlay,
  scheme,
}: {
  message: string;
  overlay?: boolean;
  scheme: ColorSchemeName;
}) {
  const { body } = useChrome();
  const splash = colorsFor(scheme);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      className={overlay ? "absolute inset-0 z-60" : "flex-1"}
      style={{ backgroundColor: splash.bg }}
    >
      {/* Native splash centers this image; keep it pinned so the loader cannot shift it. */}
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
      >
        <Image
          source={scheme === "dark" ? splashDark : splashLight}
          accessible={false}
          accessibilityIgnoresInvertColors
          contentFit="contain"
          style={{ width: SPLASH_IMAGE_WIDTH, height: SPLASH_IMAGE_WIDTH }}
        />
      </View>
      <View
        className="absolute inset-x-0 items-center gap-4 px-8"
        style={{
          top: "50%",
          marginTop: SPLASH_IMAGE_WIDTH / 2 + 16,
        }}
      >
        <ActivityIndicator size="large" color={splash.accent} />
        <Text className={cn("text-center", body)} style={{ color: splash.text }}>
          {message}
        </Text>
      </View>
    </View>
  );
}

/**
 * Replaces the native splash once JS can paint. `reloadAsync` still tears this
 * down — it only covers hydrate / check, not the native blank after reload.
 */
export function JsSplash() {
  const { t } = useTranslation();
  const applying = useOtaApplyingStore((state) => state.applying);
  // Native splash follows OS appearance; freeze that so a Settings theme cannot swap the logo mid-gate.
  const [handoffScheme] = useState<ColorSchemeName>(() =>
    Appearance.getColorScheme() === "dark" ? "dark" : "light",
  );
  return (
    <SplashChrome
      scheme={handoffScheme}
      message={applying ? t("ota.applying") : t("ota.loading")}
    />
  );
}

/** Same chrome after first paint (Settings / busy confirm). Dies on reload. */
export function OtaApplyingOverlay() {
  const { t } = useTranslation();
  const applying = useOtaApplyingStore((state) => state.applying);
  const isDark = useIsDark();
  if (!applying) {
    return null;
  }
  return (
    <SplashChrome
      overlay
      scheme={isDark ? "dark" : "light"}
      message={t("ota.applying")}
    />
  );
}
