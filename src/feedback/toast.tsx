import { useEffect } from "react";
import { create } from "zustand";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useChrome } from "@/hooks/use-chrome";
import { Text, View, cn, ui } from "@/tw";

const DISMISS_MS = 4000;
// Catalogue "Updating…" uses delayed clear; this gap avoids a flash when idle lands just after show.
const DELAY_CLEAR_MS = 1000;

type ToastState = {
  message: string | null;
  autoHide: boolean;
  token: number;
  show: (message: string, autoHide: boolean) => void;
  hide: () => void;
};

const useAppToastStore = create<ToastState>((set) => ({
  message: null,
  autoHide: true,
  token: 0,
  show: (message, autoHide) =>
    set((state) => ({
      message,
      autoHide,
      // Bump so showing the same copy again restarts the dismiss timer.
      token: state.token + 1,
    })),
  hide: () => set({ message: null }),
}));

export function showToast(message: string, autoHide = true): void {
  useAppToastStore.getState().show(message, autoHide);
}

/** `delay` lets catalogue "Updating…" stay up until idle so it does not flash. */
export function clearToast(delay = false): void {
  if (delay) {
    setTimeout(() => {
      useAppToastStore.getState().hide();
    }, DELAY_CLEAR_MS);
    return;
  }
  useAppToastStore.getState().hide();
}

function AppToast({ text1 }: { text1: string }) {
  const { text } = useChrome();
  return (
    <View className="w-full px-4">
      <View className={cn("rounded-2xl border px-4 py-3", ui.fillSurface, ui.border)}>
        <Text className={cn("text-center", ui.text, text)}>{text1}</Text>
      </View>
    </View>
  );
}

/** Overlay: tabs use `bottom-full` so it sits on the list; modals dock to the parent bottom. */
export function AppToastSlot({ padSafeArea = false }: { padSafeArea?: boolean }) {
  const insets = useSafeAreaInsets();
  const message = useAppToastStore((state) => state.message);
  const autoHide = useAppToastStore((state) => state.autoHide);
  const token = useAppToastStore((state) => state.token);
  const hide = useAppToastStore((state) => state.hide);

  useEffect(() => {
    if (!message || !autoHide) {
      return;
    }
    const timer = setTimeout(() => {
      hide();
    }, DISMISS_MS);
    return () => clearTimeout(timer);
  }, [autoHide, hide, message, token]);

  if (!message) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      className={cn(
        "absolute inset-x-0 z-50",
        padSafeArea ? "bottom-0" : "bottom-full",
      )}
      style={{ paddingBottom: padSafeArea ? Math.max(insets.bottom, 8) : 8 }}
    >
      <AppToast text1={message} />
    </View>
  );
}
