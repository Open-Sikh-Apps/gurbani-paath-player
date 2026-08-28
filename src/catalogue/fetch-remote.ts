import axios from "axios";
import * as v from "valibot";
import { getCatalogueBaseUrl } from "@/catalogue/base-url";
import { assertCachedCatalogue } from "@/catalogue/parse-catalogue";
import {
  parseJsonOffThread,
  yieldToUi,
} from "@/catalogue/parse-json-off-thread";
import type { Catalogue } from "@/types/catalogue";
import { finiteNumber } from "@/catalogue/schema";

const FETCH_TIMEOUT_MS = 15_000;

export class CatalogueFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogueFetchError";
  }
}

export type RemoteCatalogue = {
  catalogue: Catalogue;
  payload: string;
};

const api = axios.create({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    Accept: "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
  },
});

const versionSchema = v.object({
  version: finiteNumber,
});

function toFetchError(error: unknown): CatalogueFetchError {
  if (error instanceof CatalogueFetchError) {
    return error;
  }
  if (axios.isAxiosError(error)) {
    return new CatalogueFetchError(error.message);
  }
  return new CatalogueFetchError(
    error instanceof Error ? error.message : String(error),
  );
}

export async function fetchRemoteVersion(
  signal?: AbortSignal,
): Promise<number | null> {
  const base = getCatalogueBaseUrl();
  if (!base) {
    return null;
  }

  try {
    const response = await api.get<unknown>(`${base}/catalogue.version.json`, {
      signal,
    });
    return v.parse(versionSchema, response.data).version;
  } catch (error) {
    throw toFetchError(error);
  }
}

export async function fetchRemoteCatalogue(
  remoteVersion: number,
  signal?: AbortSignal,
): Promise<RemoteCatalogue> {
  const base = getCatalogueBaseUrl();
  if (!base) {
    throw new CatalogueFetchError("Catalogue base URL is not set");
  }

  try {
    const response = await api.get<string>(
      `${base}/catalogue.json?v=${remoteVersion}`,
      {
        signal,
        responseType: "text",
      },
    );
    const payload = response.data;
    const json = await parseJsonOffThread(payload);
    await yieldToUi();
    return { catalogue: assertCachedCatalogue(json), payload };
  } catch (error) {
    throw toFetchError(error);
  }
}