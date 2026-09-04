import { useEffect, useState } from "react";
import { Modal } from "react-native";
import * as Sentry from "@sentry/react-native";
import { useTranslation } from "react-i18next";

import { isFirstLaunchOfThisBundle } from "@/crash/last-run";
import { openFeedbackMail } from "@/feedback/send";
import { useChrome } from "@/hooks/use-chrome";
import { Pressable, Text, View, cn, ui } from "@/tw";

/** Native crashes auto-send; tell the user on the next successful launch. */
export function CrashLastRunNotice() {
  const { t } = useTranslation();
  const { body, text, hit } = useChrome();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Sentry can return true after reloadAsync (same process) or a store
        // upgrade; the API does not return undefined for those.
        if (isFirstLaunchOfThisBundle()) {
          return;
        }
        const crashed = await Sentry.crashedLastRun();
        if (cancelled || crashed !== true) {
          return;
        }
        setVisible(true);
      } catch {
        // Native module missing (web / Expo Go).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => setVisible(false)}
    >
      <View className="flex-1 items-center justify-center px-6 bg-bg/80 dark:bg-bg-dark/80">
        <View className={cn("w-full gap-4 rounded-2xl border p-6", ui.border, ui.surface)}>
          <Text className={cn("text-center font-semibold", ui.text, text)}>
            {t("crash.autoSentTitle")}
          </Text>
          <Text className={cn("text-center", ui.muted, body)}>
            {t("crash.autoSentBody")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("crash.email")}
            className={cn("items-center justify-center rounded-2xl px-4", hit, ui.fillAccent)}
            onPress={() => {
              setVisible(false);
              void openFeedbackMail();
            }}
          >
            <Text className={cn("font-semibold", ui.accentFg, text)}>
              {t("crash.email")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("intro.dismiss")}
            className={cn("items-center justify-center rounded-2xl border px-4", hit, ui.border)}
            onPress={() => setVisible(false)}
          >
            <Text className={cn(ui.accent, text)}>{t("intro.dismiss")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
