# Gurbani Paath Player — V1 roadmap

Work **one phase at a time**. Extra features (audiobooks, radios, filters, floating widget, web, CarPlay browse) stay out of V1; keep schema and modules ready for them. Locked stack: `.cursor/rules/architecture.mdc`. How-to: `.cursor/rules/`.

---

## Phase 0 — Types and mock catalogue

- Shared catalogue types + Valibot schema per `.cursor/rules/catalogue.mdc`.
- Check in a small mock `catalogue.json` (1–2 `sehaj_paath` albums, a few tracks with `durationSec`, `byteSize`, `startAng`, hero image URL, resources with `description`).
- No Sanity or R2 required yet; app reads the mock / a Pages URL behind a single catalogue module.

## Phase 1 — App shell, theme, i18n, first-run wizard

- App shell per `.cursor/rules/navigation.mdc` (slot mini player + Now Playing routes; wire UI in Phase 3).
- NativeWind, i18n (`en`, `pa`), theme, and three-step first-run wizard per `.cursor/rules/i18n-and-ui.mdc`.

## Phase 2 — Home and play an album

- Home: `sehaj_paath` grouped by scripture (title + image), then reciter-named collections. Cache `scripture.imageUrl` with `expo-image`.
- Catalogue refresh and disk cache per `.cursor/rules/catalogue.mdc`.
- Playback module per `.cursor/rules/playback.mdc` (play one album; per-album resume).

## Phase 3 — Now Playing and remote controls

- Mini player and Now Playing modal per `.cursor/rules/navigation.mdc`. Controls per `.cursor/rules/playback.mdc`. Simple mode layout.
- Lock screen + notification (+ car Now Playing from the native session).
- Keep screen on while playing (Settings toggle).

## Phase 4 — Paath helpers

- Bookmarks with optional notes (timestamp + album/track).
- Sleep timer and read along per `.cursor/rules/playback.mdc`.
- Library add/remove album. Library has a link to History in the header. History is a listen **log** of tracks (own MMKV store, not resume): latest first, duplicate rows allowed, cap 50 events. Record only when the current track identity changes, and skip if the newest row is already that track. Main label is the track title; muted line is reciter + scripture for `sehaj_paath`, or collection title otherwise, plus a local-timezone start time. Newest row: Playing (open Now Playing) while that track is playing/buffering; resume time + play from position when paused mid-track; ended/start-of-track and older rows play from 0.
- Resources screen grouped by `ResourceSection`, including gurbanisewa thanks.

## Phase 5 — Downloads and Offline mode

- Batch and per-track downloads, react-native-notify-kit progress, offline mode — per `.cursor/rules/playback.mdc`.

## Phase 6 — Optional cloud sync

- Settings only: Sign in with Google.
- Sync app state including preferences, history, bookmarks, library, per-album resume locations (and rates) and wanted-offline ids.
- Merge last-write-wins (`updatedAt`). Never gate playback on an account.

## Phase 7 — Sharing

- Paths: `/a/{albumId}` and `/a/{albumId}/t/{trackId}`.
- Native share sheet. Custom scheme first; HTTPS Universal Links / App Links when the domain is ready.
- Opening a link plays that album/track (stream if not downloaded).

## Phase 8 — Publish pipeline (not store listing yet)

- Edit `catalogue.json` in `gurbani-paath-player-catalogue`; GitHub Actions fills missing `byteSize`, Valibot-validates, Wrangler-uploads to Pages. Sanity Studio is optional later.
- Upload audio/images to R2 (`audio/{collectionId}/{trackId}.mp3`, hero on `images/`).
- App icons, splash.

## Phase 9 — Consent OTA (JS only)

- Self-hosted `expo-updates` (see `EAS_UPDATE_PROPOSAL.md`). `checkAutomatically: NEVER`.
- Prompt: Applying the update will stop playback and downloads, so before updating, check whether any playback or downloads are in progress. If playback or downloads are in progress, confirm with the user, then persist the resume state, stop playback, cancel in-flight downloads, and apply the update. If no playback or downloads are in progress, apply the update without confirmation.
- Does **not** replace the Cloudflare Pages catalogue.

---

## Later (not V1)

- Audiobooks and radios (`kind`).
- Languages / scripture filters.
- Android floating widget, Siri/Gemini beyond MediaSession play-pause.
- Web version without offline features.
- Car dashboard browse/queue
- Add to home screen (album(resumes), track(resumes or streams))
- Option to share mp3 file directly for downloaded tracks (update mp3 name to human friendly before sharing)
- build app in cloud with Github actions
- support for Google Cast and AirPlay 

