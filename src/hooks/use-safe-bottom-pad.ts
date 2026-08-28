import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useSafeBottomPad(): number {
  return useSafeAreaInsets().bottom;
}
