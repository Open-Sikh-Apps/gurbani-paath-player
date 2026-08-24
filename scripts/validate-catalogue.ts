import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseCatalogue } from "../src/catalogue/parse-catalogue";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validatePair(cataloguePath: string, versionPath: string): void {
  const catalogue = parseCatalogue(readJson(cataloguePath));
  const versionFile = readJson(versionPath);
  if (
    typeof versionFile !== "object" ||
    versionFile === null ||
    !("version" in versionFile) ||
    typeof versionFile.version !== "number" ||
    !Number.isFinite(versionFile.version)
  ) {
    throw new Error(`${versionPath} must be { "version": <number> }`);
  }
  if (versionFile.version !== catalogue.version) {
    throw new Error(
      `Version mismatch: ${versionPath} has ${versionFile.version}, ${cataloguePath} has ${catalogue.version}. Bump both together.`,
    );
  }
  console.log(
    `Catalogue OK (version ${catalogue.version}, ${catalogue.collections.length} collections) at ${cataloguePath}`,
  );
}

function main(): void {
  if (process.argv[2]) {
    const versionArg = process.argv[3];
    if (!versionArg) {
      throw new Error(
        "Usage: tsx scripts/validate-catalogue.ts <catalogue.json> <catalogue.version.json>",
      );
    }
    validatePair(resolve(process.argv[2]), resolve(versionArg));
    return;
  }

  const mockPath = resolve("src/catalogue/mock-catalogue.json");
  const mock = parseCatalogue(readJson(mockPath));
  console.log(
    `Mock OK (version ${mock.version}, ${mock.collections.length} collections) at ${mockPath}`,
  );
}

try {
  main();
} catch (caught) {
  console.error(caught instanceof Error ? caught.message : caught);
  process.exitCode = 1;
}
