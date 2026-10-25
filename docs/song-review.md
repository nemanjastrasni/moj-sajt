# Admin Song Review Status

## Workflow

Only an active admin sees the review control below the song title/admin actions, the status column/filter in Admin Songs and review badges beside songs on an artist's song-list page.

- `unreviewed`: Not reviewed. This is also the meaning of a missing review record; new/imported songs are not declared wrong or correct automatically.
- `needs_fix`: An admin has identified a problem to fix.
- `manually_corrected`: An admin has corrected lyrics/layout/chord positions, but musical accuracy has not yet been confirmed by playing the song. The label is "Ispravljeno rucno" / "Manually corrected", distinct from Verified.
- `verified`: An admin has checked both layout and musical accuracy.

Open a song, inspect its lyrics/chord positions, and choose a status. Fix content through the existing editor, then check the rendered song before choosing Verified again. The admin list filter combines with search, artist, letter, category, sort and pagination. Icons and explicit labels distinguish the states without relying only on color.

The artist song list reads review status in one batched query only after fresh non-banned admin authorization. Anonymous/ordinary/banned/deleted visitors receive the normal song list without badges or review queries. Missing records are shown as Unreviewed to admins. These badges show saved manual marks, never automatic audit classifications. The public page stays force-dynamic; review metadata is not added to public Song selects. Mobile badges wrap below their song title, with desktop badges alongside it.

This is a manual review workflow, not an automatic claim that the chords are musically correct. No bulk automatic verification or heuristic classification is performed by this change.

## Persistence and Reset

`SongReview` is a private, optional one-to-one relation with Song: status, reviewing admin ID and timestamp of the latest mark. It is not a scalar field returned automatically by public song API queries. RLS is enabled with no public REST policies. Ordinary visitors never receive the control or its review data, and cannot call the status write API.

The PostgreSQL trigger `Song_review_content_reset` removes the previous review when actual `lyrics` or `chords` values change. Missing review then means Unreviewed. It covers admin edits, raw SQL and external import/cleanup scripts using the same database. Changing only title, category, difficulty, popularity or views does not reset the status. Rewriting exactly the same lyrics/chords retains it; whitespace changes and NULL/empty-string transitions reset it. Deleting a song cascades to its review record.

The existing song editor preserves an untouched NULL chord field when its displayed input is empty, avoiding an accidental reset during a metadata-only save.

The endpoint `PATCH /api/admin/songs/[id]/review` validates status, expected previous status and a SHA-256 fingerprint of the displayed lyrics/chords. Stale content or another admin's status change returns 409 instead of marking unseen content. The transaction checks current non-banned admin rights, locks the Song row before reading/upserting the review, and uses Serializable isolation with bounded retries. The row lock also prevents a race with importers using a lower transaction isolation level.

Client controls update only after a confirmed success, retain the old mark on failure and provide refresh for stale views. The server, not the request body, supplies reviewer identity/time. API responses are private/no-store.

## Database Setup

The schema and SQL add a separate table, a status check constraint, index and reset trigger. Existing musical content is untouched. The setup CLI uses the existing verified-TLS pg connection helper and an ignored local backup, locks song writes briefly, and compares count/content digest plus existing review records before committing. Reapplying preserves manual marks.

The four-state extension replaces only the status check constraint to allow `manually_corrected`; no new Prisma fields/client generation are needed. Run the same setup CLI before deploying the new app. The transaction also reapplies the unchanged reset trigger/RLS setup; existing song content and every review record must compare identical before commit. A rollback to a three-state constraint must not be attempted while manual-correction records exist.

```powershell
node scripts/apply-song-review.cjs --ca "C:\path\to\supabase.crt"
node scripts/apply-song-review.cjs --ca "C:\path\to\supabase.crt" --apply
```

Applied to the configured Supabase database with user approval on 2026-10-25: all 9,351 songs retained unchanged, zero records automatically marked Verified. Backup: `reports/song-reviews/setup-2026-10-25T12-14-58-961Z.json`. Initial Unreviewed status is implicit, not a mass update to songs. Deploy the new app after setup and regenerate Prisma Client. No new dependency is required.

Four-state extension applied with explicit user approval on 2026-10-25: 9,351 songs preserved, 0 existing review records, no automatic marks. Backup: `reports/song-reviews/setup-2026-10-25T13-17-37-224Z.json`. Deploy the updated app to make the new status and artist-list badges visible.

## Verification

- `npm run test:song-review`: validation, current admin authorization, actor/timestamp integrity, content and status conflicts, missing songs, row lock/retries, rollback, privacy, filters and link preservation. Tests mock database writes and never review real songs.
- `node scripts/check-song-review-db.cjs --ca "C:\path\to\supabase.crt"`: opt-in real PostgreSQL regression using only temporary tables/functions and a rolled-back transaction. Covers trigger reset, NULL changes, identical updates, title/category/popularity preservation, cascade deletion and idempotent setup.
- Browser QA covers success/failure/retry, invalid-success rejection, stale-content denial, all statuses, translation, badges/filter/pagination and 320/390/820/1366 px layouts in both themes. The PDF/public song content is not modified.
