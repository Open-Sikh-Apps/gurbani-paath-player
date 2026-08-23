import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler, Platform } from "react-native";

type NestedState = {
  index?: number;
  routes?: { state?: NestedState }[];
};

function nestedStackCanGoBack(state: NestedState | undefined): boolean {
  if (!state || typeof state.index !== "number") {
    return false;
  }
  if (state.index > 0) {
    return true;
  }
  return nestedStackCanGoBack(state.routes?.[state.index]?.state);
}

export function useExitAppFromTabRoot(currentTabState: NestedState | undefined) {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") {
        return undefined;
      }

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (nestedStackCanGoBack(currentTabState)) {
            return false;
          }
          BackHandler.exitApp();
          return true;
        },
      );

      return () => subscription.remove();
    }, [currentTabState]),
  );
}
