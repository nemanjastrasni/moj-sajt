# Database access hardening

The application uses NextAuth and server-side Prisma, not browser-side Supabase
table access. The inspected server connection uses `postgres` with BYPASSRLS.
Never expose this connection or a service-role key to a browser.

`scripts/harden-database-access.cjs` is opt-in:

```powershell
node scripts/harden-database-access.cjs --ca <certificate-path>
node scripts/harden-database-access.cjs --ca <certificate-path> --apply
node scripts/harden-database-access.cjs --ca <certificate-path> --check
```

It enables RLS and revokes PUBLIC/anon/authenticated privileges on the explicitly
recognized application tables and their public sequences. It also removes these
default grants on future public tables/sequences created by postgres. It does
not change postgres/service_role privileges, policies, content, constraints,
authentication providers, or Supabase's auth/storage/internal schemas.

Before applying it saves catalog metadata, row counts/hashes and `restore.sql`
under ignored `reports/database-access/<timestamp>/`. No row content, passwords,
tokens or connection strings are saved. Recovery restores the previous unsafe
access, so use it only after reviewing the cause of a problem. Both the generated
change and recovery are exercised inside a savepoint before the final change.
Rows are compared while writes are briefly locked; lock timeout is five seconds.
Anon/authenticated read denial is tested without selecting user values, and a
fresh connection independently verifies the final catalog.

## Scope And Limits

- This is not a breach investigation or a complete application security audit.
- Existing policies, views or unrecognized tables abort the script for review.
- It does not change defaults for objects created by supabase_admin or other roles.
- Functions need a separate privilege review. PostgreSQL's global PUBLIC EXECUTE
  default cannot be removed by a schema-only revoke. No public SECURITY DEFINER
  functions were found in the inspection on 2026-10-29. This is not a guarantee
  about future functions or future schema changes.
- Do not grant browser roles direct access merely to make an admin page work.
  Admin authorization remains server-side and must check the current database role.
- A deployment with a different DATABASE_URL role requires an independent check.

Reference: [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api).

## Missing Submission Table

The same inspection found that `SongSubmission` was absent. After separate user
approval, `scripts/setup-song-submissions.cjs --ca <certificate-path> --apply`
created the empty table from the existing model. It enables RLS, revokes all
browser-role grants, verifies columns/constraints/indexes and fingerprints the
existing application rows before/after. It does not import proposals, publish
songs, or delete any records. The default invocation is inspection-only.
