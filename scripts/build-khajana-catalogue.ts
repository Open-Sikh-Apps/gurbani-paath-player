/**
 * Parse normalized khajana out/ into a catalogue, manifest, and upload/ tree.
 * Never reads or writes khajana/. Reciter, collection, scripture, and track
 * UUIDs persist in scripts/khajana-ids.json.
 */
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCatalogue } from "../src/catalogue/parse-catalogue";
import { TRACK_BYTE_SIZE_MAX } from "../src/catalogue/schema";
import type { Catalogue, SehajPaathTrack } from "../src/catalogue/schema";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Huge mp3 tree stays outside this repo; override with KHAJANA_COPY_ROOT.
const COPY_ROOT = resolve(
  process.env.KHAJANA_COPY_ROOT ?? join(APP_ROOT, "../audio-khajana-local-copy"),
);
const OUT_DIR = join(COPY_ROOT, "out");
const UPLOAD_DIR = join(COPY_ROOT, "upload");
const IDS_PATH = join(APP_ROOT, "scripts/khajana-ids.json");
const IMAGE_SRC = join(COPY_ROOT, "sggsj.jpg");
const IMAGE_PATH = "/images/sggsj.jpg";

type ReciterKey =
  | "mehnga"
  | "sarwan"
  | "baljit"
  | "pishora"
  | "bhupinder"
  | "sahib";

type ParsedTrack = {
  reciter: ReciterKey;
  originalName: string;
  srcPath: string;
  sort: number;
  titleEn: string;
  titlePa: string;
  startAng?: number;
  endAng?: number;
};

type IdsFile = {
  scriptureId: string;
  reciters: Record<string, string>;
  collections: Record<string, string>;
  tracks: Record<string, string>;
};

/** Seed so the first ids-file upgrade keeps the R2 keys already uploaded. */
const DEFAULT_SCRIPTURE_ID = "f73973d6-8bd7-4972-a0b7-a951ee6d6bf1";
const DEFAULT_RECITER_IDS: Record<ReciterKey, string> = {
  mehnga: "3bd6cc33-926d-4a90-943b-67d2d81dcde0",
  sarwan: "bfe2a823-c79e-41b9-af2e-9397236082cc",
  baljit: "5d924f71-4e6c-4c2d-adc9-e11114fe212a",
  pishora: "89336a6f-a89c-4f81-9170-4d01aea93e42",
  bhupinder: "2c116cbd-0991-4c30-ae8d-3201e9cdec0e",
  sahib: "65a52ac0-a435-4d20-8bde-df0f1565d1a6",
};
const DEFAULT_COLLECTION_IDS: Record<ReciterKey, string> = {
  mehnga: "317332da-a405-474c-b2df-134085cf15d2",
  sarwan: "6db59835-ede7-4fe9-9f43-5735866c46e5",
  baljit: "65fd2f89-ff87-4388-bf8a-8f6069ddc220",
  pishora: "a76c48a3-2a1e-4a28-a2dd-f5bf1b4849e6",
  bhupinder: "656c0d42-a704-4529-bb0b-e96b5f26ca45",
  sahib: "4e63ae62-9c98-4bab-b151-b0c5f3c02521",
};

