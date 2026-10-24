# Predlozi pesama

## Setup

1. Back up the Supabase database.
2. Run `prisma/sql/song-submissions.sql` in the Supabase SQL Editor, against the same database/schema used by DATABASE_URL. This additive script creates only SongSubmission and its indexes/constraints; it does not change existing songs or users. It may be rerun, but does not repair a differently shaped preexisting table.
3. Deploy the code. The existing build command runs prisma generate.

The SQL enables row-level security without public policies, so the new private proposals table is not exposed to Supabase anon/authenticated REST clients. Prisma must keep using the trusted server database connection (table owner or an appropriate BYPASSRLS role), never a browser anon key. Do not add public read/write policies to this table.

There is no existing Prisma migration history in this repository. Do not run migrate reset or db push against production to install this feature. The SQL file is the explicit additive setup for the existing database.

## Workflow

- Account menu: Predlozi pesmu -> category, performer/band, title and lyrics with chord rows. Rules/example and an optional responsive preview appear in the form. Canonical category domace remains unchanged and is displayed as Zabavne.
- No song or artist is created by submitting. Moji predlozi lists only the signed-in user's proposals, with status and review notes, 20 per page.
- Admin -> Predlozi pesama: pending/approved/rejected lists, 20 per page. Open a pending proposal, edit its content, then approve or reject. Rejection requires a reason. Review notes are visible to the submitter, not public visitors.
- Approval creates the artist only if necessary, creates the song and changes proposal status in one serializable transaction. Existing artist metadata/category is never silently changed. Resolve category conflicts and duplicate songs manually; they return 409 without publication.
- Published song uses the normal song route/renderer. It is not a separate type of page.
- Existing admin layout/middleware restrictions remain in place. API additionally rereads the user's current banned/role state from the database; client role values are never trusted.
- Credentials accounts are not required to have emailVerified for this feature. Email ownership confirmation and email notifications are NOT implemented here. Google verification follows the existing authentication flow.

## Limits and privacy

Submission requests must be same-origin JSON. Server validation limits names to 200 characters, lyrics to 40,000 characters, each row to 500 characters and request body to 200,000 bytes. It checks for both lyrics and recognized chords, rejects links/HTML and preserves interior spacing. The preview uses the same parser/renderer as published songs.

At most 5 proposals per user in a rolling 24 hours, including rejected proposals. Duplicate pending titles for the same user/performer are blocked. Serializable transactions retry serialization conflicts twice. This is a per-account spam limit, not a substitute for email verification or infrastructure-level rate limiting.

User access to proposals requires login. Unpublished lyrics and submitter contact details are never returned by public song/search routes. Admin review details show only the submitting user's name/email, not credentials. The UI's permission checkbox is a user declaration, not legal verification of content rights.

If a request times out, check the proposal list before retrying: the server may already have committed. A second approval of an already reviewed proposal returns 409, so it cannot create another song.

## Verification

`npm run test:submissions` covers validation, auth/bans, forged role, request limits/origin, pending-only creation, spam limits, review/duplicate protection, transaction retry and safe error responses using a database mock. Run the existing auth/search/chord suites and `npx tsc --noEmit` as regressions. Database mocks do not prove real concurrent PostgreSQL behavior; verify with staging before a public rollout.

Local verification: 71 tests passed across submissions/auth/search/chords; schema validation and TypeScript passed. Browser checks at 320, 390, 820 and 1366px verified no document overflow, preserved textarea spacing, rendered chord preview and mocked submit/reject/approve/conflict states without runtime errors. The temporary UI fixture was removed after testing. These checks do not represent a live Supabase publication.

The local SQL setup attempt failed with Prisma P1011 (Windows TLS: No credentials are available in the security package). The full production build compiled and passed type checking but failed while prerendering the existing /top-50/domace page for the same TLS reason. SQL installation and real database end-to-end testing are still required; never work around this by disabling TLS.
