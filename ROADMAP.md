# Gurbani Paath Player — V1 roadmap

Work **one phase at a time**. Extra features (audiobooks, radios, filters, floating widget, web, CarPlay browse) stay out of V1; keep schema and modules ready for them.

Locked stack: Expo SDK 57, Expo Router, Zustand + MMKV, i18next, Valibot, **NativeWind v5** (Tailwind CSS v4 + `react-native-css`), **`expo-audio` playlists**, R2+CDN for media, Cloudflare Pages for catalogue JSON, Sanity **editor-only**, optional Google Sign-in/firebase sync in Settings, `@kesha-antonov/react-native-background-downloader` + Notifee. No EAS. See `.cursor/rules/`.

---

## Phase 0 — Types and mock catalogue

- Shared types: `L10nText`, `L10nUrl`, `Author`, `Reciter`, `Scripture`,`SehajPaathTrack`, `AudiobookTrack`, `RadioTrack`, `Track`, `Collection`, `ResourceSection`, `ResourceItem`, `Catalogue`.
- Check in a small mock `catalogue.json` (1–2 `sehaj_paath` albums, a few tracks with `durationSec`, `startAng`, hero image URL, resources with `description`).
- No Sanity or R2 required yet; app reads the mock / a Pages URL behind a single catalogue module.

## Phase 1 — App shell, theme, i18n, first-run wizard

- Expo Router tabs: Home, Library, Settings.
- Install NativeWind v5 per `.agents/skills/expo-tailwind-setup/SKILL.md`. Primitives in `src/tw/`. Tokens (light/dark) in CSS `@theme`. Simple mode spacing/type via those tokens. Screens use `className` on `@/tw` wrappers — no `StyleSheet.create`.
- i18next dictionaries (`en`, `pa`) bound to MMKV. System language and theme on first launch.
- Two-step wizard on fresh install only: **language**, then **Simple mode**. Changeable later in Settings.

## Phase 2 — Home and play an album

- Home: Maharaj’s saroop (`heroImageUrl`) + FlashList/grid of Gursikh albums (reciter names only, no portraits). Cache `heroImageUrl` to disk with `expo-image`.
- Catalogue version check (cold start, pull-to-refresh, overflow Refresh). On mismatch, fetch `catalogue.json` and **save it on disk**. Read the disk cache on launch and when offline.
- Playback module: `PlayerEngine` interface + `expo-audio` adapter. Queue the selected album only; persist `{ trackId, positionSec }` **per album**.
- Playing another album must not erase the first album’s resume point.

## Phase 3 — Now Playing and remote controls

- Now Playing UI: prev / next / −30s / play-pause / +30s; Simple mode layout.
- Lock screen + notification (+ car Now Playing from the native session).
- Keep screen on while playing based on Settings.

## Phase 4 — Paath helpers

- Bookmarks with optional notes (timestamp + album/track).
- Sleep timer: end of track, remaining tracks through end of album, or hours+minutes.
- Library add/remove.
- Read along button → `https://sttm.co/{currenScripture.sttmCoSlug}/{currentTrack.startAng}`.
- Resources screen grouped by `ResourceSection`, including gurbanisewa thanks.

## Phase 5 — Offline downloads

- Batch album or per track download with re-attach after process death.
- One consolidated Notifee progress notification for every batch album download. Keep separate notifications for individual track downloads.
- Prefer local file when present; offline banner when the network is gone.

## Phase 6 — Optional cloud sync

- Settings only: Sign in with Google.
- Sync library, per-album positions, bookmarks, Simple mode, language, theme, wanted-offline ids.
- Merge last-write-wins (`updatedAt`). Never gate playback on an account.

## Phase 7 — Sharing

- Paths: `/a/{albumId}` and `/a/{albumId}/t/{trackId}`.
- Native share sheet. Custom scheme first; HTTPS Universal Links / App Links when the domain is ready.
- Opening a link plays that album/track (stream if not downloaded).

## Phase 8 — Publish pipeline (not store listing yet)

- Sanity Studio for editing; webhook writes `catalogue.json` + version file to Pages.
- Upload audio/images to R2 (`audio/{collectionId}/{trackId}.mp3`, hero on `images/`).
- App icons, splash, local release builds (Xcode / Play Console). No EAS.

---

## Later (not V1)

- Audiobooks and radios (`kind`).
- Languages / scripture filters.
- Android floating widget, Siri/Gemini beyond MediaSession play-pause.
- Web version without offline features.
- Car dashboard browse/queue