const RECITERS: {
  key: ReciterKey;
  folderMatch: string;
  nameEn: string;
  namePa: string;
}[] = [
  {
    key: "mehnga",
    folderMatch: "Mehnga",
    nameEn: "Bhai Mehnga Singh Ji",
    namePa: "ਭਾਈ ਮਹਿੰਗਾ ਸਿੰਘ ਜੀ",
  },
  {
    key: "sarwan",
    folderMatch: "Sarwan",
    nameEn: "Bhai Sarwan Singh Ji",
    namePa: "ਭਾਈ ਸਰਵਣ ਸਿੰਘ ਜੀ",
  },
  {
    key: "baljit",
    folderMatch: "Baljit",
    nameEn: "Giani Baljit Singh Ji",
    namePa: "ਗਿਆਨੀ ਬਲਜੀਤ ਸਿੰਘ ਜੀ",
  },
  {
    key: "pishora",
    folderMatch: "Pishora",
    nameEn: "Bhai Pishora Singh Ji",
    namePa: "ਭਾਈ ਪਿਸ਼ੋਰਾ ਸਿੰਘ ਜੀ",
  },
  {
    key: "bhupinder",
    folderMatch: "Bhupinder",
    nameEn: "Bhai Bhupinder Singh (Damdami Taksal wale)",
    namePa: "ਭਾਈ ਭੁਪਿੰਦਰ ਸਿੰਘ (ਦਮਦਮੀ ਟਕਸਾਲ ਵਾਲੇ)",
  },
  {
    key: "sahib",
    folderMatch: "Sahib",
    nameEn: "Giani Sahib Singh Ji (Markande Wale)",
    namePa: "ਗਿਆਨੀ ਸਾਹਿਬ ਸਿੰਘ ਜੀ (ਮਾਰਕੰਡਾ ਵਾਲੇ)",
  },
];

// Listening joins confirmed 30 Aug 2026: A→6, B→7, C→10, D→11.
const SAHIB_ANG_EPISODES: { needle: string; episode: number; startAng: number; endAng: number }[] =
  [
    { needle: "Ang No.39 To 46", episode: 6, startAng: 39, endAng: 46 },
    { needle: "Ang No.46 To 54", episode: 7, startAng: 46, endAng: 54 },
    { needle: "Ang No.69 To 78", episode: 10, startAng: 69, endAng: 78 },
    { needle: "Ang No.78 To 86", episode: 11, startAng: 78, endAng: 86 },
  ];

function angTitle(start: number, end: number): { en: string; pa: string } {
  return { en: `Ang ${start} to ${end}`, pa: `ਅੰਗ ${start} ਤੋਂ ${end}` };
}

function partTitle(part: number): { en: string; pa: string } {
  return { en: `Part ${part}`, pa: `ਭਾਗ ${part}` };
}

function episodeTitle(episode: number): { en: string; pa: string } {
  return { en: `Episode ${episode}`, pa: `ਐਪੀਸੋਡ ${episode}` };
}

function parseMehnga(name: string): ParsedTrack | null {
  const match = /Ang-(\d+)-(\d+)/.exec(name);
  if (!match) return null;
  const startAng = Number(match[1]);
  const endAng = Number(match[2]);
  const title = angTitle(startAng, endAng);
  return {
    reciter: "mehnga",
    originalName: name,
    srcPath: "",
    sort: startAng * 10_000 + endAng,
    titleEn: title.en,
    titlePa: title.pa,
    startAng,
    endAng,
  };
}

function parseSarwan(name: string): ParsedTrack | null {
  const match = /Ang_(\d+)-(\d+)/.exec(name);
  if (!match) return null;
  const startAng = Number(match[1]);
  const endAng = Number(match[2]);
  const title = angTitle(startAng, endAng);
  return {
    reciter: "sarwan",
    originalName: name,
    srcPath: "",
    sort: startAng * 10_000 + endAng,
    titleEn: title.en,
    titlePa: title.pa,
    startAng,
    endAng,
  };
}

function parseBaljit(name: string): ParsedTrack | null {
  const match = /(\d+)\s+(\d+)-(\d+)\s*ang/i.exec(name);
  if (!match) return null;
  const startAng = Number(match[2]);
  const endAng = Number(match[3]);
  const title = angTitle(startAng, endAng);
  return {
    reciter: "baljit",
    originalName: name,
    srcPath: "",
    sort: Number(match[1]),
    titleEn: title.en,
    titlePa: title.pa,
    startAng,
    endAng,
  };
}

