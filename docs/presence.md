# Presence and visit countries

## Counting and visibility

`online = loggedIn + guests`. Signed-in visitors are deduplicated by the current, non-banned User ID; one account on multiple browsers/devices counts once. Anonymous visitors are counted by a random browser cookie, not by physical person. Deleted/banned account references do not expose identities and are treated as anonymous presence. Neither this feature nor IP geolocation can identify how many physical people share a browser/account.

An online entry is a heartbeat within two minutes. Visible pages send a heartbeat every 30 seconds after session loading finishes; returning to a visible tab refreshes immediately. Background tabs stop heartbeats and age out. Logging out replaces the current visitor's user ID with NULL on the next heartbeat. The `ga_visitor` cookie is HttpOnly, SameSite=Lax, Secure on HTTPS and renewed for 30 minutes, replacing the previous one-year lifespan. It is not an authentication cookie.

The public `/api/online` endpoint exposes **counts and snapshot time only**. Header counts include guests explicitly. Failed requests return 503, not fake zero counts. Overlapping heartbeat requests and stale responses are guarded. The private admin poll publishes only the public count projection to the header so it can use the same recent snapshot.

## Countries and privacy scope

On Vercel (`VERCEL=1`), the heartbeat reads only `x-vercel-ip-country`. Values are normalized/validated as recognized two-letter region codes. No IP address, city, coordinates or location history is added. Previous city/country console logging was removed. Local/unrecognized values become unknown, never a guessed country.

The nullable `country_code` belongs to the short-lived presence row, **not the user profile**. Presence rows older than ten minutes are deleted on subsequent presence requests; there is no background purge when the site receives no requests. Both public count reads and private admin reads filter stale data. An offline user does not display old countries. An account active in several countries shows the distinct active countries, avoiding a misleading single choice. Names are localized with `Intl.DisplayNames`; no flags or external location API is required.

This is approximate IP-derived visit geography, not citizenship, residence or GPS location. VPNs/proxies can change it. See [Vercel geolocation headers](https://vercel.com/kb/guide/geo-ip-headers-geolocation-vercel-functions). Reflect this actual processing in the privacy notice before calling that notice complete; this change does not supply consent/legal clearance for unrelated analytics.

## Admin interface and access

`/admin/korisnici` shows consistent totals, per-user status, active country/countries, recent activity and anonymous guests. The recent-activity field covers the short presence window only, not permanent last-login history. The table keeps existing role/ban controls; it scrolls horizontally on narrow screens while the summary and guests fit the viewport.

The panel polls `/api/admin/online` every 15 seconds while visible and includes manual refresh, timeout, stale-data/error and recovery states. A 401/403 hides the live view and refreshes authorization. The private endpoint and server snapshot helper independently recheck the current non-banned database admin. Responses use `no-store, private`; guest cookie values are hashed into ephemeral row keys rather than returned to the browser. The old `/admin/online` page now redirects to the same protected users view, avoiding another inconsistent implementation.

## Database setup

```powershell
npm run presence:setup -- --ca "C:\path\to\prod-ca-2021.crt"
npm run presence:setup -- --ca "C:\path\to\prod-ca-2021.crt" --apply
node scripts/check-presence-db.cjs --ca "C:\path\to\prod-ca-2021.crt"
```

The setup adds only nullable `country_code TEXT` to `public.online_presence`, creating the presence table/index only if missing. No User, Song or playlist writes occur. The opt-in script verifies TLS, uses a transaction and a five-second lock timeout, and saves schema metadata only to ignored `reports/presence` without visitor/account data. The application does not silently ALTER an existing table; apply the migration before deploying.

Approved and applied 2026-10-25. Before/intent metadata: `reports/presence/setup-2026-10-25T16-41-28-115Z.json`. The column did not previously exist. Countries will populate from subsequent heartbeats **after deploying the new code**; older deployments cannot provide this field.

`check-presence-db.cjs` exercises the real shared Prisma SQL against PostgreSQL temporary tables and rolls back. It verifies legacy-row retention, repeated migration, deduplication, valid/banned/deleted identities, logout, inactive countries and expiry cleanup. It does not create real test accounts or alter live presence for test visitors.

`npm run test:presence` covers model, privacy projections, cookie validation, same-origin writes, server SQL shape, admin authorization and unavailable states with a mock database. No location request or permanent history is introduced.

Verification: all 309 regression tests, TypeScript and targeted lint passed. The live schema was re-read and confirmed `country_code` exists; the SQL regression used temporary tables and rolled back. Eight browser viewport/language scenarios (320/390/820/1366px, Serbian/English, dark/light) exercised real presence UI components with synthetic data and intercepted endpoints: automatic status/country/count changes, unavailable-state recovery, consistent header projection and 403 data hiding. No hydration errors or page overflow occurred; the wide user table scrolls within its own container. The temporary preview route was removed. This is not a claim of end-to-end testing the local Prisma connection, which retains the documented Windows TLS limitation. No production build, Git push or deployment was performed.
