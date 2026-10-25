# Personal Favorite Keys

## Behavior

- `Favorite.transpose` is a per-account integer from -11 to +11 semitones, relative to the original sheet. It defaults to 0. Song lyrics/chords and review marks are never changed by this feature.
- Opening a song from the catalog, artist page, search, a normal playlist or a direct URL always starts at 0. Loading that original view does not save or reset the user's favorite. An explicit transpose/reset click saves the displayed value only when the song is already a favorite.
- Favorites use `?from=favorites` links. This marker requests the current authenticated user's saved key from a private/no-store API; the URL never contains the saved key or a user ID. The song's Back target is `/favorite`. An explicit playlist context takes precedence and stays in the original view until playlist-specific settings are implemented.
- Adding a new favorite stores the currently displayed key. Re-adding an existing favorite is idempotent and does not overwrite another tab's saved key. Removing the favorite removes its setting too, without deleting the song.
- Rapid clicks update the local value synchronously and serialize/coalesce writes. Each save includes the exact favorite ID and expected previous key. A stale tab, changed key, or removed/recreated favorite cannot silently overwrite newer settings. An in-flight save and the latest pending value can finish during a client-side transition; updates for an old component/account do not publish into its replacement UI.
- A save is shown as saved only after a checked server response. On network, authorization or conflict failure the displayed key remains usable, but automatic saves stop and an explicit Load Saved Key control reloads the canonical favorite. During pending writes the browser warns before a full page exit; PATCH requests use keepalive. Users should wait for the saved confirmation before closing the browser. This is not offline synchronization.
- Personal data is never passed into public song-page HTML. Account/song/view changes start fresh, and direct-to-favorite transitions use a distinct React key. Anonymous visitors may transpose for the current page but cannot save; the favorite button opens sign-in.
- Favorite lists show nonzero saved offsets. Newly selected entries in the Favorites PDF builder default to those offsets. Existing book draft choices remain unchanged, and book-specific offset edits do not change the favorite. A single-song PDF follows the currently displayed key as before. Playlist PDF keys remain unchanged in this step.

## API and Security

- GET `/api/favorite/check?songId=...` returns only `{ isFav, favorite: { id, transpose } | null }` for the current non-banned account. Anonymous/banned/deleted users receive no personal setting. No user identifiers are logged by this endpoint.
- PUT `/api/favorite` idempotently adds a favorite; legacy POST toggle remains supported. DELETE is idempotent and optionally checks `favoriteId` to protect against a stale removal. New UI uses PUT/DELETE, not toggle races.
- PATCH `/api/favorite` checks the authenticated owner and current non-banned relation in the atomic update. It never trusts a submitted user ID. Mutations validate origin, JSON size/type, song/favorite IDs and integer offsets. Add/delete use serializable transactions with bounded retries. Failed popularity increments roll back a newly created favorite.
- Responses are private/no-store with `Vary: Cookie`; failures do not expose database messages or report successful empty data.

## Database Deployment

Run before deploying the new Prisma client:

```powershell
node scripts/apply-favorite-transpose.cjs --ca "C:\path\to\supabase.crt"
node scripts/apply-favorite-transpose.cjs --ca "C:\path\to\supabase.crt" --apply
npx prisma generate
```

The opt-in script uses verified TLS, a short table lock and a local ignored backup. It adds only the column and its range constraint, rejects an incompatible existing column, verifies all favorite identities/links/timestamps with a metadata hash, and preserves existing offsets on reruns. It does not update songs, users, playlists or reviews.

Applied with user approval on 2026-10-25 UTC: all 3 existing favorites retained, initial offsets 0. Backup: `reports/songbook/favorite-transpose-2026-10-25T19-03-27-411Z.json`. The prior site deployment remains compatible with the added column; the new behavior requires deploying this code.

## Verification

- `npm run test:favorite-transpose`: ownership, bans/deletion, stale-key/identity guards, strict values, original-data preservation, explicit reset, idempotent add/delete, atomic rollback, legacy toggle, cross-site and malformed requests, safe failures and checked client responses.
- Song-page navigation tests cover explicit Favorite entry, original/artist/playlist defaults and safe Back targets.
- The migration was executed twice against a temporary table through verified TLS, checking default 0, preservation of a nonzero setting, range rejection and rollback. No real user's key was modified for testing.
- Browser QA uses the real SongClient and hook with intercepted API responses and two fixture accounts. Live authenticated local Prisma queries are limited by the existing Windows TLS credential issue. Prisma generation hit a locked Windows engine DLL; the generated TypeScript and runtime model were verified to contain the new field, while the existing engine was left intact. A fresh Vercel deployment regenerates the client normally.
- Browser checks passed for original vs Favorites restoration, same-song context transition, serialized rapid clicks and range limits, separate accounts, read/write failure and explicit recovery, stale-tab conflict, reset, remove/re-add, anonymous temporary transposition, and 320/390/1366 px layouts in both themes/languages. No page errors or horizontal page overflow were detected.