function parsePishora(name: string): ParsedTrack | null {
  const match = /Page(\d+)-(\d+)/i.exec(name);
  if (!match) return null;
  const startAng = Number(match[1]);
  const endAng = Number(match[2]);
  const title = angTitle(startAng, endAng);
  return {
    reciter: "pishora",
    originalName: name,
    srcPath: "",
    sort: startAng * 10_000 + endAng,
    titleEn: title.en,
    titlePa: title.pa,
    startAng,
    endAng,
  };
}

function parseBhupinder(name: string): ParsedTrack | null {
  const match = /Part\.(\d+)/i.exec(name);
  if (!match) return null;
  const part = Number(match[1]);
  const title = partTitle(part);
  return {
    reciter: "bhupinder",
    originalName: name,
    srcPath: "",
    sort: part,
    titleEn: title.en,
    titlePa: title.pa,
  };
}

function parseSahib(name: string): ParsedTrack | null {
  for (const row of SAHIB_ANG_EPISODES) {
    if (name.includes(row.needle)) {
      const title = episodeTitle(row.episode);
      return {
        reciter: "sahib",
        originalName: name,
        srcPath: "",
        sort: row.episode,
        titleEn: title.en,
        titlePa: title.pa,
        startAng: row.startAng,
        endAng: row.endAng,
      };
    }
  }
  const match =
    /Episode\s+(\d+)/i.exec(name) ?? /Ep[-\s]*(\d+)/i.exec(name);
  if (!match) return null;
  const episode = Number(match[1]);
  const title = episodeTitle(episode);
  return {
    reciter: "sahib",
    originalName: name,
    srcPath: "",
    sort: episode,
    titleEn: title.en,
    titlePa: title.pa,
  };
}

const PARSERS: Record<ReciterKey, (name: string) => ParsedTrack | null> = {
  mehnga: parseMehnga,
  sarwan: parseSarwan,
  baljit: parseBaljit,
  pishora: parsePishora,
  bhupinder: parseBhupinder,
  sahib: parseSahib,
};

function findFolder(match: string): string {
  const found = readdirSync(OUT_DIR, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && entry.name.includes(match),
  );
  if (found.length !== 1) {
    throw new Error(`Expected one out/ folder matching ${match}, got ${found.length}`);
  }
  return join(OUT_DIR, found[0].name);
}

function listMp3s(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".mp3") && !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b));
}

function loadIds(): IdsFile {
  const raw = existsSync(IDS_PATH)
    ? (JSON.parse(readFileSync(IDS_PATH, "utf8")) as Partial<IdsFile>)
    : {};
  const ids: IdsFile = {
    scriptureId: raw.scriptureId ?? DEFAULT_SCRIPTURE_ID,
    reciters: { ...DEFAULT_RECITER_IDS, ...raw.reciters },
    collections: { ...DEFAULT_COLLECTION_IDS, ...raw.collections },
    tracks: raw.tracks ?? {},
  };
  for (const reciter of RECITERS) {
    if (!ids.reciters[reciter.key]) {
      ids.reciters[reciter.key] = randomUUID();
    }
    if (!ids.collections[reciter.key]) {
      ids.collections[reciter.key] = randomUUID();
    }
  }
  return ids;
}

function writeIds(ids: IdsFile): void {
  const reciters: Record<string, string> = {};
  const collections: Record<string, string> = {};
  for (const reciter of RECITERS) {
    reciters[reciter.key] = ids.reciters[reciter.key];
    collections[reciter.key] = ids.collections[reciter.key];
  }
  writeFileSync(
    IDS_PATH,
    `${JSON.stringify(
      {
        scriptureId: ids.scriptureId,
        reciters,
        collections,
        tracks: ids.tracks,
      },
      null,
      2,
    )}\n`,
  );
}

