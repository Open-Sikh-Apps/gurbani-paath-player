import * as v from "valibot";

import { catalogueSchema, collectionSchema, catalogueObjectSchema, namedEntitySchema, type Catalogue } from "./schema";

export class CatalogueParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogueParseError";
  }
}

function formatIssues(
  issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]],
): string {
  return issues
    .map((issue) => {
      const path = issue.path?.map((item) => String(item.key)).join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

export function parseCatalogue(value: unknown): Catalogue {
  const result = v.safeParse(catalogueSchema, value);
  if (!result.success) {
    throw new CatalogueParseError(formatIssues(result.issues));
  }
  return result.output;
}

const collectionKinds = collectionSchema.options.map(
  (option) => option.entries.kind.literal
) as [string, ...string[]];

const shallowCollectionSchema = v.object({
  id: collectionSchema.options[0].entries.id,
  kind: v.picklist(collectionKinds),
  tracks: v.array(v.unknown()),
});

const shallowEntitySchema = v.object({
  id: namedEntitySchema.entries.id,
  name: namedEntitySchema.entries.name,
});

const cachedCatalogueSchema = v.object({
  version: catalogueObjectSchema.entries.version,
  heroImageUrl: catalogueObjectSchema.entries.heroImageUrl,
  
  authors: v.array(shallowEntitySchema),
  reciters: v.array(shallowEntitySchema),
  scriptures: v.array(shallowEntitySchema),
  
  collections: v.array(shallowCollectionSchema),
  
  resourceSections: v.array(v.unknown()),
  resources: v.array(v.unknown()),
});

/** Cheap shape check for disk cache and downloads. Full Valibot runs at publish/CI only. */
export function assertCachedCatalogue(value: unknown): Catalogue {
  const result = v.safeParse(cachedCatalogueSchema, value);
  
  if (result.success) {
    return value as Catalogue; 
  }

  // To keep your exact custom error messages, map the failure path
  const firstIssue = result.issues[0];
  const rootKey = firstIssue.path?.[0]?.key;

  if (!rootKey) throw new CatalogueParseError("Cached catalogue is not an object");
  if (rootKey === "version") throw new CatalogueParseError("Cached catalogue is missing version");
  if (rootKey === "heroImageUrl") throw new CatalogueParseError("Cached catalogue is missing heroImageUrl");
  if (rootKey === "authors" || rootKey === "reciters") throw new CatalogueParseError("Cached catalogue authors or reciters are invalid");
  if (rootKey === "scriptures") throw new CatalogueParseError("Cached catalogue scriptures are invalid");
  if (rootKey === "collections") throw new CatalogueParseError("Cached catalogue collections are invalid");
  if (rootKey === "resourceSections" || rootKey === "resources") throw new CatalogueParseError("Cached catalogue resources are invalid");
  throw new CatalogueParseError(formatIssues(result.issues));
}
