import type {
  Author,
  Catalogue,
  Collection,
  Reciter,
  ResourceItem,
  ResourceSection,
  Scripture,
  SehajPaathCollection,
  Track,
} from "@/types/catalogue";

type CatalogueIndex = {
  collections: Map<string, Collection>;
  authors: Map<string, Author>;
  reciters: Map<string, Reciter>;
  scriptures: Map<string, Scripture>;
  resourceSections: Map<string, ResourceSection>;
  tracksByCollectionId: Map<string, Map<string, Track>>;
  resourcesBySectionId: Map<string, ResourceItem[]>;
  sehajPaath: SehajPaathCollection[];
  allTrackIds: Set<string>;
};

// One index per catalogue object identity — hydrate/refresh replace the object.
const indexes = new WeakMap<Catalogue, CatalogueIndex>();

function indexOf(catalogue: Catalogue): CatalogueIndex {
  const cached = indexes.get(catalogue);
  if (cached) {
    return cached;
  }
  const collections = new Map<string, Collection>();
  const tracksByCollectionId = new Map<string, Map<string, Track>>();
  const allTrackIds = new Set<string>();
  const sehajPaath: SehajPaathCollection[] = [];
  for (const collection of catalogue.collections) {
    collections.set(collection.id, collection);
    const tracks = new Map<string, Track>();
    for (const track of collection.tracks) {
      tracks.set(track.id, track);
      allTrackIds.add(track.id);
    }
    tracksByCollectionId.set(collection.id, tracks);
    if (collection.kind === "sehaj_paath") {
      sehajPaath.push(collection);
    }
  }
  const resourcesBySectionId = new Map<string, ResourceItem[]>();
  for (const resource of catalogue.resources) {
    const list = resourcesBySectionId.get(resource.sectionId) ?? [];
    list.push(resource);
    resourcesBySectionId.set(resource.sectionId, list);
  }
  const built: CatalogueIndex = {
    collections,
    authors: new Map(catalogue.authors.map((item) => [item.id, item])),
    reciters: new Map(catalogue.reciters.map((item) => [item.id, item])),
    scriptures: new Map(catalogue.scriptures.map((item) => [item.id, item])),
    resourceSections: new Map(
      catalogue.resourceSections.map((item) => [item.id, item]),
    ),
    tracksByCollectionId,
    resourcesBySectionId,
    sehajPaath,
    allTrackIds,
  };
  indexes.set(catalogue, built);
  return built;
}

export function getSehajPaathCollections(
  catalogue: Catalogue,
): SehajPaathCollection[] {
  return indexOf(catalogue).sehajPaath;
}

export function sehajPaathGroupsByScripture(catalogue: Catalogue): {
  scripture: Scripture;
  collections: SehajPaathCollection[];
}[] {
  const albums = getSehajPaathCollections(catalogue);
  const byScripture = new Map<string, SehajPaathCollection[]>();
  for (const album of albums) {
    const list = byScripture.get(album.scriptureId) ?? [];
    list.push(album);
    byScripture.set(album.scriptureId, list);
  }
  // Walk scriptures in catalogue order and drop empty groups so Home matches editorial sequence.
  return catalogue.scriptures.flatMap((scripture) => {
    const collections = byScripture.get(scripture.id);
    return collections?.length ? [{ scripture, collections }] : [];
  });
}

export function getCollectionById(
  catalogue: Catalogue,
  id: string,
): Collection | undefined {
  return indexOf(catalogue).collections.get(id);
}

export function getAuthorById(
  catalogue: Catalogue,
  id: string,
): Author | undefined {
  return indexOf(catalogue).authors.get(id);
}

export function getReciterById(
  catalogue: Catalogue,
  id: string,
): Reciter | undefined {
  return indexOf(catalogue).reciters.get(id);
}

export function getScriptureById(
  catalogue: Catalogue,
  id: string,
): Scripture | undefined {
  return indexOf(catalogue).scriptures.get(id);
}

export function getResourceSectionById(
  catalogue: Catalogue,
  id: string,
): ResourceSection | undefined {
  return indexOf(catalogue).resourceSections.get(id);
}

export function getTrackInCollection(
  catalogue: Catalogue,
  albumId: string,
  trackId: string,
): Track | undefined {
  return indexOf(catalogue).tracksByCollectionId.get(albumId)?.get(trackId);
}

export function getResourcesForSection(
  catalogue: Catalogue,
  sectionId: string,
): ResourceItem[] {
  return indexOf(catalogue).resourcesBySectionId.get(sectionId) ?? [];
}

export function catalogueAllTrackIds(catalogue: Catalogue): Set<string> {
  return indexOf(catalogue).allTrackIds;
}
