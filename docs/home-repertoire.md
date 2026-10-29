# Home Repertoire and Continue Playing

Authenticated users see a compact repertoire band above the homepage category
images. My playlists links directly to `/profile/plejliste`. Continue playing
appears only when a valid last performance session exists and its content is
still accessible. Favorites remains a secondary icon link. Guests do not see
another account's personal band.

## What Is Remembered

Opening performance mode remembers the song, or the playlist plus its current
song. Playlist navigation updates the remembered song, so returning does not
always restart from the beginning. Ordinary song browsing is not recorded.

One small versioned localStorage entry is kept per account in this browser.
Only song/playlist IDs and a timestamp are stored, never titles, lyrics, email,
transpose or capo. Entries older than 90 days are ignored. Explicit clearing
removes the current account's entry; logout hides it but does not delete it.
Storage failures leave normal playback and playlist access working.

This does not synchronize history between browsers/devices and does not store
scroll position or autoscroll state. Favorite transposition is restored by the
existing favorites workflow. Unsaved key/capo choices are not restored.

## Read-Only Resolution

`GET /api/performance/resume` requires a fresh authenticated, non-banned account
and validates target IDs. It resolves current metadata rather than trusting a
stored title or URL. Playlist access and song membership are checked together
using the existing public-or-owner rule. Private content belonging to another
account returns no continuation metadata.

The endpoint returns only display metadata and a canonical local destination,
with `Cache-Control: private, no-store` and `Vary: Cookie`. It does not return
lyrics, owner IDs, emails or other playlist songs. No new database table or
history write is introduced.

A missing/deleted/inaccessible target clears the stale browser entry. A service
error retains it and offers retry while My playlists remains available. Late
requests are aborted/ignored after target or account changes. The client also
validates response identity and destination before displaying a link.

Standalone resume uses the canonical song URL with `from=favorites&play=1` to
open performance mode with the existing personal-key restoration. There is no
automatic audio playback or browser-native fullscreen request. Playlist resume
uses the existing performance page with the remembered song ID.

## Verification

`npm run test:resume` covers target/storage validation, account isolation,
expiration, blocked storage, authentication, private/public access, removed
items, canonical destinations, minimal metadata and safe errors.

The 2026-10-29 browser check covered 16 theme/language/viewport combinations,
including 320px, 390px, tablet and desktop. It exercised fresh/returning users,
long unbroken titles, retry, deleted entries, standalone performance capture,
playlist next-song capture, a different account and guests. Session/API data
were intercepted fixtures; no live user content was written. Temporary preview
routes were removed after the check.

The full regression suite passed with 443 tests, alongside TypeScript and
targeted ESLint checks. Physical-device and full production-build verification
were not performed for this change. Git/deployment is required for public use.
