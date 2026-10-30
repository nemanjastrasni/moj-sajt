# Per-Playlist Key and Capo

Each owned playlist entry can have its own sounding transpose (-11..11) and
capo (0..12, or null for the source arrangement). The same song in another
playlist is independent. Original song content and favorite transpositions are
not changed by these settings.

## Workflow

- Adding a song through + Playlist captures the currently displayed sounding
  transpose and capo, both for existing target lists and a newly created list.
- Opening that song from its playlist loads the stored values. Key and capo
  changes save automatically, with saving/saved status in both song views.
  Rapid changes are serialized against acknowledged versions; a delayed response
  never replaces a newer preview. Reverting to the original values while a write
  is in flight also saves that reset after the first response.
- Performance mode uses the same per-entry values, not favorite settings.
  Next/previous navigation and Continue playing load the selected entry again.
- Performance controls and ordinary same-tab page links await all queued saves
  before navigating, without a discard prompt on success. A failed or uncertain
  save preserves the preview and only then asks before discarding it. A page
  reload/tab close still warns while a write is pending. Browser SPA history
  navigation is not universally interceptable, so pending changes are not a
  stored offline draft. Account/song/list switches abort the obsolete session.
- Playlist PDFs use the owner's saved arrangements. Single-song PDF exports use
  the current screen preview. Source capo null is distinct from physical fret 0.
- Private arrangements are not exposed to other viewers of a public playlist.
  They can experiment locally with original defaults, but cannot save changes
  into another account's list or see its stored key/capo.

## Storage and Authorization

`PlaylistSongSetting` is a separate private table with one row per playlist
entry, a pinned owner ID, transpose, nullable capo, monotonic version and update
timestamp. It references PlaylistSong with ON DELETE CASCADE, so removing an
entry/list removes its arrangement. Existing entries have virtual defaults
(transpose 0, source capo) without bulk inserts or edits.

The settings API verifies current membership and ownership. Writes recheck the
active, non-banned user inside a Serializable transaction. Entry ID plus version
prevents lost updates and stale writes after an entry is removed/re-added.
The pinned setting owner additionally prevents returning another account's
stored arrangement if the parent playlist owner changes externally.

Requests are validated and same-origin checked. Responses are private/no-store,
and acknowledgments must match IDs, values and the next version. Failed or
uncertain saves retain the preview and require loading the saved version before
another write, rather than blindly retrying an overwrite. Ambiguous source capo
headers reject converted saves. No musical correctness label is changed.

## Migration

Run the additive setup only with authorization:

```powershell
npm run playlists:settings:setup -- --ca "C:\path\supabase-ca.crt"
npm run playlists:settings:setup -- --ca "C:\path\supabase-ca.crt" --check-schema
npm run playlists:settings:setup -- --ca "C:\path\supabase-ca.crt" --apply
npx prisma generate
```

The schema test uses an isolated transactional schema and rolls it back. It
checks repeated DDL, bounds, optimistic version updates and cascading deletion.
The live setup compares full row hashes/counts of User, Artist, Song, SongReview,
Favorite, Playlist and PlaylistSong, and preserves any existing setting rows.

Approved setup applied on 2026-10-29. Local ignored metadata snapshot:
`reports/playlist-settings/setup-2026-10-29T18-05-08-990Z.json`.
Protected row hashes were unchanged. A fresh connection verified zero settings
rows, RLS enabled, no public policies and no PUBLIC/anon/authenticated grants.
Restart local development after Prisma regeneration if an older client is
cached; a fresh production deploy loads the regenerated client.

## Existing Security Finding

Inspection on 2026-10-29 found the existing public.PlaylistSong table with RLS
disabled and broad anon/authenticated grants. Those existing permissions were
not changed by this narrowly authorized migration. The new table's access is
restricted, but this is not a claim that existing playlist privacy or the whole
database is secure. Existing direct Supabase access and related policies need a
separate priority audit before assuming application-level privacy is sufficient.

## Verification

`npm run test:playlist-settings` covers automatic writes, coalesced changes,
queued versions, returning to original values during a write, uncertain results,
session cleanup, read-only previews, independent lists, defaults, ownership,
pinned ownership, public views, validation, concurrent/stale writes, revocation,
rollback, add/create capture, private PDF output and bounded client failures.

### Original Implementation Verification (2026-10-29)

The original browser fixtures exercised 16 theme/language/viewport combinations, save/reload,
normal original pages, two lists, conflict recovery, + Playlist capture,
performance next/previous, unsaved-change confirmation and non-owner views.
All API/session traffic in those browser checks was intercepted; no live user
arrangement was written. Temporary preview routes were removed afterward.

Physical-device, authenticated live user write and full production build checks
were not performed for this change. The real PostgreSQL schema checks and live
additive migration were verified separately. Git/deployment is required for
public use. Personal text notes are not included in this change.

Verification finished with 460 passing regression tests, TypeScript and targeted
ESLint checks. A generated owner playlist PDF was rendered and visually checked.
The running local server could not be restarted (process control returned access
denied); local database-backed checks may require a manual dev-server restart.
No process-permission escalation was attempted. Production deployment starts a
fresh process with the regenerated Prisma client.

### Autosave Verification (2026-10-30)

The autosave update passes all 536 regression tests, TypeScript and targeted
ESLint checks. A fresh production Next.js build from the real source finishes
successfully, including static generation and build traces. The build uses a
separate copy so browser verification cannot affect its output.

An isolated browser fixture uses the actual settings hook, song controls,
playlist navigation and performance view. It passed 16 combinations of theme,
language and viewport, covering rapid key changes followed immediately by Next,
restoration on Previous/reload, header Back while saving, separate lists,
original pages, capo persistence, entering performance while saving and
performance Previous/Next. A simulated conflict retained the preview and
required confirmation before discarding it; a non-owner view made no writes.
Successful navigation displayed no discard confirmation. Screenshots were
visually inspected. All API/session traffic was mocked and no live user
arrangement was written; physical-device and live Vercel checks remain separate.
