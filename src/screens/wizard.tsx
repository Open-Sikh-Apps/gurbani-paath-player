import { useTranslation } from "react-i18next";
import { useState } from "react";

import { useChrome } from "@/hooks/use-chrome";
import { UI_LOCALES } from "@/i18n/locales";
import { usePreferencesStore } from "@/state/preferences-store";
import { Pressable, ScrollView, Text, View, cn, ui } from "@/tw";
import { useResolvedLocale } from "@/hooks/use-resolved-locale";

export function WizardScreen() {
  const { t } = useTranslation();
  const { hit, text, title, body, simpleMode } = useChrome();
  const locale = useResolvedLocale();
  const setLocale = usePreferencesStore((state) => state.setLocale);
  const setSimpleMode = usePreferencesStore((state) => state.setSimpleMode);
  const completeWizard = usePreferencesStore((state) => state.completeWizard);
  const [step, setStep] = useState<0 | 1>(0);

  return (
    <ScrollView
      className={cn("flex-1", ui.page)}
      contentContainerClassName="flex-grow px-6 py-8"
    >
      {step === 0 ? (
        <View className="flex-1 justify-center gap-6">
          <View className="gap-2">
            <Text className={cn(ui.text, title)}>
              {t("wizard.languageTitle")}
            </Text>
            <Text className={cn(ui.muted, body)}>
              {t("wizard.languageSubtitle")}
            </Text>
          </View>
          <View className="gap-3">
            {UI_LOCALES.map((item) => {
              const selected = item.code === locale;
              return (
                <Pressable
                  key={item.code}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={cn(
                    "items-center justify-center rounded-2xl border px-4",
                    hit,
                    selected ? ui.selected : ui.unselected,
                  )}
                  onPress={() => setLocale(item.code)}
                >
                  <Text
                    className={cn(
                      "font-semibold",
                      text,
                      selected ? ui.accentFg : ui.text,
                    )}
                  >
                    {item.nativeName}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            className={cn(
              "items-center justify-center rounded-2xl px-4",
              hit,
              ui.fillAccent,
            )}
            onPress={() => setStep(1)}
          >
            <Text className={cn("font-semibold", ui.accentFg, text)}>
              {t("wizard.continue")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1 justify-center gap-6">
          <View className="gap-2">
            <Text className={cn(ui.text, title)}>
              {t("wizard.simpleModeTitle")}
            </Text>
            <Text className={cn(ui.muted, body)}>
              {t("wizard.simpleModeBody")}
            </Text>
          </View>
          <View className="gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !simpleMode }}
              className={cn(
                "items-center justify-center rounded-2xl border px-4",
                hit,
                !simpleMode ? ui.selected : ui.unselected,
              )}
              onPress={() => setSimpleMode(false)}
            >
              <Text
                className={cn(
                  "font-semibold",
                  text,
                  !simpleMode ? ui.accentFg : ui.text,
                )}
              >
                {t("wizard.simpleModeOff")}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: simpleMode }}
              className={cn(
                "items-center justify-center rounded-2xl border px-4",
                hit,
                simpleMode ? ui.selected : ui.unselected,
              )}
              onPress={() => setSimpleMode(true)}
            >
              <Text
                className={cn(
                  "font-semibold",
                  text,
                  simpleMode ? ui.accentFg : ui.text,
                )}
              >
                {t("wizard.simpleModeOn")}
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            className={cn(
              "items-center justify-center rounded-2xl px-4",
              hit,
              ui.fillAccent,
            )}
            onPress={() => completeWizard({ locale, simpleMode })}
          >
            <Text className={cn("font-semibold", ui.accentFg, text)}>
              {t("wizard.done")}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
