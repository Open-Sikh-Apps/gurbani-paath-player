import * as Sentry from "@sentry/react-native";
import * as Updates from "expo-updates";

/** fetchUpdateAsync also surfaces as an unhandled native rejection; this is the handled copy. */
export async function reportOtaFetchFailure(error: unknown): Promise<void> {
  let otaLogs: unknown = [];
  try {
    otaLogs = await Updates.readLogEntriesAsync(60_000);
  } catch {
    // Keep the original fetch error even if the log API is missing on this binary.
  }
  Sentry.captureException(error, { extra: { otaLogs } });
}
