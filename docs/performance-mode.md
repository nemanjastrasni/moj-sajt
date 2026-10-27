# Performance Mode

## Entry and Navigation

- A song's Performance Mode icon opens an isolated, full-viewport reader. The underlying guitar menu, footer, admin controls, playlist editor and video are not part of the reader. SongClient stops its window auto-scroll and unmounts video before opening it. Exiting restores focus and the prior document overflow setting.
- User playlist pages have a Play Playlist action at the title. `/plejliste/[id]/sviranje` starts at the first saved song, or at a validated member supplied through `?song=...`. A song entered from an actual playlist uses this route for its Performance action. Generated catalogs use the standalone reader instead.
- Previous/next use the current saved roster and remain inside one reader instance. Navigation never wraps implicitly at either end. The native fullscreen element stays mounted across song changes. On every transition, auto-scroll stops and the song scroll position starts at zero. Settings stay in memory for this reader session; they are not yet account-persisted.
- Original song pages still open at their original key. Playlist performance restores the current user's Favorite key when the song is favorited, otherwise starts at zero. Standalone performance shares the current page's transpose state. Changes to favorited songs use the existing guarded save API; previous/next/close wait while a save is pending. There is no separate per-playlist transpose override in this step.

## Display and Controls

- The native modal dialog occupies the whole viewport with safe-area padding. A separate Fullscreen icon requests the browser's Fullscreen API on the dialog's inner DIV in response to a user gesture. The dialog element itself is not used as the fullscreen target. Unsupported/rejected requests show a status while keeping the immersive reader usable. No promise is made to hide browser chrome on every mobile browser.
- Controls include bounded transpose/reset, manual start/stop scrolling and an expandable settings panel for lyric size, chord size and scroll speed. The existing synchronized chord/lyric renderer handles wrapping, not a copied or reformatted sheet.
- The Timer icon opens the client-only metronome within the reader. It can be minimized to keep the sheet usable while playing; see `metronome.md` for audio lifecycle and limits.
- Auto-scroll targets the reader's own scroll container, uses elapsed animation-frame time, stops at the end, pauses on document visibility loss or touch/wheel input, and cancels its animation frame on exit. It never starts automatically on opening or changing a song.
- The reader keeps a bounded header and a dedicated scroll area even on small landscape screens. Theme/language follow the site's current settings. Original titles, artists and lyrics are not translated.

## Data and Privacy

- GET `/api/playlist/[id]/play?songId=...` rechecks the signed-in account against the database and uses the same public/owner-only playlist rules as normal views. Anonymous users can play public lists only. Stale banned/deleted sessions do not unlock private lists.
- The first query selects at most 2,001 roster metadata rows without lyrics. Lists exceeding 2,000 songs are rejected explicitly. Only the selected member's lyrics are read, in a second membership/access-checked query. Songs outside the list cannot be requested through this endpoint.
- Responses contain only playlist ID/name, ordered song ID/title/artist metadata and the current canonical sheet. No owner IDs, favorite values, account records or other songs' lyrics are returned. Favorites are read separately by the existing private account endpoint.
- Responses are private/no-store with `Vary: Cookie`. The client checks bounded JSON, playlist/current identity, unique roster IDs and membership. It aborts superseded reads and never publishes late responses into a new selection or account context. Loading/failure shows no previous sheet under a new title. Access revocation and errors hide the sheet and offer retry/exit.
- No database migration, live data rewrite, payment check, offline cache or subscription was added.

## Verification

- `npm run test:performance`: ownership/privacy, public read-only use, roster order, membership, access change between reads, empty/oversized playlists/sheets, deterministic legacy positions, safe failures and checked client responses.
- Browser fixtures use the real reader, SongClient, playlist controller and Favorite hook with intercepted API responses. Eight layouts cover 320 px portrait, 390 px portrait, 844 x 390 landscape and 1366 px desktop, with expanded settings and both themes/languages. No page errors or horizontal dialog overflow were detected; the reader, not the menu underneath, received top-of-screen hit testing.
- Browser QA confirmed actual Fullscreen API entry/exit, persistence across previous/next, favorite key restoration/save gating, scroll movement, zero/paused state on next song, access-denial sheet removal/retry, rejected-fullscreen fallback, standalone focus restoration and body overflow cleanup. No live user's favorites or playlists were mutated for testing.
- Local authenticated Prisma end-to-end reads remain limited by the previously documented Windows TLS credential issue. Server access logic is covered by fixtures; live deployment testing should follow publication.

Browser API references: https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen and https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog.
