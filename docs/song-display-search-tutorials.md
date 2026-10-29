# Song Display, Search and Tutorials

## Lyrics Only

Song pages and performance mode offer a Lyrics and Chords / Lyrics Only segmented control. It uses the existing structured sheet parser, never a capital-letter regex over lyric words. Whole musical rows, bass rows and tablature are omitted in lyrics mode. Inline chord markup and connector prefixes are already separated by the parser. Remaining horizontal spacing collapses, stanza breaks and section labels remain, and ordinary lyric text is escaped, not rendered as HTML.

Key, chord-diagram and capo controls are hidden in lyrics mode to free mobile space. Their state is not reset. Returning to chord mode preserves transposition, capo and the original column layout. Normal-page and standalone performance mode share the current selection. Playlist performance keeps its selection as songs change. New normal-page visits start with chords. No source song, review, favorite or saved playlist setting is modified by the display switch. Existing PDF exports still contain chords; no new lyrics-only PDF option is added.

## Permanent Search

One search field now sits in a 56px sticky strip above the guitar-neck header on every page. The home-page duplicate and mobile search-dialog trigger are removed. The existing compact mobile navigation remains. Music player offsets, mobile-menu limits and anchor scrolling account for the strip, while native fullscreen dialogs remain above it.

Search keeps the six-word/120-character bound, two-character minimum, 250ms debounce, cancellation, bounded responses and keyboard navigation. Escape also works from retry/result controls, outside focus closes results, and old responses cannot replace a newer query. Popups are fitted to the visible viewport, including its mobile visual viewport.

The server compares normalized titles and artist names directly rather than relying on import slugs. A parameterized Prisma SQL query uses PostgreSQL's built-in Unicode NFD normalization, removes combining marks and maps Serbian d-stroke to `dj`; no extension or schema change is needed. All terms must match. Exact titles and artist names rank ahead of prefixes and other matches; popularity breaks ties. Literal LIKE wildcards are escaped. Results contain at most 12 public metadata rows, never lyric bodies or account fields.

Reference: [PostgreSQL string functions](https://www.postgresql.org/docs/15/functions-string.html).

Read-only live audit with verified CA: Zeljko / Zeljko-with-caron / uppercase, Djordje / d-stroke spelling, Saban / S-caron, and Ruzo / z-caron returned identical ordered IDs in each group. Nine measured requests took about 117-127ms including the database round trip in this environment. This is an observation, not a latency guarantee. The audit used a repeatable-read read-only transaction and changed no rows.

```powershell
node scripts/check-search-db.cjs --ca "C:\path\to\certificate.crt"
```

## Curated How-to-Play Video

Each song may have one selected YouTube video or Shorts tutorial, distinct from the existing song-recording lookup. An admin adds/edits/removes it directly on the song page. Visitors see How to Play only when one is assigned. No automatic tutorial discovery or bulk assignment is performed. The table starts empty; users must choose appropriate lessons and verify that they teach the intended version.

Only exact HTTPS YouTube video hosts and 11-character video IDs are accepted. Playlist links, spoofed hosts, credentials, ports and script URLs are rejected. The video iframe is created only after an explicit action and destroyed on closing the dialog. It uses the privacy-enhanced YouTube embed host with native controls and no forced autoplay. An external YouTube link is always available because provider restrictions or a disabled embed may prevent playback. Video playback availability and teaching accuracy are not guaranteed by URL validation.

SongTutorial is a private one-to-one table containing the video ID, optional title, opaque revision UUID and audit fields. RLS is enabled with no policies or PUBLIC/anon/authenticated grants. Public reads use a whitelist DTO through the application API; audit fields are never returned. Add/edit/remove require fresh non-banned database admin status, same-origin JSON and another role check inside the serializable transaction. The song row is locked so competing writes serialize. Expected revisions reject stale saves/deletes; deletion and recreation use a fresh UUID to prevent an old edit matching a new record. Only the tutorial link is deleted, not the song or remote video.

```powershell
node scripts/setup-song-tutorials.cjs --ca "C:\path\to\certificate.crt"
node scripts/setup-song-tutorials.cjs --ca "C:\path\to\certificate.crt" --check-schema
node scripts/setup-song-tutorials.cjs --ca "C:\path\to\certificate.crt" --apply
```

Applied with user approval on 2026-10-29 UTC: a new empty SongTutorial table, independently verified afterward. Fingerprints of pre-existing application rows were unchanged. Backup: `reports/database-access/tutorials-2026-10-29T23-07-24-908Z.json` (ignored locally). Schema and regenerated Prisma Client must be present before code deployment.

## Verification

Parser, SQL construction, search, authentication, stale-write, client timeout and tutorial tests run with `node --test scripts/test-*.cjs`. Browser fixtures exercise both themes/languages at 320/390/820/1440px, sticky search, keyboard search/error/retry/Escape, chord-to-lyrics round trips, performance mode, tutorial creation/edit/removal, failed saves preserving input, public read-only controls and native dialog bounds. About-page anchors and links were also rechecked after adding the sticky strip.

Browser API writes were intercepted; QA did not change user accounts or playlists. YouTube network requests were blocked during fixture checks: iframe URL/lifecycle and external fallback were checked, not real video playback. Live SQL matching was checked separately through verified pg TLS. Full local Prisma-backed page end-to-end checks remain limited by the existing Windows TLS credential issue. No TLS verification was disabled, no deployment was performed and no song received a tutorial automatically.
