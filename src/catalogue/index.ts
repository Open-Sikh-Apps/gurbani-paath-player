import mockCatalogue from "@/catalogue/mock-catalogue.json";
import { parseCatalogue } from "@/catalogue/parse-catalogue";
import type {
  Author,
  Catalogue,
  Collection,
  Reciter,
  ResourceSection,
  Scripture,
  SehajPaathCollection,
} from "@/types/catalogue";

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

export async function loadCatalogue(): Promise<Catalogue> {
  return parseCatalogue(mockCatalogue);
}

export function getSehajPaathCollections(
  catalogue: Catalogue,
): SehajPaathCollection[] {
  return catalogue.collections.filter(
    (collection): collection is SehajPaathCollection =>
      collection.kind === "sehaj_paath",
  );
}

export function getCollectionById(
  catalogue: Catalogue,
  id: string,
): Collection | undefined {
  return catalogue.collections.find((collection) => collection.id === id);
}

export function getAuthorById(
  catalogue: Catalogue,
  id: string,
): Author | undefined {
  return catalogue.authors.find((author) => author.id === id);
}

export function getReciterById(
  catalogue: Catalogue,
  id: string,
): Reciter | undefined {
  return catalogue.reciters.find((reciter) => reciter.id === id);
}

export function getScriptureById(
  catalogue: Catalogue,
  id: string,
): Scripture | undefined {
  return catalogue.scriptures.find((scripture) => scripture.id === id);
}

export function getResourceSectionById(
  catalogue: Catalogue,
  id: string,
): ResourceSection | undefined {
  return catalogue.resourceSections.find((section) => section.id === id);
}
