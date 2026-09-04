# Khajana → R2 → catalogue

Local audio lives in the sibling folder `audio-khajana-local-copy/` (not this git repo). The app only stores IDs, scripts, and a bundled `src/catalogue/mock-catalogue.json`.

```
audio-khajana-local-copy/
  khajana/          originals — never write here
  out/              loudness-normalized copies
  upload/           R2 key layout: audio/{collectionId}/{trackId}.mp3
  catalogue.json    source of truth before Pages
  catalogue.version.json
  manifest.csv      rename audit
  upload-done.txt   wrangler resume list
  sggsj.jpg         scripture art
```

R2 bucket `gurbaniaudioplayerfiles`, public host `https://gurbaniaudioplayerfiles.opensikhapps.com`. Catalogue JSON stores paths (`/audio/…`, `/images/sggsj.jpg`). The app prepends `EXPO_PUBLIC_MEDIA_BASE_URL`.

Do not commit mp3s or `upload/`. Reciter, collection (album), scripture, and track UUIDs live in [`scripts/khajana-ids.json`](../scripts/khajana-ids.json) so a rebuild keeps the same R2 keys. A new reciter in the build script gets new UUIDs on the next `khajana:build-catalogue`.

---

## Commands (from the app repo)

| Step | Command |
|---|---|
| Loudness (one reciter) | `./scripts/normalize-loudness.sh --folder KEY` |
| Loudness (all folders in the script) | `./scripts/normalize-loudness.sh` |
| Parse `out/` → catalogue + `upload/` | `npm run khajana:build-catalogue` |
| ID3 from catalogue titles | `npm run khajana:tag-mp3s` |
| Put objects on R2 | `npm run khajana:upload-r2` |
| Valibot | `npm run catalogue:validate` |

Folder keys for `--folder`: `mehngasingh` `sarwansingh` `baljitsingh` `pishorasingh` `bhupindersingh` `sahibsingh`.

Normalize uses **album** ReplayGain per reciter folder (`mp3rgain` / `mp3gain`), no re-encode. Install: `brew install M-Igashi/tap/mp3rgain`.

R2 upload needs Wrangler auth (`npx wrangler login` or `CLOUDFLARE_API_TOKEN`). It sets `Content-Type` and `Cache-Control: public, max-age=31536000, immutable`. Resume skips keys in `upload-done.txt`.

`curl -sI` is HEAD; this hostname returns `cf-cache-status: DYNAMIC` for HEAD. Check cache with GET:

```bash
curl -s -D - -o /dev/null -H "Range: bytes=0-0" \
  "https://gurbaniaudioplayerfiles.opensikhapps.com/audio/{collectionId}/{trackId}.mp3"
```

First GET: `MISS`. Second: `HIT`.

---

## After more collections (usual path)

Treat this as **append**, not a from-scratch rebuild of editorial copy.

### 1. Drop files in `khajana/`

New reciter: one new folder of `.mp3`s (same dialect of names if you can — Ang ranges, `Part.N`, etc.).

Extra tracks on an existing reciter: add files to that reciter’s folder. Do not rename files that are already published; a new filename gets a new `trackId`. If the **audio** of a published track changes, use a new `trackId` (new R2 object). Paths are immutable.

### 2. Teach the scripts

- [`scripts/normalize-loudness.sh`](../scripts/normalize-loudness.sh) — add the folder name to `FOLDERS` and a `--folder` key in `folder_key`.
- [`scripts/build-khajana-catalogue.ts`](../scripts/build-khajana-catalogue.ts) — add a `RECITERS` row (`key`, `folderMatch`, `nameEn`, `namePa`) and a filename parser. Do **not** put UUIDs in the script. The next `khajana:build-catalogue` writes new `reciters` / `collections` entries (and new `tracks` keys) into [`scripts/khajana-ids.json`](../scripts/khajana-ids.json). To attach a new album to an **existing** reciter, reuse that reciter `key` so the same `reciters.<key>` id is used. Punjabi `namePa` is editorial; check it before publish.

### 3. Normalize only what is new

```bash
./scripts/normalize-loudness.sh --folder NEWKEY
```

Existing `out/` folders are left alone unless you pass `--force`. Spot-check a quiet and a loud file against `khajana/`.

### 4. Backup editorial catalogue, then build