function csvField(value: string | number | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} exited ${code}: ${stderr || stdout}`));
        return;
      }
      resolvePromise(stdout);
    });
  });
}

let durationTool: "ffprobe" | "afinfo" | null = null;

async function detectDurationTool(): Promise<"ffprobe" | "afinfo"> {
  if (durationTool) return durationTool;
  try {
    await runCommand("ffprobe", ["-version"]);
    durationTool = "ffprobe";
    return durationTool;
  } catch {
    // macOS without ffmpeg; afinfo is enough for durationSec.
    durationTool = "afinfo";
    return durationTool;
  }
}

async function durationSec(file: string): Promise<number> {
  const tool = await detectDurationTool();
  if (tool === "ffprobe") {
    const out = await runCommand("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    const value = Number(out.trim());
    if (!Number.isFinite(value) || value < 1) {
      throw new Error(`Bad ffprobe duration for ${file}: ${out}`);
    }
    return Math.max(1, Math.round(value));
  }
  const out = await runCommand("afinfo", [file]);
  const match = /estimated duration:\s+([\d.]+)/.exec(out);
  if (!match) {
    throw new Error(`No afinfo duration for ${file}`);
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`Bad afinfo duration for ${file}: ${match[1]}`);
  }
  return Math.max(1, Math.round(value));
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index]);
    }
  }
  const workers = Math.min(concurrency, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function linkOrCopy(src: string, dest: string): void {
  mkdirSync(dirname(dest), { recursive: true });
  try {
    // Hardlink so upload/ does not duplicate gigabytes of mp3s on the same volume.
    linkSync(src, dest);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    if (code === "EEXIST") {
      return;
    }
    copyFileSync(src, dest);
  }
}

async function main(): Promise<void> {
  if (!existsSync(OUT_DIR)) {
    throw new Error(`Missing ${OUT_DIR}`);
  }
  if (!existsSync(IMAGE_SRC)) {
    throw new Error(`Missing ${IMAGE_SRC}`);
  }

  const ids = loadIds();
  const parsedByReciter = new Map<ReciterKey, ParsedTrack[]>();

  for (const reciter of RECITERS) {
    const folder = findFolder(reciter.folderMatch);
    const files = listMp3s(folder);
    const parsed: ParsedTrack[] = [];
    for (const name of files) {
      const row = PARSERS[reciter.key](name);
      if (!row) {
        // Fail the build rather than silently drop a track from the player.
        throw new Error(`Unparsed ${reciter.key}: ${name}`);
      }
      row.srcPath = join(folder, name);
      parsed.push(row);
    }
    parsed.sort((a, b) => a.sort - b.sort || a.originalName.localeCompare(b.originalName));
    if (reciter.key === "sahib") {
      // 120 numbered episodes; a gap here would show as a hole in the player.
      const episodes = parsed.map((row) => row.sort);
      const missing = Array.from({ length: 120 }, (_, i) => i + 1).filter(
        (n) => !episodes.includes(n),
      );
      const dups = episodes.filter((n, i) => episodes.indexOf(n) !== i);
      if (missing.length || dups.length) {
        throw new Error(`Sahib episode gaps ${missing} dups ${dups}`);
      }
    }
    parsedByReciter.set(reciter.key, parsed);
    for (const row of parsed) {
      const key = `${reciter.key}/${row.originalName}`;
      if (!ids.tracks[key]) {
        ids.tracks[key] = randomUUID();
      }
    }
  }

  writeIds(ids);

  const tool = await detectDurationTool();
  console.log(`Duration via ${tool}`);

  const catalogueTracks = new Map<ReciterKey, SehajPaathTrack[]>();
  const manifestRows: string[] = [
    [
      "reciter",
      "original_name",
      "collection_id",
      "track_id",
      "sort",
      "start_ang",
      "end_ang",
      "title_en",
      "r2_key",
      "byte_size",
      "duration_sec",
    ].join(","),
  ];

  for (const reciter of RECITERS) {
    const collectionId = ids.collections[reciter.key];
    const reciterId = ids.reciters[reciter.key];
    if (!collectionId || !reciterId) {
      throw new Error(`Missing reciter/collection id for ${reciter.key}`);
    }
    const parsed = parsedByReciter.get(reciter.key) ?? [];
    console.log(`${reciter.key}: ${parsed.length} tracks`);
    const enriched = await mapPool(parsed, 8, async (row) => {
      const trackId = ids.tracks[`${reciter.key}/${row.originalName}`];
      if (!trackId) {
        throw new Error(`Missing track id for ${reciter.key}/${row.originalName}`);
      }
      const byteSize = statSync(row.srcPath).size;
      if (
        !Number.isInteger(byteSize) ||
        byteSize < 1 ||
        byteSize > TRACK_BYTE_SIZE_MAX
      ) {
        throw new Error(`byteSize ${byteSize} out of range for ${row.originalName}`);
      }
      const duration = await durationSec(row.srcPath);
      const r2Key = `audio/${collectionId}/${trackId}.mp3`;
      linkOrCopy(row.srcPath, join(UPLOAD_DIR, r2Key));
      const track: SehajPaathTrack = {
        kind: "sehaj_paath",
        id: trackId,
        title: { en: row.titleEn, pa: row.titlePa },
        // Root-relative; the app prefixes the CDN host at runtime.
        url: `/${r2Key}`,
        durationSec: duration,
        byteSize,
      };
      if (row.startAng != null && row.endAng != null) {
        track.startAng = row.startAng;
        track.endAng = row.endAng;
      }
      return { row, track, trackId, r2Key, byteSize, duration };
    });
    for (const item of enriched) {
      manifestRows.push(
        [
          csvField(reciter.key),
          csvField(item.row.originalName),
          csvField(collectionId),
          csvField(item.trackId),
          csvField(item.row.sort),
          csvField(item.row.startAng),
          csvField(item.row.endAng),
          csvField(item.row.titleEn),
          csvField(item.r2Key),
          csvField(item.byteSize),
          csvField(item.duration),
        ].join(","),
      );
    }
    catalogueTracks.set(
      reciter.key,
      enriched.map((item) => item.track),
    );
  }

  mkdirSync(join(UPLOAD_DIR, "images"), { recursive: true });
  copyFileSync(IMAGE_SRC, join(UPLOAD_DIR, "images/sggsj.jpg"));

  const catalogue: Catalogue = {
    version: 1,
    heroImageUrl: IMAGE_PATH,
    authors: [],
    reciters: RECITERS.map((reciter) => ({
      id: ids.reciters[reciter.key],
      name: { en: reciter.nameEn, pa: reciter.namePa },
    })),
    scriptures: [
      {
        id: ids.scriptureId,
        name: {
          en: "Sri Guru Granth Sahib Ji",
          pa: "ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ",
        },
        sttmCoSlug: "g",
        imageUrl: IMAGE_PATH,
        aboutUrl: {
          en: "https://www.sikhiwiki.org/index.php/Guru_Granth_Sahib",
          pa: "https://pa.wikipedia.org/wiki/ਗੁਰੂ_ਗ੍ਰੰਥ_ਸਾਹਿਬ",
        },
      },
    ],
    collections: RECITERS.map((reciter) => ({
      id: ids.collections[reciter.key],
      kind: "sehaj_paath" as const,
      reciterId: ids.reciters[reciter.key],
      languages: ["pa"],
      scriptureId: ids.scriptureId,
      downloadable: true,
      artworkUrl: IMAGE_PATH,
      tracks: catalogueTracks.get(reciter.key) ?? [],
    })),
    resourceSections: [
      {
        id: "f6b53aed-f30e-4ba1-8282-18810c0640af",
        title: { en: "Gurbani", pa: "ਗੁਰਬਾਣੀ" },
      },
      {
        id: "fa3bc241-5e82-481f-9d12-e48a1183f222",
        title: { en: "Media", pa: "ਮੀਡੀਆ" },
      },
      {
        id: "973d9b4c-31c5-4948-aba9-2a8cf6165b08",
        title: { en: "Thanks", pa: "ਧੰਨਵਾਦ" },
      },
    ],
    resources: [
      {
        id: "fc3d677d-0828-482c-967c-e4f5fa47e283",
        sectionId: "f6b53aed-f30e-4ba1-8282-18810c0640af",
        title: { en: "SikhiToTheMax", pa: "ਸਿੱਖੀ ਟੂ ਦ ਮੈਕਸ" },
        description: {
          en: "Read along on the web at sttm.co.",
          pa: "ਵੈੱਬ ਤੇ sttm.co ਉੱਤੇ ਨਾਲ ਨਾਲ ਪੜ੍ਹੋ।",
        },
        url: "https://sttm.co",
      },
      {
        id: "c0b8a140-a76d-4fb7-a159-f46264403808",
        sectionId: "f6b53aed-f30e-4ba1-8282-18810c0640af",
        title: { en: "SikhiToTheMax app", pa: "ਸਿੱਖੀ ਟੂ ਦ ਮੈਕਸ ਐਪ" },
        description: {
          en: "The SikhiToTheMax mobile app for reading Gurbani.",
          pa: "ਗੁਰਬਾਣੀ ਪੜ੍ਹਨ ਲਈ ਸਿੱਖੀ ਟੂ ਦ ਮੈਕਸ ਮੋਬਾਈਲ ਐਪ।",
        },
        url: "https://sharecharityuk.com/sttmhelp/",
      },
      {
        id: "75e82ffc-42ef-4e4c-b8f6-d687215add27",
        sectionId: "fa3bc241-5e82-481f-9d12-e48a1183f222",
        title: { en: "Gurbani Sewa", pa: "ਗੁਰਬਾਣੀ ਸੇਵਾ" },
        description: {
          en: "Gurbani katha, keertan, and other media from gurbanisewa.org.",
          pa: "gurbanisewa.org ਤੋਂ ਗੁਰਬਾਣੀ ਕਥਾ, ਕੀਰਤਨ ਅਤੇ ਹੋਰ ਮੀਡੀਆ।",
        },
        url: "https://www.gurbanisewa.org",
      },
      {
        id: "a42b22dc-3f2c-4b6e-9ca3-7b50cd28bdbf",
        sectionId: "973d9b4c-31c5-4948-aba9-2a8cf6165b08",
        title: {
          en: "Thanks to Gurbani Sewa",
          pa: "ਗੁਰਬਾਣੀ ਸੇਵਾ ਦਾ ਧੰਨਵਾਦ",
        },
        description: {
          en: "Special thanks to www.gurbanisewa.org for providing audio files.",
          pa: "ਆਡੀਓ ਫਾਈਲਾਂ ਦੇਣ ਲਈ www.gurbanisewa.org ਦਾ ਵਿਸ਼ੇਸ਼ ਧੰਨਵਾਦ।",
        },
        url: "https://www.gurbanisewa.org",
      },
    ],
  };

  parseCatalogue(catalogue);

  const catalogueJson = `${JSON.stringify(catalogue, null, 2)}\n`;
  const versionJson = `${JSON.stringify({ version: 1 }, null, 2)}\n`;
  writeFileSync(join(COPY_ROOT, "catalogue.json"), catalogueJson);
  writeFileSync(join(COPY_ROOT, "catalogue.version.json"), versionJson);
  writeFileSync(join(COPY_ROOT, "manifest.csv"), `${manifestRows.join("\n")}\n`);
  // First-launch / EXPO_PUBLIC_USE_MOCK catalogue; keep in lockstep with R2 JSON.
  writeFileSync(join(APP_ROOT, "src/catalogue/mock-catalogue.json"), catalogueJson);

  const trackCount = RECITERS.reduce(
    (sum, reciter) => sum + (catalogueTracks.get(reciter.key)?.length ?? 0),
    0,
  );
  console.log(
    `Wrote ${trackCount} tracks, manifest, upload/, catalogue.json, mock-catalogue.json`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
