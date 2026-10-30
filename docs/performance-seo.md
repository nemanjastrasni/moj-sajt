# Public performance and technical SEO

Implemented and checked on 2026-10-30. No deployment, DNS changes, database
migrations, song corrections or private-user-data changes are part of this work.

## Measurements

`npm run performance:measure` measures the deployed public home page and one
public song anonymously, with an empty browser cache. Reports and screenshots
are written under ignored `reports/site-performance/`.

The mobile profile is 390 x 844, 1.6 Mbps download, 150 ms simulated latency
and 4x CPU slowdown. These are synthetic browser runs, not Lighthouse scores,
field Core Web Vitals, measured INP or a ranking guarantee.

The deployed baseline on the public Vercel origin transferred approximately
14.93 MB of images on mobile and 29.85 MB on desktop. The desktop run fetched
some images twice. Both baseline home-page runs reported React hydration error
418. That observation does not establish its cause.

With the new assets, an isolated local production build transferred about
139 KB of images on mobile and 307 KB on desktop in the same measurement
script. Its content queries used in-memory fixtures, not the production
database. Local and deployed timings are not directly comparable. Rerun the
public measurement after deployment before claiming an actual speed gain.

The first hero image's original file is 4,368,074 bytes. Its generated WebP
variants are 19,218 bytes at 640 px, 53,532 at 1280 px and 138,224 at 1920 px.
Original photos are retained. Other slides load when needed, and below-the-fold
images use responsive sources and lazy loading. Hashed derivatives have an
immutable one-year browser cache.

Regenerate derivatives after changing a source photo:

```sh
npm run images:optimize
```

Commit the generated manifest and referenced optimized images together. Image
conversion does not change or establish the source photo's licensing status.

## Public queries and metadata

- Public latest/popular lists return only five small song/artist metadata DTOs,
  cached for 60 seconds. Failed queries return 503 with no-store, not a cached
  empty success. Their HTTP stale-while-revalidate window is 300 seconds.
- Song and artist lookups are deduplicated within one request with React cache.
  There is no new persistent cache of user sessions, playlists, favorites, capo
  settings, reviews or admin state.
- A song view increment runs after the response. Known bots, prefetches and
  headless QA visits are skipped. This remains a heuristic popularity counter,
  not unique-visitor analytics.
- Song metadata uses actual database titles and artist names. Personal query
  contexts share the original song's query-free canonical URL.
- Public song, artist, biography, category and home pages have canonical and
  social metadata. Empty biography pages are noindex. Missing pages remain 404.
- Private/admin/auth endpoints have noindex headers. robots.txt is a crawler
  hint and is not a substitute for authentication or database access controls.

## Sitemap

`/sitemap.xml` is an index. `/sitemaps/pages.xml`, `/sitemaps/songs-N.xml` and
`/sitemaps/artists-N.xml` contain public URLs in deterministic batches of 1000
records. No arbitrary first-50,000 cutoff, private playlist URLs, lyrics payloads
or invented modification dates are included.

The sitemap's data cache is five minutes; its HTTP stale window is ten minutes.
Admin content changes invalidate its data tag and the home-list data tag. Direct
database scripts may need the normal cache TTL to expire. CDN/browser copies
can briefly remain stale. Database failures return 503/no-store, not an empty
successful sitemap.

A read-only live catalog audit found 9,369 candidate song rows, 1,210 artist rows
and 165 performer links. One Metallica song has both an empty title and slug
(`cmqnov33q0008k0049eywvauo`). Malformed paths are excluded from sitemap output;
the row itself was not changed or deleted. The audit exits nonzero on such data
issues so they do not go unnoticed.

```sh
node scripts/check-public-seo-db.cjs --ca "PATH_TO_VERIFIED_CA.crt"
```

The script uses a read-only transaction and rolls it back. Never disable TLS
verification to work around a local connection problem.

## Domain and publication

The owner has not bought a domain. The public origin is resolved from:

1. `SITE_URL`, when explicitly configured.
2. Vercel's stable `VERCEL_PROJECT_PRODUCTION_URL`.
3. `https://moj-sajt-rho.vercel.app` as the fallback.

Ephemeral preview deployment URLs are not used as canonical origins.

After purchasing a domain:

1. Connect and verify it in Vercel, including HTTPS.
2. Set `SITE_URL=https://YOUR_OWNED_DOMAIN` in the production environment and
   redeploy. Do not set an unowned domain or a URL with a path/query.
3. Configure permanent redirects from old public aliases to the chosen primary
   domain. Preserve paths and query strings.
4. Review authentication base URLs and Google OAuth callback allowlists
   separately. Changing SEO configuration does not configure Google Cloud.
5. Verify ownership in Google Search Console and submit `/sitemap.xml`.
6. Check representative song canonicals, mobile rendering, crawl/index reports
   and public performance again. Indexing and ranking are not guaranteed.

Technical SEO does not resolve permissions for copied lyrics, arrangements,
biography text or photos. Resolve those separately before broad commercial use.

## Verification

- All 556 existing/new automated tests passed, including 20 SEO/performance tests.
- Production-fixture browser checks passed at 320, 390, 820 and 1366 px in both
  themes and languages: 16 combinations, no horizontal overflow or hydration
  errors. Screenshots were visually inspected.
- Canonicals, real titles, server-rendered song text with JavaScript disabled,
  404 responses, sitemap partitions, robots, immutable image headers and one
  shared song lookup per request were checked against the isolated build.
- The local Windows Prisma TLS connection still fails on this machine. Live
  catalog auditing used the verified-CA pg connection; browser song checks used
  isolated invented content and never altered production songs.
- Run a clean production build before publishing, then rerun measurements on
  the deployed version. Local test results are not a substitute for that check.
