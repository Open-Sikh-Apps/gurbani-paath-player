import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import * as Updates from "expo-updates";
import { Alert, Linking } from "react-native";

import i18n from "@/i18n";

const FEEDBACK_EMAIL = "contact@opensikhapps.com";

function versionBody(): string {
  // Downloaded OTAs only expose expoConfig via the Worker manifest extra.expoClient.
  const version =
    Constants.expoConfig?.version ?? Updates.runtimeVersion ?? "unknown";
  // OTA id so Play Store mail can tell a Worker bundle from the store binary.
  const updateId = Updates.updateId ?? "embedded";
  return i18n.t("feedback.mailBody", { version, updateId });
}

export async function openFeedbackMail(): Promise<void> {
  const subject = encodeURIComponent(i18n.t("feedback.mailSubject"));
  const body = encodeURIComponent(versionBody());
  const url = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
    return;
  }
  // No mail app (some Android SKUs). Clipboard so they can paste into Gmail later.
  await Clipboard.setStringAsync(`${FEEDBACK_EMAIL}\n${versionBody()}`);
  Alert.alert(i18n.t("settings.giveFeedback"), i18n.t("feedback.copied"));
}
