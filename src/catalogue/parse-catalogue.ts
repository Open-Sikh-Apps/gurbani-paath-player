import * as v from "valibot";

import { catalogueSchema, type Catalogue } from "./schema";

const COLLECTION_KINDS = new Set(["sehaj_paath", "audiobook", "radio"]);

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEntityArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        item.id.length > 0 &&
        isRecord(item.name) &&
        typeof item.name.en === "string",
    )
  );
}

/** Cheap shape check for disk cache and downloads. Full Valibot runs at publish/CI only. */
export function assertCachedCatalogue(value: unknown): Catalogue {
  if (!isRecord(value)) {
    throw new CatalogueParseError("Cached catalogue is not an object");
  }
  if (typeof value.version !== "number" || !Number.isFinite(value.version)) {
    throw new CatalogueParseError("Cached catalogue is missing version");
  }
  if (typeof value.heroImageUrl !== "string" || value.heroImageUrl.length === 0) {
    throw new CatalogueParseError("Cached catalogue is missing heroImageUrl");
  }
  if (!isEntityArray(value.authors) || !isEntityArray(value.reciters)) {
    throw new CatalogueParseError("Cached catalogue authors or reciters are invalid");
  }
  if (!isEntityArray(value.scriptures)) {
    throw new CatalogueParseError("Cached catalogue scriptures are invalid");
  }
  if (!Array.isArray(value.collections) || value.collections.length === 0) {
    throw new CatalogueParseError("Cached catalogue collections are invalid");
  }
  for (const collection of value.collections) {
    if (
      !isRecord(collection) ||
      typeof collection.id !== "string" ||
      typeof collection.kind !== "string" ||
      !COLLECTION_KINDS.has(collection.kind) ||
      !Array.isArray(collection.tracks)
    ) {
      throw new CatalogueParseError("Cached catalogue collection is invalid");
    }
  }
  if (!Array.isArray(value.resourceSections) || !Array.isArray(value.resources)) {
    throw new CatalogueParseError("Cached catalogue resources are invalid");
  }
  return value as Catalogue;
}
