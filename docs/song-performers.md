# Duets and Playlist Browsing

## Model and Rollout

One Song remains one database row. Its existing artistId and canonical URL stay intact to preserve favorites, playlist items, reviews, reports and old links. SongPerformer adds ordered credits for two or more existing artists. It has composite uniqueness, foreign keys, a position check, RLS enabled and no grants to PUBLIC, anon or authenticated. Server database access is unchanged.

Artist song pages query the union of original songs and performer appearances, without duplicating rows. Links use the song's original canonical artist/category, including cross-category collaborations. A validated artist context returns the song to the performer page it was opened from; playlist and favorite contexts take precedence. Songs and artist rows show Duet for two credits and Collaboration for larger groups.

The alphabet index hides an old combined-artist entry only when every one of its songs has at least two distinct performer links. The original artist and song routes remain available. Unresolved combinations and actual bands are not hidden or deleted. Counts include appearances and count each song once. Biographies are not invented for newly created profiles.

Applied with user approval on 2026-10-29 UTC: 81 songs from 76 combined entries, 165 links to 115 performers, 32 new empty artist profiles. Existing Artist rows and all Song, SongReview, Favorite, Playlist, PlaylistSong and PlaylistSongSetting rows had identical before/after fingerprints. The remaining 52 candidate names need human review; they include ambiguous names, aliases, missing performers and possible real bands. They are not all confirmed duets. No song was marked musically verified.

Backup and detailed unresolved list: `reports/song-performers/2026-10-29T22-40-42-371Z/plan.json`. This ignored local file contains public artist metadata and row fingerprints, not account credentials or lyric bodies. A subsequent read-only plan found no extra profiles, links or conflicts. All legacy records remain recoverable; reversing this import must remove only its exact added links and newly created empty profiles, never original artists or songs.

## Import

```powershell
node scripts/link-song-performers.cjs --ca "C:\path\to\certificate.crt"
node scripts/link-song-performers.cjs --ca "C:\path\to\certificate.crt" --check-schema
node scripts/link-song-performers.cjs --ca "C:\path\to\certificate.crt" --apply
```

The first command is read-only and writes a local report. Matching uses normalized full names, with an explicit band exclusion list and approved missing-profile allowlist. Multiple possible matches, abbreviated aliases, slug collisions and conflicting existing links are never guessed or overwritten. The schema check creates an isolated temporary schema, tests constraints and cascades, then rolls everything back. Apply saves its plan before writing and uses one transaction for the additive schema, profiles and links. The SQL must precede deployment of this code; Prisma Client must be regenerated.

New admin-entered songs do not automatically acquire duet credits. After validating the artist profiles, rerun the report/import. There is no public performer-editing endpoint. Legacy artist delete/merge operations now stop for linked artists/combined entries, avoiding accidental loss of credits. A full credit-aware merge editor is future work.

## Ordinary Playlist Navigation

Song pages opened from a real user playlist have its name, position, previous and next controls without entering performance mode. The new metadata-only navigation API checks the current active account and playlist visibility. Private lists stay owner-only; public lists permit read-only browsing. It validates song membership, preserves the saved order with deterministic ties and rejects lists above 2,000 items explicitly. No lyrics, account data or personal settings appear in this endpoint.

Links retain the playlist query context, so the existing per-playlist key/capo loader restores settings for each song. The shared unsaved-settings guard also covers these ordinary links. First/last controls are disabled; failed navigation reads show retry rather than fake results. Signing out changes the client scope and clears previously loaded navigation. Original artist/direct visits retain original key behavior.

## About Page and Verification

The About page explains biographies and the separate My Music area, with three screenshots of real controls using original demonstration text, not users' repertoire or copyrighted lyrics. Images can be enlarged. They are examples, not live state. No video tutorial was added.

Automated checks cover matching, band exclusions, ambiguity, cross-category credits, union queries, schema constraints, private/public navigation and checked client responses. Browser fixtures exercise previous/next, disabled endpoints, unsaved cancellation, saved-setting restoration, read-error/retry, 16 viewport/theme/language combinations and the About page. The visible music dock also retained the same iframe across an internal About-page navigation in a mocked YouTube SDK test. This does not establish real YouTube playback or provider availability.

Browser API responses were intercepted; no user account or playlist was changed by QA. The database import and independent count verification used pg with the approved CA and certificate verification enabled. Local Prisma-backed production-page end-to-end tests remain limited by the existing Windows TLS credential error; no TLS verification was disabled.
