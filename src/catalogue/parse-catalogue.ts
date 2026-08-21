import * as v from "valibot";

import { catalogueSchema, type Catalogue } from "@/catalogue/schema";

export class CatalogueParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogueParseError";
  }
}

function formatIssues(issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]]): string {
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
