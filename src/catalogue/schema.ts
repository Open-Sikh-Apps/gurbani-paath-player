import * as v from "valibot";

export const nonEmptyString = v.pipe(v.string(), v.nonEmpty());
const nonEmptyUrl = v.pipe(nonEmptyString, v.url());
export const finiteNumber = v.pipe(v.number(), v.finite());

// Published JSON stores CDN-relative paths; hydrate prepends EXPO_PUBLIC_MEDIA_BASE_URL.
const mediaPathSchema = v.pipe(
  nonEmptyString,
  v.regex(/^\/(audio|images)\//),
);
export const mediaUrlSchema = v.union([nonEmptyUrl, mediaPathSchema]);

// A plain string is both themes; `{ light, dark }` is used when art differs.
export const themedMediaUrlSchema = v.union([
  mediaUrlSchema,
  v.object({
    light: mediaUrlSchema,
    dark: mediaUrlSchema,
  }),
]);

export const l10nTextSchema = v.objectWithRest(
  { en: nonEmptyString },
  nonEmptyString,
);

export const l10nUrlSchema = v.objectWithRest(
  { en: nonEmptyUrl },
  nonEmptyUrl,
);

const namedEntityBase = {
  id: nonEmptyString,
  name: l10nTextSchema,
  imageUrl: v.optional(themedMediaUrlSchema),
  aboutUrl: v.optional(l10nUrlSchema),
};

export const namedEntitySchema = v.object(namedEntityBase);

const scriptureSchema = v.object({
  ...namedEntityBase,
  sttmCoSlug: v.optional(nonEmptyString),
});

const resourceSectionSchema = v.object({
  id: nonEmptyString,
  title: l10nTextSchema,
});

const resourceItemSchema = v.object({
  id: nonEmptyString,
  sectionId: nonEmptyString,
  title: l10nTextSchema,
  description: l10nTextSchema,
  url: nonEmptyUrl,
});

const angTimestampSchema = v.object({
  tSec: finiteNumber,
  ang: finiteNumber,
});

const trackBase = {
  id: nonEmptyString,
  title: l10nTextSchema,
  url: mediaUrlSchema,
};

// R2 object Content-Length; new trackId if the file changes. Radio has no finite object.
export const TRACK_BYTE_SIZE_MAX = 512 * 1024 * 1024;
export const trackByteSizeSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(1),
  v.maxValue(TRACK_BYTE_SIZE_MAX),
);

const sehajPaathTrackSchema = v.object({
  ...trackBase,
  kind: v.literal("sehaj_paath"),
  durationSec: v.pipe(finiteNumber, v.minValue(1)),
  byteSize: trackByteSizeSchema,
  startAng: v.optional(finiteNumber),
  endAng: v.optional(finiteNumber),
  angTimestamps: v.optional(v.array(angTimestampSchema)),
});

const audiobookTrackSchema = v.object({
  ...trackBase,
  kind: v.literal("audiobook"),
  durationSec: v.pipe(finiteNumber, v.minValue(1)),
  byteSize: trackByteSizeSchema,
  readAlongUrl: v.optional(nonEmptyUrl),
});

const radioTrackSchema = v.object({
  ...trackBase,
  kind: v.literal("radio"),
});

export const trackSchema = v.variant("kind", [
  sehajPaathTrackSchema,
  audiobookTrackSchema,
  radioTrackSchema,
]);

const collectionBase = {
  id: nonEmptyString,
  title: v.optional(l10nTextSchema),
  authorId: v.optional(nonEmptyString),
  languages: v.pipe(v.array(nonEmptyString), v.nonEmpty()),
  artworkUrl: v.optional(themedMediaUrlSchema),
  downloadable: v.boolean(),
};

export const collectionSchema = v.variant("kind", [
  v.object({
    ...collectionBase,
    kind: v.literal("sehaj_paath"),
    reciterId: nonEmptyString,
    scriptureId: nonEmptyString,
    tracks: v.pipe(v.array(sehajPaathTrackSchema), v.nonEmpty()),
  }),
  v.object({
    ...collectionBase,
    kind: v.literal("audiobook"),
    reciterId: v.optional(nonEmptyString),
    scriptureId: v.optional(nonEmptyString),
    tracks: v.pipe(v.array(audiobookTrackSchema), v.nonEmpty()),
  }),
  v.object({
    ...collectionBase,
    kind: v.literal("radio"),
    reciterId: v.optional(nonEmptyString),
    scriptureId: v.optional(nonEmptyString),
    tracks: v.pipe(v.array(radioTrackSchema), v.nonEmpty()),
  }),
]);

