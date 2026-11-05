# Admin content statistics

The `/admin` overview counts the entire application catalog, including records
outside the public sitemap. Counts are available only after a fresh admin check.

- Songs: every stored Song row.
- Lyrics only: nonempty content with no chord, bass or tablature recognized by
  the existing song-sheet parser. Both lyrics and chords fields are inspected.
- With chords: a chord is recognized in either field, including inline notation.
- Notation only: tablature or bass notation is recognized, without a chord. Such
  records can also contain prose; they are excluded from the lyrics-only count.
- Empty: neither field has visible content after notation wrappers are removed.
- Biographies: artists with biography prose in bio or bioShort, counted once.
  Existing unavailable-biography placeholders do not count.
- Discographies: artists with at least one album accepted by the existing
  discography normalizer. This counts artists, not individual albums.

Recognition is a content-format classification, not a musical correctness or
source-rights verification. No songs or artist fields are changed.

The service reads keyset batches of 500 records within one repeatable-read
transaction. Only aggregate numbers and the calculation timestamp enter the
five-minute Next.js data cache; lyrics, biographies and account data do not.
Authorization is checked outside the cache on every access. Admin content
mutations invalidate the statistics tag along with existing catalog caches.
An authenticated server action refreshes the tag and `/admin`; it never edits
database rows. Failures propagate to the existing admin error boundary rather
than returning misleading zero counts.

`npm run test:admin-stats` covers content recognition, legacy biographies/albums,
complete pagination, protected cached reads, protected refresh and failures.
Runtime layout and refresh QA uses a separate fixture checkout. The feature
does not configure GitHub Actions, an AI API, Vercel Cron or database jobs.
