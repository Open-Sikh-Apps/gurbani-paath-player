import { catalogueMmkv } from "@/state/mmkv";
import { assertCachedCatalogue } from "@/catalogue/parse-catalogue";
import {
  parseJsonOffThread,
  yieldToUi,
} from "@/catalogue/parse-json-off-thread";
import type { Catalogue } from "@/types/catalogue";

const PAYLOAD_KEY = "payload";
const VERSION_KEY = "version";
const FORMAT_KEY = "format";
export const CATALOGUE_CACHE_FORMAT = 1;

export async function readCachedCatalogue(): Promise<Catalogue | null> {
  const format = catalogueMmkv.getNumber(FORMAT_KEY);
  if (format !== CATALOGUE_CACHE_FORMAT) {
    return null;
  }
  const payload = catalogueMmkv.getString(PAYLOAD_KEY);
  if (!payload) {
    return null;
  }
  try {
    const parsed = await parseJsonOffThread(payload);
    await yieldToUi();
    return assertCachedCatalogue(parsed);
  } catch {
    return null;
  }
}

export function readCachedVersion(): number | null {
  const format = catalogueMmkv.getNumber(FORMAT_KEY);
  if (format !== CATALOGUE_CACHE_FORMAT) {
    return null;
  }
  const value = catalogueMmkv.getNumber(VERSION_KEY);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function writeCachedCatalogue(payload: string, version: number): void {
  catalogueMmkv.set(PAYLOAD_KEY, payload);
  catalogueMmkv.set(VERSION_KEY, version);
  catalogueMmkv.set(FORMAT_KEY, CATALOGUE_CACHE_FORMAT);
}
