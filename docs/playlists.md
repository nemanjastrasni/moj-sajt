# Chord Playlists: PDF and Visibility

The existing `/plejliste/[id]` user playlist now has PDF and Public/Private controls next to its title. This does not change listening playlists or the separate Favorites songbook builder.

## Behavior

- PDF exports every song in the current saved order, using canonical database lyrics even if the songs are not favorites. It creates a cover named after the playlist, clickable contents and numbered A4 pages. Songs use their original keys. Existing single-song PDF export still follows that song's screen transpose.
- PDF limits remain 100 songs, 100,000 characters per song, 1,500,000 total lyric characters, 3.8 MB response and 500 pages. Oversized lists are rejected explicitly, never truncated or silently partially exported.
- The API compares the displayed song IDs/order with the current database list. If another tab changed it, refresh is required before export.
- Personal playlists start private. Only the owner can view/export a private list. Public lists are viewable/exportable by anyone with the link, without requiring sign-in. There is no new public directory in this change.
- Only the current non-banned owner can change privacy, rename, add/remove songs, reorder or delete a playlist. Public visitors get read-only rows. These checks apply to legacy remove/reorder endpoints too, not only to hidden buttons.
- Previously downloaded PDFs cannot be recalled by making a playlist private. New page/API requests recheck current privacy; PDF JSON responses are private/no-store, and custom playlist pages are dynamic/noindex.
- Failed saves do not update the visibility label; failed reorder restores the old display. Mutations and PDF export cannot run concurrently in the same editor. Drag handles support touch/pointer and keyboard operation, without blocking scrolling outside the handle. Download links remain available for browsers blocking automatic downloads.
- Empty playlists stay visible in My Playlists, under their chosen category or Mix.

## Playlist Management and Difficulty (2026-10-25)

- My Playlists has create, name search, visibility badges, rename and confirmed delete. The playlist page itself has rename/delete and an inline song/artist search for adding songs. Lists can mix song categories. GET `/api/playlist` is read-only: opening a menu no longer creates a default Mix list.
- Song-page playlist controls use checked, bounded requests. Failed add/create/rename/delete stays visibly failed rather than closing a dialog or showing a false success. Reopening the picker reloads current lists, including newly created ones. Dialogs use native modal focus/Escape behavior and theme-aware controls.
- Drag reorder sends `expectedOrder`, including the exact original nullable positions. The transaction compares this snapshot as well as membership before writing, so a stale second tab receives 409. Old clients without a snapshot must refresh. No new database column/migration is needed.
- Generated lists and artist song rows use the shared sheet/chord parser, not capital-letter regexes or the legacy default `Song.difficulty = beginner`. Root/bass spelling and equivalent interval sets are normalized for counting. Bass runs are excluded from chord counts, and lyric words/tab lines are not treated as chord symbols. Separate `chords` data is a fallback when displayed lyrics contain no recognized chords.
- Five automatic levels are `very_easy`, `easy`, `medium`, `hard`, `very_hard`. Up to 3 basic open chords starts at very easy; 4-5 chords at easy; 6-8 at medium; 9-11 at hard; 12+ at very hard. Other familiar open shapes raise the minimum to easy, common barre shapes to medium, slash/diminished/augmented and more extended shapes to hard, alterations/11ths/13ths or at least 4 demanding shapes to very hard. These are estimates, not proof of musical difficulty or correctness: rhythm, tempo, fingering, solos and performance are unknown. Lyrics-only/unrecognized songs are explicitly unassessed. Existing stored difficulty values and manual review statuses are not rewritten.
- The public catalog offers the five levels, up-to-four-chord and basic-open-chord selections, and the three real geographic categories. Unsupported Rock/Pop pseudo-links were removed because the database has no genre metadata. Legacy generated/category routes redirect to the working catalog; empty filters never substitute unrelated songs. Pages contain at most 50 songs, and Back retains validated catalog page/category filters.
- Songs I Can Play now reads the current user's actual skill: beginner includes the first two levels, intermediate the first three, advanced all five. It does not trust legacy song difficulty defaults.
- Public catalog pages cache only 50 metadata/level results for 60 seconds, never user data or complete lyric bodies. Song edits, deletion, artist changes and approved submissions invalidate the catalog tag. Direct database imports become visible on the next cache refresh.
- Read-only live audit: 9,351 songs; 9,333 old `beginner` values. Estimates: 400 very easy, 646 easy, 6,419 medium, 1,240 hard, 569 very hard, 77 unassessed. Run `node scripts/audit-song-difficulty.cjs --ca path/to/certificate.crt` to recount. The script issues `BEGIN READ ONLY` and never writes songs or marks them verified.
- Performance/fullscreen mode, saved per-playlist transpose/settings and subscriptions remain separate future work. Playlist PDFs still use original keys.

## Database Setup

`Playlist.isPublic` is a non-null Boolean with default false. Run `prisma/sql/playlist-privacy.sql` before deploying this code, or use:

```powershell
node scripts/apply-playlist-privacy.cjs --ca "C:\path\to\supabase.crt"
node scripts/apply-playlist-privacy.cjs --ca "C:\path\to\supabase.crt" --apply
```

The CLI uses the existing secure pg connection helper, checks the existing column, locks playlist writes briefly, saves an ignored local backup, and verifies rows and song-link counts before commit. It never deletes songs, users, lists or links. The SQL is idempotent: only when adding the column, existing curated `isAdmin` lists become public; other existing lists start private. Re-running it does not reset users' later choices.

Applied to the configured Supabase database with user approval on 2026-10-24 UTC: 14 personal playlists private, 0 public, all 161 song links retained. Backup: `reports/songbook/playlist-privacy-2026-10-24T21-59-09-270Z.json`. Access enforcement takes effect when the new code is deployed; an older deployment does not know the new flag.

Generate the Prisma client after the schema change. No new runtime dependency is needed.

## Verification

2026-10-25 playlist-management QA: 16 fixture layouts (owner, public visitor, personal lists, empty state across 320/390/820/1366 px and both themes/languages), plus failed/retried rename, add, create and delete, privacy switch, keyboard reorder failure/rollback and success, picker reload after creation, name filtering, dialog focus/Escape, and catalog index links. Browser API responses were intercepted; no production user/list was changed. The real database was read separately through verified TLS for the aggregate difficulty audit. Local Prisma-backed end-to-end page verification remains limited by the existing Windows TLS credential error.

`npm run test:playlists` checks read/write ownership, anonymous/banned/deleted accounts, private page/PDF denial, public read-only access, visibility revocation, canonical full-list PDF data, deterministic order, stale selections, payload limits, transactional deletion/reorder, retries and client failures. Tests mock the database and never mutate live playlists.

Browser QA exercises real PDF generation/download, privacy failure/retry, keyboard reorder failure/rollback, actual mobile tap/touch reorder, removal, public visitor view and 320/390/820/1366 px layouts in both themes/languages. The drag context has a stable playlist-specific ID so server/client accessibility IDs match without hydration warnings. The local production build compiles/types successfully but currently fails prerendering the preexisting `/top-50/domace` route due to the Windows Prisma TLS credentials error; TLS verification is not disabled.
