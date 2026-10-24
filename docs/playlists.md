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

`npm run test:playlists` checks read/write ownership, anonymous/banned/deleted accounts, private page/PDF denial, public read-only access, visibility revocation, canonical full-list PDF data, deterministic order, stale selections, payload limits, transactional deletion/reorder, retries and client failures. Tests mock the database and never mutate live playlists.

Browser QA exercises real PDF generation/download, privacy failure/retry, keyboard reorder failure/rollback, actual mobile tap/touch reorder, removal, public visitor view and 320/390/820/1366 px layouts in both themes/languages. The drag context has a stable playlist-specific ID so server/client accessibility IDs match without hydration warnings. The local production build compiles/types successfully but currently fails prerendering the preexisting `/top-50/domace` route due to the Windows Prisma TLS credentials error; TLS verification is not disabled.
