# Admin Song Maintenance

The canonical song list is `/admin/songs`; creation is `/admin/songs/new`, editing is `/admin/songs/[id]/edit`. The old `/admin/edit` list and `/admin/songs/[id]` form redirect to these routes, retaining supported filters. There are no unauthenticated song-writing server actions or forms targeting the nonexistent `/api/admin/song` endpoint.

## Access And API

The admin layout and song endpoints verify the current database account's role and ban status using the existing submission authorization helper. The layout no longer relies on a hardcoded email. A forged/stale session role does not grant write access. The existing middleware still provides its early admin-route gate; mutations independently authorize on the server.

- `POST /api/admin/songs`: one artist/category and 1-20 song drafts. The complete validated batch commits in one serializable transaction, with at most two serialization retries. Partial success is never returned as HTTP 201.
- `PATCH /api/admin/songs/[id]`: validates title, artist/category, lyrics and optional separate chord data. Existing slugs are retained when titles change. Moving to another artist is rejected if it would collide with an existing slug/title.
- `DELETE /api/admin/songs/[id]`: requires the exact current song title in its JSON body. A renamed song returns 409 and must be reviewed again before deletion. The old `/api/admin/[id]` DELETE is an alias with the same checks. The former POST update endpoint also uses the authenticated JSON PATCH handler.
- `GET /api/admin/songs`: authenticated, filtered and paginated; never returns the entire catalog.
- Artist autocomplete uses authenticated, case-insensitive, literal substring matching, a 12-result limit, minimal identity/category fields and no-store responses. Name-only legacy lookup remains available.

Mutation requests reject cross-site origins, non-JSON bodies, malformed JSON and bodies exceeding 600 KB. Individual lyrics/chord fields allow at most 100,000 characters. Titles and artist names are bounded; empty drafts and same-title duplicates in a batch are rejected. Lyrics-only songs are supported, not forced through the more restrictive public submission rules. Newlines are normalized, but leading spaces, tabs, chord columns and trailing whitespace/newlines are preserved.

The client handles errors, network failures and a 20-second deadline without clearing inputs or reporting success. A timeout can occur after server commit, so the error directs the administrator to check the list before retrying. The same-artist duplicate-title check also protects against an accidental repeated create request. This is not a durable idempotency-key protocol.

## Artist Metadata And Deletion

Selecting an existing artist never writes their biography, discography, photo, name, category or members. Artist metadata is edited through its existing dedicated panel. Optional biography/discography fields on the new-song form apply only when an artist is actually created. Category conflicts and ambiguous names require explicit correction/selection, not silent reassignment. Slugs use the shared diacritic-aware helper, per-artist uniqueness and bounded collision suffixes; names without a Latin slug receive an opaque generated fallback rather than an empty URL segment.

Deletion first removes only the selected song's Favorite/PlaylistSong links and clears its SongSubmission published-song references, then deletes the Song, all in one transaction. Playlists, artists, other songs, submission history and listening playlists are not deleted. Failure rolls back link cleanup. The confirmation names the exact song/artist and explains the irreversible removal from favorites/playlists; failed requests keep the dialog open.

The list combines filters rather than overwriting artist filters, escapes LIKE wildcards, bounds malformed/out-of-range pages, uses deterministic ordering and renders at most seven numbered page links. Mobile rows stack instead of forcing the whole page to scroll sideways. The existing light admin workspace remains; styles have explicit readable form/control colors under either surrounding site theme. Song entry/editing uses a monospace non-wrapping textarea and the existing production SongSheet preview.

## Verification

`npm run test:admin-songs` covers validation/layout retention, fresh authorization, CSRF/body checks, atomic rollback, existing-artist preservation, ambiguity/category/duplicate conflicts, slug handling, edits, stale/missing deletion confirmation, dependent-link cleanup/rollback, bounded queries, autocomplete, cache failure after commit, client failure responses and deadlines. These tests use isolated in-memory database doubles; no production songs/users/favorites were created or removed for testing.

All 174 focused project regression tests, TypeScript and targeted changed-module lint passed. Browser QA used the actual list/form/delete components with intercepted API writes, including keyboard artist selection, batch add/remove, preview, failed-save input retention, edit success, delete cancel/error/retry, bounded pagination and 1366/820/390/320px viewports under both surrounding themes. The temporary preview route was removed. Local HTTP checks confirmed unauthenticated song/legacy-delete/artist endpoints return 401 and the admin page redirects to sign-in.

No schema changes/migrations, production data mutations, Git push or deployment were performed. A full production build and a real authenticated production-database write/delete were not run; the existing local Windows Prisma TLS issue remains outside this change. Commit/deploy is required for the updated panel to appear on the public site.
