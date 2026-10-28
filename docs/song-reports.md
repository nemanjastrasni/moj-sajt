# Song Error Reports

Signed-in, non-banned users can report a wrong chord, chord layout, lyrics or
duplicate from a song page. Reports are private: only administrators can list
them under `/admin/prijave`, add a note and mark them pending, resolved or
dismissed. Dismissal requires a reason. No report action changes a song, its
review status, favorites or playlists.

## Safeguards

- At most 10 submissions per account in a rolling 24-hour window, including
  already resolved or dismissed submissions.
- One pending report per account, song and category; a partial unique database
  index also enforces this restriction during concurrent requests.
- The server verifies the song content version before accepting a report and
  captures the displayed transpose offset, title and artist name.
- Admin updates use version checks to prevent overwriting another admin's work.
- Request bodies are size-limited, validated and checked for same-origin use.
  Descriptions and notes are plain text, never interpreted as HTML.
- Database RLS is enabled with no public policies or grants to PUBLIC, anon or
  authenticated. Server routes separately authorize the current database user.

## Data and Privacy

Reports contain account/song references, descriptions, moderation notes,
timestamps, title/artist snapshots and a song-content hash. They do not copy
email addresses, song lyrics or IP addresses. The administrator can see the
reporter's current display name.

Deleting an account or song clears its foreign key but retains the report and
context snapshots. This is not complete anonymization: a description or note
could contain personal information. No automatic retention/purge policy has
been implemented. Privacy documentation and any account-erasure workflow must
take these records into account. This feature is for content corrections, not
a replacement for the site's rights-infringement contact.

## Database Setup

`prisma/sql/song-reports.sql` is an additive migration. The partial unique index
and CHECK constraints are deliberately included in SQL, not just Prisma's
model. Do not replace this setup with an unrestricted `prisma db push`.

Inspect without writing:

```powershell
npm run reports:setup -- --ca "C:\path\to\supabase-ca.crt"
```

Apply only after authorization:

```powershell
npm run reports:setup -- --ca "C:\path\to\supabase-ca.crt" --apply
npx prisma generate
```

The setup script checks existing schema compatibility, writes a local metadata
snapshot without account/report contents, compares protected table counts in
one transaction and verifies the result using a new database connection.

The approved production addition was applied on 2026-10-28. Snapshot:
`reports/song-reports/setup-2026-10-28T22-39-13-134Z.json` (ignored by Git).
Independent checks confirmed RLS, zero public policies/grants and zero reports
after testing. No existing song, review, account, favorite or playlist rows
were written by this migration.

Restart local development after regenerating Prisma if its cached client is
still running. A fresh production deployment loads the regenerated client.

## Verification

```powershell
npm run test:song-reports
npm run reports:check-db -- --ca "C:\path\to\supabase-ca.crt"
npx tsc --noEmit
```

The PostgreSQL test creates an isolated schema inside a transaction and rolls
it back. It covers repeatable DDL, constraints, pending uniqueness, foreign-key
deletion behavior and RLS without inserting public reports.

Verification for this change: 408 regression tests, TypeScript checks, targeted
ESLint and 36 browser combinations across Serbian/English, dark/light themes
and mobile/desktop sizes. Browser tests used synthetic sessions and intercepted
API responses, including failures and version conflicts; they made no live
report writes. Temporary preview routes were removed afterward.

A production build, a physical-phone check and an authenticated live production
submission were not verified in this change. Git/deployment is still required
for the interface to appear on the public website.
