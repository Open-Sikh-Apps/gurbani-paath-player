import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import debounce from "lodash/debounce";
import { create } from "zustand";

type NetworkState = {
  online: boolean;
  cellular: boolean;
};

export const OFFLINE_DEBOUNCE_MS = 3000;

function fromNetInfo(state: NetInfoState): NetworkState {
  // First sample often has `isInternetReachable: null`. Treat that as online so the banner does not flash.
  const online =
    state.isConnected !== false && state.isInternetReachable !== false;
  const cellular = state.type === "cellular";
  return { online, cellular };
}

export const useNetworkStore = create<NetworkState>(() => ({
  // Optimistic until `waitForNetworkSnapshot`; a cold start must not look offline.
  online: true,
  cellular: false,
}));

let started = false;
let firstSnapshot: Promise<void> | null = null;

// Blips under 3s should not pause a stream; online applies immediately.
const commitOffline = debounce(() => {
  useNetworkStore.setState({ online: false });
}, OFFLINE_DEBOUNCE_MS);

function applyNetInfo(state: NetInfoState): void {
  const next = fromNetInfo(state);
  useNetworkStore.setState({ cellular: next.cellular });
  if (next.online) {
    commitOffline.cancel();
    useNetworkStore.setState({ online: true });
    return;
  }
  commitOffline();
}

export function initNetwork(): void {
  if (started) {
    return;
  }
  started = true;
  firstSnapshot = NetInfo.fetch().then((state) => {
    applyNetInfo(state);
  });
  NetInfo.addEventListener((state) => {
    applyNetInfo(state);
  });
}

/** Resolves after the first NetInfo sample. `isOnline()` is optimistic true until then. */
export function waitForNetworkSnapshot(): Promise<void> {
  initNetwork();
  return firstSnapshot ?? Promise.resolve();
}

export function isOnline(): boolean {
  return useNetworkStore.getState().online;
}

export function isCellular(): boolean {
  return useNetworkStore.getState().cellular;
}

export function useIsOnline(): boolean {
  return useNetworkStore((state) => state.online);
}

export function subscribeNetwork(
  listener: (online: boolean) => void,
): () => void {
  return useNetworkStore.subscribe((state, prev) => {
    if (state.online !== prev.online) {
      listener(state.online);
    }
  });
}
