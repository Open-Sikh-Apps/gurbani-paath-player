import { create } from "zustand";

import mockCatalogue from "@/catalogue/mock-catalogue.json";
import {
  readCachedCatalogue,
  readCachedVersion,
  writeCachedCatalogue,
} from "@/catalogue/cache";
import { getCatalogueBaseUrl } from "@/catalogue/base-url";
import { resolveCatalogueMedia } from "@/catalogue/media-url";
import { shouldUseMockCatalogue } from "@/catalogue/mock-catalogue-flag";
import {
  fetchRemoteCatalogue,
  fetchRemoteVersion,
} from "@/catalogue/fetch-remote";
import { assertCachedCatalogue } from "@/catalogue/parse-catalogue";
import { isOnline } from "@/downloads/network";
import type { Catalogue } from "@/types/catalogue";

export type CatalogueStatus = "idle" | "refreshing" | "error";

type CatalogueStore = {
  catalogue: Catalogue;
  hydrated: boolean;
  status: CatalogueStatus;
  error: string | null;
  hydrate: () => Promise<void>;
  refresh: (signal?: AbortSignal) => Promise<void>;
};

function bundledCatalogue(): Catalogue {
  return resolveCatalogueMedia(assertCachedCatalogue(mockCatalogue));
}

// Starts on bundled JSON so the splash tree can render before MMKV/Pages hydrate.
export const useCatalogueStore = create<CatalogueStore>((set, get) => ({
  catalogue: bundledCatalogue(),
  hydrated: false,
  status: "idle",
  error: null,
  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    // Skip MMKV so a previous Pages fetch cannot replace the bundled mock.
    if (shouldUseMockCatalogue()) {
      set({ catalogue: bundledCatalogue(), hydrated: true });
      return;
    }
    const cached = await readCachedCatalogue();
    if (cached) {
      set({ catalogue: resolveCatalogueMedia(cached), hydrated: true });
      return;
    }
    // No disk cache: stay on bundled JSON and still leave the splash gate.
    set({ hydrated: true });
  },
  refresh: async (signal) => {
    // Single-flight so cold start and pull-to-refresh do not write the cache twice.
    if (get().status === "refreshing") return;
    // Mock/offline/unset Pages URL are not errors — stay on whatever hydrate loaded.
    if (shouldUseMockCatalogue()) {
      set({ status: "idle", error: null });
      return;
    }
    if (!isOnline()) {
      set({ status: "idle" });
      return;
    }
    if (!getCatalogueBaseUrl()) {
      set({ status: "idle", error: null });
      return;
    }
    set({ status: "refreshing", error: null });
    try {
      const remoteVersion = await fetchRemoteVersion(signal);
      if (remoteVersion == null) {
        // Version probe failed; keep the cached catalogue rather than treating it as a refresh error.
        set({ status: "idle" });
        return;
      }
      const cachedVersion = readCachedVersion();
      if (
        cachedVersion === remoteVersion &&
        get().catalogue.version === remoteVersion
      ) {
        // Same version on disk and in memory — skip the large catalogue.json download.
        set({ status: "idle", error: null });
        return;
      }
      const { catalogue, payload } = await fetchRemoteCatalogue(
        remoteVersion,
        signal,
      );
      // Persist the raw payload (pre-CDN rewrite) so the next cold start can hydrate offline.
      writeCachedCatalogue(payload, catalogue.version);
      set({
        catalogue: resolveCatalogueMedia(catalogue),
        status: "idle",
        error: null,
      });
      // Dynamic import: downloads imports catalogue lookups; a static import here would cycle.
      void import("@/downloads").then(({ pruneOrphans }) => pruneOrphans());
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      set({
        status: "error",
        error: message,
        // Keep last good catalogue so Home does not blank on a failed refresh.
        catalogue: get().catalogue,
      });
    }
  },
}));

export function hydrateCatalogue(): Promise<void> {
  return useCatalogueStore.getState().hydrate();
}

export function refreshCatalogue(signal?: AbortSignal): Promise<void> {
  return useCatalogueStore.getState().refresh(signal);
}
