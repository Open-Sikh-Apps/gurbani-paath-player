import { create } from "zustand";

import mockCatalogue from "@/catalogue/mock-catalogue.json";
import {
  readCachedCatalogue,
  readCachedVersion,
  writeCachedCatalogue,
} from "@/catalogue/cache";
import { getCatalogueBaseUrl } from "@/catalogue/base-url";
import {
  fetchRemoteCatalogue,
  fetchRemoteVersion,
} from "@/catalogue/fetch-remote";
import { assertCachedCatalogue } from "@/catalogue/parse-catalogue";
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
  return assertCachedCatalogue(mockCatalogue);
}

export const useCatalogueStore = create<CatalogueStore>((set, get) => ({
  catalogue: bundledCatalogue(),
  hydrated: false,
  status: "idle",
  error: null,
  hydrate: async () => {
    if (get().hydrated) {
      return;
    }
    const cached = await readCachedCatalogue();
    if (cached) {
      set({ catalogue: cached, hydrated: true });
      return;
    }
    set({ hydrated: true });
  },
  refresh: async (signal) => {
    if (get().status === "refreshing") return;
    if (!getCatalogueBaseUrl()) {
      set({ status: "idle", error: null });
      return;
    }
    set({ status: "refreshing", error: null });
    try {
      const remoteVersion = await fetchRemoteVersion(signal);
      if (remoteVersion == null) {
        set({ status: "idle" });
        return;
      }
      const cachedVersion = readCachedVersion();
      if (
        cachedVersion === remoteVersion &&
        get().catalogue.version === remoteVersion
      ) {
        set({ status: "idle", error: null });
        return;
      }
      const { catalogue, payload } = await fetchRemoteCatalogue(
        remoteVersion,
        signal,
      );
      writeCachedCatalogue(payload, catalogue.version);
      set({ catalogue, status: "idle", error: null });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      set({
        status: "error",
        error: message,
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
