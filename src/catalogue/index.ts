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
export { getMediaBaseUrl } from "@/catalogue/media-base-url";
export { shouldUseMockCatalogue } from "@/catalogue/mock-catalogue-flag";
export { resolveCatalogueMedia, resolveMediaUrl } from "@/catalogue/media-url";
export {
  hydrateCatalogue,
  refreshCatalogue,
  useCatalogueStore,
} from "@/catalogue/store";
export {
  catalogueAllTrackIds,
  getAuthorById,
  getCollectionById,
  getReciterById,
  getResourceSectionById,
  getResourcesForSection,
  getScriptureById,
  getSehajPaathCollections,
  getTrackInCollection,
  sehajPaathGroupsByScripture,
} from "@/catalogue/lookups";

// Some CDNs 403 Expo's default image User-Agent; this identifies the app and a contact.
export const REMOTE_IMAGE_HEADERS = {
  "User-Agent": "GurbaniAudioPlayer/1.0 (cingh.jasdeep@gmail.com)",
};

/** Snapshot without a hook so playback can read IDs off the render cycle. */
export function loadCatalogue(): Catalogue {
  return useCatalogueStore.getState().catalogue;
}
