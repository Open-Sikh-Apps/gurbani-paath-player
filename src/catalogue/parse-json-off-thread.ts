import { Platform } from "react-native";
import {
  createWorkletRuntime,
  runOnRuntimeAsync,
  type WorkletRuntime,
} from "react-native-worklets";

let runtime: WorkletRuntime | null = null;

function getRuntime(): WorkletRuntime | null {
  if (Platform.OS === "web") {
    return null;
  }
  if (!runtime) {
    try {
      runtime = createWorkletRuntime("catalogue-json");
    } catch {
      runtime = null;
    }
  }
  return runtime;
}

export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

export async function parseJsonOffThread(text: string): Promise<unknown> {
  const workletRuntime = getRuntime();
  if (!workletRuntime) {
    return JSON.parse(text);
  }
  try {
    return await runOnRuntimeAsync(
      workletRuntime,
      (payload: string) => {
        "worklet";
        return JSON.parse(payload);
      },
      text,
    );
  } catch {
    return JSON.parse(text);
  }
}

