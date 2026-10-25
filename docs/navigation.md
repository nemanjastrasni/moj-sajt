# Hierarchical Back Link

The header's existing "Nazad" / "Back" control now links to the logical parent,
not `router.back()`, browser history, referrers or a list of recently opened pages.
The browser's own Back and Forward buttons keep their normal history behavior.

- Song opened from a playlist -> that specific playlist; otherwise song or artist info -> artist's songs.
- Artist's songs -> that artist's letter/NUM index in the same category.
- Letter/NUM index -> category, even after coming back from an artist.
- Category -> section index (`/pesme` or `/biografija`) -> home.
- Biography -> its section/category letter index, not arbitrary visit history.
- Playlist/chord/profile detail pages -> their existing containing section.
- Admin song editor -> song list, skipping the legacy ID route that redirects to edit.
- Admin artist merge -> editor -> artist list -> admin.
- Top-50 category -> that song category; top listening playlists -> playlists.

The artist pages already load the real artist name. They send a small client hint
through BackNavigationProvider so diacritics and song-index digraphs (Dz/Lj/Nj)
do not have to be guessed from lossy ASCII slugs. Biography indexes currently use
first-character grouping, so their parent links follow that existing convention.
Numeric/non-alphabetic names map to `num`. No extra database query is needed.

Hints belong to an explicit pathname and component owner. They cannot apply to a
different song/letter page while navigation is in flight, and cleanup from an old
page cannot erase a new page's hint. Before a page-specific hint mounts, the safe
artist-page fallback is its category; no diacritic is guessed from a slug.
The homepage has no back link. Internal paths are validated and encoded; no
external callback URL is accepted. No existing routes/slugs or musical content change.

## Playlist context

Song links from personal/public playlists, generated lists, category lists, songs-you-can-play and Top-50 lists carry an encoded `playlist` query parameter. The song server page awaits `searchParams`, validates a bounded internal playlist path and registers its pathname-scoped Back target. No global last-playlist value, browser referrer/history or storage is used, so refresh, direct links and independent tabs retain their own context. Plain artist/search song links have no parameter and keep the artist fallback. Leaving a song unregisters its scoped hint. Arrays, external URLs, traversal, query/hash injection and unsupported route families are ignored.

This is only a navigation hint: it grants no playlist permissions or membership. Existing private/public access checks still run when the list opens. The header adds no `useSearchParams` hook or new Suspense/build dependency, and navigation adds no database reads or writes. Existing song visit counting is unchanged.

Check with `npm run test:navigation`. Browser QA covers the real client provider
and header link, direct loads and reloads, artist hints for NUM/diacritics/digraphs,
repeated upward navigation after visiting a child, both themes/languages and mobile.
Route-family/hint scenarios use a temporary isolated client fixture, with separate
real-header Next Link clicks on `/akordi/a` -> `/akordi` -> home. No database-backed
artist content is modified, and the temporary preview route is removed after QA.
