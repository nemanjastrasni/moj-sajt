# Admin Shortcuts on Public Content Pages

## Controls

- Song pages render Edit song and Delete song below their title actions, only for a current non-banned database admin. Edit opens the existing song editor directly, with a back link and automatic return to the saved song's canonical URL. Changing artist/category does not send the admin back to a stale URL.
- Artist song listings, biography pages and the alternate artist info page render Edit artist and, if biography text exists, Delete biography. Edit covers name, category, photo, biography and discography. Save returns to the originating artist/biography/info view; opening from the admin list retains list filters.
- Delete uses a native modal dialog with focus trapping, Escape/cancel support and an exact-name confirmation. Failed requests keep the dialog and display the error. No optimistic removal is shown before server success.
- Song deletion reuses the existing transactional service: song favorite/playlist references are removed, but the artist, other songs and the playlists themselves remain. Successful deletion returns to that artist's song list.
- Biography deletion clears only `bio` and `bioShort`. It never deletes the artist, albums, photo, member data or songs.
- Admin Users now has a confirmed Set as admin / Remove admin action. It cannot change one's own role, a banned account or an unsupported role. Own-account Ban is hidden. Role writes require the expected previous role to prevent silently overwriting a change made in another tab. The existing session callback refreshes roles from the database, so updated permissions are picked up on subsequent session checks without changing passwords.

## Validation and Security

- Server-rendered controls call the same fresh-admin check as the protected API. Hiding buttons is not authorization. Artist edit/delete and role changes recheck the actor within a serializable database transaction, including revocation between initial authorization and mutation.
- Artist edit/delete requests carry a SHA-256 version of editable artist content. Stale edits/deletions return 409. Hashing is stable across PostgreSQL JSON key reordering.
- The editor retains structured discography arrays and extra album metadata. Malformed JSON is rejected, never silently saved as broken text. Plain one-album-per-line data is also accepted. Empty input deliberately clears discography; deleting a biography does not.
- Artist slugs stay unchanged. If category changes, that artist's song categories move atomically with it; unrelated artists/songs are untouched. Existing photo URL validation permits same-site paths or HTTPS URLs.
- The legacy artist PATCH API uses the checked service too. Existing artist create, whole-artist delete and merge server actions independently require a fresh admin instead of relying only on the layout.
- Return destinations are enumerated (`song`, `artist`, `bio`, `info`), with paths generated from saved records. No arbitrary return URL is accepted from the query string.
- JSON mutation requests retain same-origin checks, bounded bodies, safe errors and bounded serialization retries. No schema migration, dependency install or production data change is required for this feature.

## Entry Points

- `PATCH /api/admin/artists/[id]`: validated artist edit.
- `DELETE /api/admin/artists/[id]`: biography-only deletion, with name/version confirmation.
- `PATCH /api/admin/users/[id]/role`: confirmed role update (`role`, `expectedRole`, `confirmed`).
- Existing song edit/delete API responses now include the canonical return path; existing clients remain compatible.

## Verification

Run `npm run test:admin-content`. Tests use mocked authentication/database transactions, including ordinary/banned/deleted users, forged session roles, direct API access, stale versions, unchanged album metadata, rollback, role revocation, self-demotion protection and safe redirects. Existing admin-song tests cover actual song cleanup and authorization.

Browser QA covers the real SongClient toolbar and edit forms, typed confirmation/cancel/focus, failed deletion/retry, malformed and stale artist saves, preserved album metadata, return navigation and confirmed role changes. Modal layout is verified at 320/390/820/1366 px in both themes. No live content or user accounts are modified by QA.