export const catalogueObjectSchema = v.object({
  version: finiteNumber,
  heroImageUrl: themedMediaUrlSchema,
  authors: v.array(namedEntitySchema),
  reciters: v.array(namedEntitySchema),
  scriptures: v.array(scriptureSchema),
  collections: v.array(collectionSchema),
  resourceSections: v.array(resourceSectionSchema),
  resources: v.array(resourceItemSchema),
});

type CatalogueDraft = v.InferOutput<typeof catalogueObjectSchema>;

function collectIds(catalogue: CatalogueDraft): string[] {
  return [
    ...catalogue.authors.map((item) => item.id),
    ...catalogue.reciters.map((item) => item.id),
    ...catalogue.scriptures.map((item) => item.id),
    ...catalogue.resourceSections.map((item) => item.id),
    ...catalogue.resources.map((item) => item.id),
    ...catalogue.collections.map((item) => item.id),
    ...catalogue.collections.flatMap((item) =>
      item.tracks.map((track) => track.id),
    ),
  ];
}

export const catalogueSchema = v.pipe(
  catalogueObjectSchema,
  v.rawCheck(({ dataset, addIssue }) => {
    if (!dataset.typed) {
      return;
    }
    const catalogue = dataset.value;
    const seenIds = new Set<string>();
    for (const id of collectIds(catalogue)) {
      if (seenIds.has(id)) {
        addIssue({
          message: `id "${id}" is not unique across all entity types`,
        });
        return;
      }
      seenIds.add(id);
    }

    const authorIds = new Set(catalogue.authors.map((item) => item.id));
    const reciterIds = new Set(catalogue.reciters.map((item) => item.id));
    const scriptureIds = new Set(catalogue.scriptures.map((item) => item.id));
    const sectionIds = new Set(
      catalogue.resourceSections.map((item) => item.id),
    );

    for (const collection of catalogue.collections) {
      if (collection.authorId && !authorIds.has(collection.authorId)) {
        addIssue({
          message: `collections id "${collection.id}" authorId "${collection.authorId}" does not exist`,
        });
      }
      if (collection.reciterId && !reciterIds.has(collection.reciterId)) {
        addIssue({
          message: `collections id "${collection.id}" reciterId "${collection.reciterId}" does not exist`,
        });
      }
      if (collection.scriptureId && !scriptureIds.has(collection.scriptureId)) {
        addIssue({
          message: `collections id "${collection.id}" scriptureId "${collection.scriptureId}" does not exist`,
        });
      }
    }

    for (const resource of catalogue.resources) {
      if (!sectionIds.has(resource.sectionId)) {
        addIssue({
          message: `resources id "${resource.id}" sectionId "${resource.sectionId}" does not exist`,
        });
      }
    }
  }),
);

export type L10nText = v.InferOutput<typeof l10nTextSchema>;
export type L10nUrl = v.InferOutput<typeof l10nUrlSchema>;
export type ThemedMediaUrl = v.InferOutput<typeof themedMediaUrlSchema>;
export type Author = v.InferOutput<typeof namedEntitySchema>;
export type Reciter = Author;
export type Scripture = v.InferOutput<typeof scriptureSchema>;
export type ResourceSection = v.InferOutput<typeof resourceSectionSchema>;
export type ResourceItem = v.InferOutput<typeof resourceItemSchema>;
export type SehajPaathTrack = v.InferOutput<typeof sehajPaathTrackSchema>;
export type AudiobookTrack = v.InferOutput<typeof audiobookTrackSchema>;
export type RadioTrack = v.InferOutput<typeof radioTrackSchema>;
export type Track = v.InferOutput<typeof trackSchema>;
export type Collection = v.InferOutput<typeof collectionSchema>;
export type SehajPaathCollection = Extract<Collection, { kind: "sehaj_paath" }>;
export type AudiobookCollection = Extract<Collection, { kind: "audiobook" }>;
export type RadioCollection = Extract<Collection, { kind: "radio" }>;
export type CollectionKind = Collection["kind"];
export type Catalogue = v.InferOutput<typeof catalogueSchema>;
