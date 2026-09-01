import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as v from "valibot";

import { trackByteSizeSchema } from "../src/catalogue/schema";

const CONCURRENCY = 6;
const TIMEOUT_MS = 8_000;
const USER_AGENT =
  "GurbaniAudioPlayer/1.0 (cingh.jasdeep@gmail.com)";

const recordedKindSchema = v.picklist(["sehaj_paath", "audiobook"]);

const recordedTrackSchema = v.looseObject({
  kind: recordedKindSchema,
  id: v.pipe(v.string(), v.nonEmpty()),
  url: v.pipe(v.string(), v.nonEmpty()),
  byteSize: v.optional(v.number()),
});

const catalogueFillSchema = v.looseObject({
  collections: v.array(
    v.looseObject({
      tracks: v.array(v.unknown()),
    }),
  ),
});

const sizeHeaderSchema = v.pipe(
  v.string(),
  v.transform((value) => Number(value)),
  trackByteSizeSchema,
);

type FillableTrack = v.InferOutput<typeof recordedTrackSchema>;

function usage(): never {
  console.error(
    "Usage: npx tsx scripts/fill-catalogue-bytesize.ts <catalogue.json>",
  );
  process.exit(1);
}

function parseSizeHeader(raw: string | null): number | null {
  if (raw == null) {
    return null;
  }
  const result = v.safeParse(sizeHeaderSchema, raw);
  return result.success ? result.output : null;
}

function parseContentRangeTotal(raw: string | null): number | null {
  if (raw == null) {
    return null;
  }
  const match = /\/(\d+)\s*$/.exec(raw);
  if (!match) {
    return null;
  }
  const result = v.safeParse(trackByteSizeSchema, Number(match[1]));
  return result.success ? result.output : null;
}

function mediaBase(): string {
  const raw = (
    process.env.MEDIA_BASE_URL ?? process.env.EXPO_PUBLIC_MEDIA_BASE_URL
  )?.trim();
  if (!raw) {
    throw new Error(
      "Set MEDIA_BASE_URL or EXPO_PUBLIC_MEDIA_BASE_URL to HEAD relative /audio/ paths",
    );
  }
  return raw.replace(/\/+$/, "");
}

function resolveProbeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (!url.startsWith("/")) {
    throw new Error(`Track URL is not absolute or a media path: ${url}`);
  }
  return `${mediaBase()}${url}`;
}

async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function probeOnce(url: string): Promise<number> {
  const headers = { "User-Agent": USER_AGENT };
  const head = await withTimeout((signal) =>
    fetch(url, {
      method: "HEAD",
      headers,
      redirect: "follow",
      signal,
    }),
  );
  const fromHead = parseSizeHeader(head.headers.get("content-length"));
  if (head.ok && fromHead != null) {
    return fromHead;
  }
  // Some hosts omit Content-Length on HEAD; Content-Range is the object size.
  const ranged = await withTimeout((signal) =>
    fetch(url, {
      method: "GET",
      headers: { ...headers, Range: "bytes=0-0" },
      redirect: "follow",
      signal,
    }),
  );
  const fromRange = parseContentRangeTotal(ranged.headers.get("content-range"));
  if (fromRange != null) {
    return fromRange;
  }
  throw new Error(
    `HEAD ${head.status}, GET ${ranged.status}, no Content-Length/Content-Range`,
  );
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      await mapper(items[index]);
    }
  }
  const workers = Math.min(concurrency, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: workers }, () => worker()));
}

async function probeContentLength(url: string): Promise<number> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await probeOnce(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function needsByteSize(track: unknown): track is FillableTrack {
  const parsed = v.safeParse(recordedTrackSchema, track);
  if (!parsed.success) {
    return false;
  }
  const size = parsed.output.byteSize;
  return !Number.isInteger(size) || Number(size) < 1;
}

function pendingTracks(catalogue: unknown): FillableTrack[] {
  v.parse(catalogueFillSchema, catalogue);
  const collections = (catalogue as v.InferOutput<typeof catalogueFillSchema>)
    .collections;
  return collections.flatMap((collection) =>
    collection.tracks.filter(needsByteSize),
  );
}

async function main(): Promise<void> {
  const input = process.argv[2];
  if (!input) {
    usage();
  }
  const path = resolve(input);
  const catalogue: unknown = JSON.parse(readFileSync(path, "utf8"));
  const pending = pendingTracks(catalogue);
  if (pending.length === 0) {
    console.log("All recorded tracks already have byteSize.");
    return;
  }
  console.log(`Probing ${pending.length} track URL(s) for Content-Length…`);
  const failures: string[] = [];
  await mapPool(pending, CONCURRENCY, async (track) => {
    try {
      track.byteSize = await probeContentLength(resolveProbeUrl(track.url));
      console.log(`${track.id}: ${track.byteSize}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${track.id}: ${message}`);
    }
  });
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    throw new Error(`Failed to probe ${failures.length} track(s).`);
  }
  writeFileSync(path, `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`Wrote ${pending.length} byteSize value(s) to ${path}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
