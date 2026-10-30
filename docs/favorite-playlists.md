# Favorites and song controls

## Data migration

The additive migration on 2026-10-30 copied three favorites belonging to one
account into a new private playlist named `Omiljene`. Their order and exact
saved transpositions were preserved. Capo settings start at `null`, meaning the
source song's capo; no capo choice was invented.

The `Favorite` archive, songs, reviews, user rows, existing playlists and existing
playlist settings were not changed. The local, Git-ignored backup is under
`reports/favorite-playlists/`. It contains favorite IDs and values, not passwords
or email addresses. Do not publish that folder.

`FavoritePlaylist` is a private mapping with RLS enabled, no public policies and
no grants to PUBLIC, anon or authenticated. Only server-side code accesses it.
The destination ownership is checked. Its unique user key makes conversion
idempotent; retries do not duplicate a list or overwrite later user edits.

Deleting the destination sets its mapping to null. The marker remains, so deleted
songs are not silently restored from the old archive. The explicit `Omiljene`
choice can create a new empty playlist. Existing lists with the same display name
are never merged merely by name.

The new app rejects legacy favorite mutation requests after conversion, with a
refresh message. The old `/favorite` route redirects to the destination playlist;
old favorites song links redirect to the corresponding playlist context.

## Deployment and audit

The database addition is already applied. Deploy the corresponding app changes
together. The currently deployed older app can still mutate its old Favorite
table until it is replaced; the migration does not install a global trigger that
would interfere with existing song deletion logic.

After deployment, rerun the read-only audit:

```sh
node scripts/migrate-favorite-playlists.cjs --ca "PATH_TO_VERIFIED_CA.crt"
```

Expected for this migration: zero pending users/songs and zero changed archives.
`--apply` only creates missing destinations. If an already-converted archive
changed, the script stops instead of guessing how to overwrite a user's current
playlist settings. Compare the backup and reconcile explicitly.

For a new account, choosing `Omiljene` in the add-to-playlist dialog creates a
private ordinary playlist through an authenticated, same-origin POST. The choice
then behaves like all other playlists, including ordering, PDF, visibility, key
and capo settings. No GET request creates a playlist.

## User interface

- A single toolbar above the title contains user controls. Display settings are
  in the settings dialog; video and error reporting are in the three-dot dialog.
- Admin edit/delete, review status and tutorial editing are below the title.
  Server-side admin checks and mutation authorization remain in place.
- There is no separate favorite star action. The playlist button has a yellow
  star when a song belongs to one of the signed-in user's own playlists. Other
  users' public playlists do not influence this state.
- Ordinary song visits start at the original key. Only an explicit playlist
  context loads and saves personal key/capo settings. Adding from the toolbar
  passes the current key and capo through the existing validated playlist API.
- Existing per-playlist autosave, version conflicts, navigation guards and PDF
  export remain in use. No change to the original song or its review status is
  caused by personal transposition.

About-page examples use invented account/song data, not live profile information.
