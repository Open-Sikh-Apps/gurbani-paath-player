import type { Catalogue, Collection, ThemedMediaUrl } from "@/catalogue/schema";
import { getMediaBaseUrl } from "@/catalogue/media-base-url";

const ABSOLUTE = /^https?:\/\//i;

export function resolveMediaUrl(url: string): string {
  if (ABSOLUTE.test(url)) {
    return url;
  }
  const base = getMediaBaseUrl();
  // Missing CDN base or a non-path leaves the catalogue string so hydrate does not throw.
  if (!base || !url.startsWith("/")) {
    return url;
  }
  return `${base}${url}`;
}

function resolveThemedMediaUrl(url: ThemedMediaUrl): ThemedMediaUrl {
  if (typeof url === "string") {
    return resolveMediaUrl(url);
  }
  return {
    light: resolveMediaUrl(url.light),
    dark: resolveMediaUrl(url.dark),
  };
}

function mapOptional(
  url: ThemedMediaUrl | undefined,
): ThemedMediaUrl | undefined {
  return url == null ? undefined : resolveThemedMediaUrl(url);
}

function withResolvedUrl<T extends { url: string }>(item: T): T {
  return { ...item, url: resolveMediaUrl(item.url) };
}

// Switch on kind so mapped tracks stay that variant; spreading the union widens tracks to Track[].
function resolveCollection(collection: Collection): Collection {
  const artworkUrl = mapOptional(collection.artworkUrl);
  switch (collection.kind) {
    case "sehaj_paath":
      return {
        ...collection,
        artworkUrl,
        tracks: collection.tracks.map(withResolvedUrl),
      };
    case "audiobook":
      return {
        ...collection,
        artworkUrl,
        tracks: collection.tracks.map(withResolvedUrl),
      };
    case "radio":
      return {
        ...collection,
        artworkUrl,
        tracks: collection.tracks.map(withResolvedUrl),
      };
  }
}

/** Catalogue JSON stores `/audio/…` and `/images/…`; playback needs https. */
export function resolveCatalogueMedia(catalogue: Catalogue): Catalogue {
  return {
    ...catalogue,
    heroImageUrl: resolveThemedMediaUrl(catalogue.heroImageUrl),
    authors: catalogue.authors.map((author) => ({
      ...author,
      imageUrl: mapOptional(author.imageUrl),
    })),
    reciters: catalogue.reciters.map((reciter) => ({
      ...reciter,
      imageUrl: mapOptional(reciter.imageUrl),
    })),
    scriptures: catalogue.scriptures.map((scripture) => ({
      ...scripture,
      imageUrl: mapOptional(scripture.imageUrl),
    })),
    collections: catalogue.collections.map(resolveCollection),
  };
}
