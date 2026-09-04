import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/react-native";
import { Alert } from "react-native";

import i18n from "@/i18n";
import { Pressable, Text, View, cn, ui } from "@/tw";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** JS still alive — native crashes auto-send; this path asks before Sentry. */
export class CrashErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // Native crashes already auto-send; JS is still alive so we can ask.
    Alert.alert(i18n.t("crash.title"), i18n.t("crash.body"), [
      {
        text: i18n.t("crash.dontSend"),
        style: "cancel",
      },
      {
        text: i18n.t("crash.send"),
        onPress: () => {
          Sentry.captureException(error);
        },
      },
    ]);
  }

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }
    return (
      <View className={cn("flex-1 items-center justify-center gap-4 px-6", ui.page)}>
        <Text className={cn("text-center", ui.text)}>{i18n.t("crash.title")}</Text>
        <Pressable
          accessibilityRole="button"
          className={cn("rounded-2xl border px-6 py-3", ui.border, ui.surface)}
          onPress={() => {
            // Clearing `error` remounts children without a native restart (which would lose playback).
            this.setState({ error: null });
          }}
        >
          <Text className={cn(ui.accent)}>{i18n.t("intro.dismiss")}</Text>
        </Pressable>
      </View>
    );
  }
}
