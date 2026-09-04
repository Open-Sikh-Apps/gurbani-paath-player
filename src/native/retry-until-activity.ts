import pRetryImport, { AbortError } from "p-retry";

export { AbortError };

// Metro may surface p-retry as CJS `{ default }`; Hermes then throws "pRetry is not a function".
const pRetry =
  typeof pRetryImport === "function"
    ? pRetryImport
    : (pRetryImport as unknown as { default: typeof pRetryImport }).default;

const ACTIVITY_RETRY = {
  retries: 5,
  minTimeout: 150,
  factor: 2,
} as const;

if (
  typeof AbortSignal !== "undefined" &&
  typeof AbortSignal.prototype.throwIfAborted !== "function"
) {
  // p-retry v8 calls signal.throwIfAborted(); Hermes may not implement it.
  AbortSignal.prototype.throwIfAborted = function throwIfAborted() {
    if (this.aborted) {
      throw this.reason !== undefined
        ? this.reason
        : new Error("This operation was aborted");
    }
  };
}

/** Retry native calls that fail because Activity is gone after a recents swipe. */
export function retryUntilActivity<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  return pRetry(async () => {
    if (signal?.aborted) {
      throw new AbortError("aborted");
    }
    try {
      return await fn();
    } catch (error) {
      if (error instanceof AbortError) {
        throw error;
      }
      // p-retry never retries TypeError; native Activity-gone failures can be that.
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }, { ...ACTIVITY_RETRY, signal });
}
