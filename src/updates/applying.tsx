import { create } from "zustand";
import { ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";

import { useChrome } from "@/hooks/use-chrome";
import { useThemeColors } from "@/theme/use-theme-colors";
import { Text, View, cn, ui } from "@/tw";

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
}: {
  message: string;
  overlay?: boolean;
}) {
  const { body } = useChrome();
  const colors = useThemeColors();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      className={cn(
        "items-center justify-center gap-4 px-8",
        ui.page,
        overlay ? "absolute inset-0 z-60" : "flex-1",
      )}
    >
      <ActivityIndicator size="large" color={colors.accent} />
      <Text className={cn("text-center", ui.text, body)}>{message}</Text>
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
  return (
    <SplashChrome message={applying ? t("ota.applying") : t("ota.loading")} />
  );
}

/** Same spinner after first paint (Settings / busy confirm). Dies on reload. */
export function OtaApplyingOverlay() {
  const { t } = useTranslation();
  const applying = useOtaApplyingStore((state) => state.applying);
  if (!applying) {
    return null;
  }
  return <SplashChrome overlay message={t("ota.applying")} />;
}
