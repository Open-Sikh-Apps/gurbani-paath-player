# Gurbani Paath Player — V1 roadmap

Work **one phase at a time**. Extra features (audiobooks, radios, filters, floating widget, web, CarPlay browse) stay out of V1; keep schema and modules ready for them. Locked stack: `.cursor/rules/architecture.mdc`. How-to: `.cursor/rules/`.

---

## Phase 0 — Types and mock catalogue

- Shared catalogue types + Valibot schema per `.cursor/rules/catalogue.mdc`.
- Check in a small mock `catalogue.json` (1–2 `sehaj_paath` albums, a few tracks with `durationSec`, `startAng`, hero image URL, resources with `description`).
- No Sanity or R2 required yet; app reads the mock / a Pages URL behind a single catalogue module.

## Phase 1 — App shell, theme, i18n, first-run wizard

- App shell per `.cursor/rules/navigation.mdc` (slot mini player + Now Playing routes; wire UI in Phase 3).
- NativeWind, i18n (`en`, `pa`), theme, and two-step first-run wizard per `.cursor/rules/i18n-and-ui.mdc`.

## Phase 2 — Home and play an album

- Home: Maharaj’s saroop + `sehaj_paath` grid (reciter names, no portraits). Cache `heroImageUrl` with `expo-image`.
- Catalogue refresh and disk cache per `.cursor/rules/catalogue.mdc`.
- Playback module per `.cursor/rules/playback.mdc` (play one album; per-album resume).

## Phase 3 — Now Playing and remote controls

- Mini player and Now Playing modal per `.cursor/rules/navigation.mdc`. Controls per `.cursor/rules/playback.mdc`. Simple mode layout.
- Lock screen + notification (+ car Now Playing from the native session).
- Keep screen on while playing (Settings toggle).

## Phase 4 — Paath helpers

- Bookmarks with optional notes (timestamp + album/track).
- Sleep timer and read along per `.cursor/rules/playback.mdc`.
- Library add/remove.
- Resources screen grouped by `ResourceSection`, including gurbanisewa thanks.

## Phase 5 — Offline downloads

- Batch and per-track downloads, Notifee progress, offline banner — per `.cursor/rules/playback.mdc`.

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
- App icons, splash.

---

## Later (not V1)

- Audiobooks and radios (`kind`).
- Languages / scripture filters.
- Android floating widget, Siri/Gemini beyond MediaSession play-pause.
- Web version without offline features.
- Car dashboard browse/queue
