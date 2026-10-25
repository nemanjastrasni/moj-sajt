# Read-only song audit

Run `npm run songs:audit -- --ca "C:\path\supabase.crt" --sources "C:\path\source-archive"`.
Repeat `--sources` for additional archives. The default is a deterministic, stratified
200-song pilot across categories and notation types. This is deliberately not a random
sample and its percentages must not be extrapolated to the entire database.
Use `--all` for all songs or `--sample 100` for a smaller pilot.
`--base-url https://your-production-origin.example` changes report links only.

The database is read through a verified-TLS, repeatable-read, READ ONLY transaction.
No apply/write mode exists. Song lyrics, chords and manual SongReview statuses are
never changed. No new schema or public website UI is required.

Reports are private local files in ignored `reports/song-audits/<run>/`:

- `index.html`: results paginated by 200 with public-song and admin-edit links;
  separate local pages for the review queue and source-matched candidates.
- `queue.csv`: songs with warnings or differences from local source versions.
- `results.json`: per-song findings, content fingerprints and source comparisons.
- `summary.json`: counts, timings, input snapshot fingerprint and limitations.

The checks use the same chord parser, transposer and wrapping code as SongSheet:

- Mixed/unrecognized musical lines, leftover markup and broken encoding.
- Root, intervals and slash-bass transposition at all twelve pitch classes,
  plus negative and octave shifts. Bass notes are not requested as chord diagrams.
- Paired line wrapping at 18, 30, 50 and 80 source columns, with no lost tokens.
- Base diagram mapping and actual local file existence.
- Chords far beyond the end of a paired lyric, and possible repeated word phrases.
- Local filename identity matching without silently dropping version suffixes.
- Exact text equality (line endings/BOM normalized) or equality of parsed layout,
  preserving chord columns and lyric whitespace. Multiple local versions remain explicit.

Warnings are suggestions, not automatic corrections. Intro/outro notation and intentional
repeated phrases can be valid. A missing diagram does not mean an invalid chord.
Source differences may be intentional manual improvements. Archive equality cannot prove
musical accuracy: scraper errors can already be present in local files. `technical_pass`
means only that these specific automated checks found no warnings; it is not the manual
`verified` status and does not assert pixel-perfect behavior on every device.
`sourceConfirmedCandidate` is an even narrower reporting subset: no technical warnings,
a matching local text/layout and no conflicting local content versions. It still does not
mark any song verified. No live external-source or audio/music comparison is performed.

Validate with `npm run test:song-audit` and `npm run test:chords`.
