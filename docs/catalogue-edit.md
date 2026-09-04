# Edit the catalogue (day to day)

The app reads **Cloudflare Pages** JSON (`catalogue.version.json` then `catalogue.json?v=`). It never calls Sanity. Day-to-day edits are a **JSON edit + optional R2 put**, not a Khajana script rebuild.

Repo: `Open-Sikh-Apps/gurbani-paath-player-catalogue`. CI checkouts this app, fills missing `byteSize`, Valibot-validates, Direct-Uploads to Pages.

Keep [`docs/khajana-publish.md`](khajana-publish.md) for a **bulk first import** of a reciter folder of filenames. Do not run `khajana:build-catalogue` to add one audiobook, one radio, or a title tweak — it rewrites titles from filenames.

---

## Add or update a collection

### 1. Audio / art on R2 (if the file is new)

Bucket `gurbaniaudioplayerfiles`, public host `https://gurbaniaudioplayerfiles.opensikhapps.com`.

Keys are **immutable**:

- `/audio/{collectionId}/{trackId}.mp3`
- `/images/{name}.jpg` (or similar)

New file or changed audio → **new `trackId`** (and a new object). Same `trackId` with different bytes will poison the CDN cache.

```bash
npx wrangler r2 object put gurbaniaudioplayerfiles/audio/{collectionId}/{trackId}.mp3 \
  --file ./local.mp3 \
  --content-type audio/mpeg \
  --cache-control "public, max-age=31536000, immutable" \
  --remote
```

Radio streams can be an `https://` URL in the catalogue instead of an R2 path.

### 2. Edit `catalogue.json`

Copy an existing collection of the right `kind` (keep `languages` and `downloadable`):

| `kind` | Required extras |
|---|---|
| `sehaj_paath` | `reciterId`, `scriptureId`, tracks with `durationSec` + `byteSize`, optional `startAng` |
| `audiobook` | tracks with `durationSec` + `byteSize`, optional `readAlongUrl` |
| `radio` | tracks (no `durationSec` / `byteSize`; live streams) |

Every `id` (author, reciter, scripture, collection, track, resource) must be unique across the whole file. New ids: `uuidgen`. `en` is required on every `L10nText`; add `pa` when you have it. No photos of Gursikhs.

If you add a reciter or scripture, add those objects too. Home V1 only lists `sehaj_paath` grouped by scripture. Resources go in `resourceSections` + `resources` (`sectionId`).

### 3. Bump version

Bump **both** `catalogue.json` `version` and `catalogue.version.json` to the same integer.

### 4. Push the catalogue repo

CI fills `byteSize` when missing (`scripts/fill-catalogue-bytesize.ts` HEADs the media URL) and Valibot-rejects invalid JSON. Cold start or Home pull-to-refresh picks it up.

App `.env`: `EXPO_PUBLIC_CATALOGUE_BASE_URL` (Pages) and `EXPO_PUBLIC_MEDIA_BASE_URL`. `EXPO_PUBLIC_USE_MOCK_CATALOGUE=1` stays on bundled `mock-catalogue.json` (no Pages). Restart Metro after changing.

---

## Title-only (no new audio)

Edit `catalogue.json`, bump version, push. Do **not** run `khajana:build-catalogue`. Re-tag / re-put R2 objects only if you need new ID3 on the files.

---

## Do not

- Change a published `trackId` / `collectionId` without a new R2 object and a new catalogue row.
- Guess `byteSize` from bitrate; omit it and let CI HEAD, or copy Content-Length from the put.
- Put Worker `X-App-Origin` on these public media URLs.
