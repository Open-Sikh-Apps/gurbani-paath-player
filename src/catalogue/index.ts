import { useCatalogueStore } from "@/catalogue/store";
import type { Catalogue } from "@/types/catalogue";

export type {
  AudiobookCollection,
  Author,
  Catalogue,
  Collection,
  CollectionKind,
  L10nText,
  L10nUrl,
  RadioTrack,
  RadioCollection,
  Reciter,
  SehajPaathTrack,
  AudiobookTrack,
  ResourceItem,
  ResourceSection,
  Scripture,
  SehajPaathCollection,
  Track,
} from "@/types/catalogue";
export { CatalogueParseError } from "@/catalogue/parse-catalogue";
export { resolveL10n } from "@/catalogue/resolve-l10n";
export { getCatalogueBaseUrl } from "@/catalogue/base-url";
export {
  hydrateCatalogue,
  refreshCatalogue,
  useCatalogueStore,
} from "@/catalogue/store";
export {
  getAuthorById,
  getCollectionById,
  getReciterById,
  getResourceSectionById,
  getScriptureById,
  getSehajPaathCollections,
} from "@/catalogue/lookups";

export const REMOTE_IMAGE_HEADERS = {
  "User-Agent": "GurbaniPaathPlayerOffline/1.0 (cingh.jasdeep@gmail.com)",
};

export function loadCatalogue(): Catalogue {
  return useCatalogueStore.getState().catalogue;
}
