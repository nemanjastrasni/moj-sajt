# Wikipedia biographies and discographies

`npm run wiki:setup -- --ca <trusted-supabase-certificate>` creates the additive
source/profile table and the pending-work trigger. It also imports existing
matching credits. It does not replace artist content. The initial production
table was installed on 2026-10-31.

New artists created through the artist form/API, the song batch API, or an
approved submission are looked up after the response. Lookup requires a matching
musical Wikidata identity; it preserves manually entered data. Source metadata
and any new content are committed together. A 45-second request budget bounds
lookups, and a database lease prevents duplicate concurrent work. The authenticated
`POST /api/admin/artists/:id/wikipedia` endpoint can retry pending/failed work.
Rows inserted directly through SQL are queued by the trigger; run maintenance to
process existing records. No background process or cron is installed by this code.

`npm run wiki:plan -- --ca <certificate>` resumes the local catalogue scan.
Plans, caches and before/after reports stay in ignored `reports/artist-wiki/`.
Run `npm run wiki:refine` after discovery. This re-parses the pinned, cached pages
and excludes generic discography sections without an explicit album type,
mixed yearly song tables and releases explicitly marked as singles. Apply uses
this refined plan by default. A content/proposal hash check prevents a plan from
accidentally citing the source for a different candidate value.
The plan preserves release types and skips the reviewed questionable lists in
`wiki-discography-holds.json`. Missing articles and ambiguous matches stay empty.
It never imports tracks/singles as albums, translates album names, or uses an
unrelated discography page. Dedicated pages must refer to the identified artist
through Wikidata performer/main-subject claims.

Before applying new content, deploy the source-credit UI. The public
`/wiki-izvori` page must include `data-artist-wiki-storage="database"`.
Then run:

```
npm run wiki:apply -- --ca <certificate> --base-url https://your-site.example --apply
```

Without `--apply` this is a dry run. A full artist-content snapshot is saved
before the first update. Updates run in small transactions with locked rows and
skip content/identity changes made since the plan. Each accepted content change
and its pinned revision, author-history link, license and content hash are saved
in the same transaction. Existing credits fall back to the checked-in manifest.

Photos use the existing licensed artist-photo manifest and attribution. No album
covers or arbitrary unlicensed web photos are downloaded by this feature.