`khajana:build-catalogue` **rewrites** `catalogue.json` and `mock-catalogue.json` from filenames. It will restore Sahib titles to **Episode N** (parser default), even if you edited them to **Part N**. Resources in the build script are kept.

```bash
cp ../audio-khajana-local-copy/catalogue.json /tmp/catalogue.backup.json
npm run khajana:build-catalogue
```

Existing keys in `khajana-ids.json` are reused (`scriptureId`, `reciters`, `collections`, `tracks`). Only new files and new reciter keys get new UUIDs. Then copy your title/name edits from the backup into the new JSON (or re-apply Sahib Part titles). Keep `resourceSections` / `resources`.

Bump **both** `catalogue.json` `version` and `catalogue.version.json` together when you publish a new catalogue (not for a local-only retag).

### 5. Tag, then upload

```bash
npm run khajana:tag-mp3s
npm run khajana:upload-r2
```

Tag writes English `title` / reciter / album onto `upload/` mp3s, keeps ReplayGain, no embedded art, then refreshes `byteSize`. It copies `catalogue.json` → `mock-catalogue.json`.

Upload skips keys already in `upload-done.txt`. New `audio/{collectionId}/{trackId}.mp3` objects (and a new `images/sggsj.jpg` if that file changed) go up with cache headers.

If you **retag** files that were already uploaded, delete those keys from `upload-done.txt` (or remove the done file) so they are put again. Edge cache may still serve the old object until TTL or a purge; new `trackId`s avoid that.

### 6. Publish catalogue JSON

Copy `catalogue.json` and `catalogue.version.json` into `gurbani-paath-player-catalogue` and push `main`. CI runs `catalogue:fill-bytesize` then Valibot, then Direct-Uploads to Pages.

That fill script only **adds** `byteSize` when it is missing or not a positive integer. It does not overwrite sizes already written by `khajana:build-catalogue` / `khajana:tag-mp3s`. If every recorded track already has a valid size, it logs `All recorded tracks already have byteSize.` and leaves the file unchanged.

App `.env`: `EXPO_PUBLIC_CATALOGUE_BASE_URL` (Pages) and `EXPO_PUBLIC_MEDIA_BASE_URL=https://gurbaniaudioplayerfiles.opensikhapps.com`. Cold start or Home pull-to-refresh picks up the new version. Set `EXPO_PUBLIC_USE_MOCK_CATALOGUE=1` to stay on bundled `mock-catalogue.json` (no Pages fetch); unset it to hit Pages. Restart Metro after changing.

### 7. Delete local audio (optional)

After `upload-done.txt` lists every key (883 mp3s + `images/sggsj.jpg`) and a couple of GET Range checks return `200`, the app does not need local mp3s.

**Safe to delete** (most of the disk): `upload/audio/` (already on R2) and `out/` (regenerable from `khajana/` with `normalize-loudness.sh`).

**Keep:**

| Path | Why |
|---|---|
| `scripts/khajana-ids.json` | Reciter / album / track UUIDs. A rebuild without it mints new ids and new R2 paths. |
| `catalogue.json` + `catalogue.version.json` | What you push to Pages. |
| `src/catalogue/mock-catalogue.json` | Bundled app copy. |
| `upload-done.txt` | Resume list so a later `khajana:upload-r2` does not re-put published keys. |
| `manifest.csv` | Audit of original name → R2 key. |

**Optional keep:** `khajana/` originals (only way to re-normalize without downloading from R2). `sggsj.jpg` / `upload/images/sggsj.jpg` if you might replace art.

If you later **retag** or **replace audio**, restore from `khajana/` → normalize → build `upload/` → clear those keys from `upload-done.txt` → put.

---

## Title-only or ID3-only (no new audio)

Edit `audio-khajana-local-copy/catalogue.json`, then:

```bash
npm run khajana:tag-mp3s
```

Do **not** run `khajana:build-catalogue`. Re-upload only if you need the new tags on R2 (clear those keys in `upload-done.txt`). Bump catalogue version and push Pages if the JSON the app reads should change.

---

## Do not

- Write into `khajana/` from the scripts.
- Re-run full normalize with `--force` on reciters that are already published unless you intend to replace audio (new `trackId`s).
- Change a published `trackId` / `collectionId` without uploading a new object and a new catalogue.
- Put Worker `X-App-Origin` or nitro `extraPayload.headers` on these public URLs.
- Embed `sggsj.jpg` in every mp3.
