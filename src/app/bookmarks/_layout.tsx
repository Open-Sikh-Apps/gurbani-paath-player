import { Stack } from "expo-router";

import { useSafeBottomPad } from "@/hooks/use-safe-bottom-pad";
import { useThemeColors } from "@/theme/use-theme-colors";

export default function BookmarksModalLayout() {
  const bottom = useSafeBottomPad();
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        contentStyle: { paddingBottom: bottom, backgroundColor: colors.bg },
      }}
    />
  );
}
