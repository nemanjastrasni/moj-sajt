# Conservative Song Repairs

`scripts/repair-songs.cjs` prepares a private before/after plan; it writes nothing unless `--apply` is explicitly supplied with the saved manifest and an active admin reviewer email. Use the verified Supabase CA, never a TLS bypass.

```powershell
node scripts/repair-songs.cjs --ca "C:\path\supabase.crt" --sources "C:\path\original-pesmarica-archive" --limit 30
node scripts/repair-songs.cjs --ca "C:\path\supabase.crt" --manifest "C:\path\manifest.json" --reviewer-email "admin@example.com" --apply
```

The source input must be the original text archive, not a later transformed stage.

## Eligibility

- Existing `verified` and `manually_corrected` records are protected and skipped.
- All ordered lyric/annotation/tab anchors must agree with the original source; chord multisets, bass roles and non-chord musical annotations must agree for every corresponding block.
- Only runs demonstrably split into extra chord-only rows can be replaced by the original single chord row. The paired lyric indentation must agree. Different source versions are deferred, as are inline/BBCode/ambiguous formats.
- Only the damaged chord rows are replaced. Already single-row chord positions, lyrics, credits and other source-independent edits are retained. HTML entities decode as text; tags are not stripped or interpreted as HTML.
- A source match establishes layout provenance, not musical correctness. No chord is guessed, no duplicate song deleted, no title invented and no song automatically Verified.
- The default first batch selects at most 30 clean-layout restores, prioritized by existing popularity (plus the previously reported Dijabolik example). Remaining technical content warnings are not silently accepted as clean. Missing diagrams are a separate issue from layout accuracy.
- Clear pre-existing empty content/missing metadata/replacement-character errors can be marked `needs_fix` without changing their content. Other uncertain warnings remain in the private queue, not mass classified as wrong.

## Apply Safety

- Saved operations are re-derived from their original evidence; a changed after-text/status/hash cannot bypass the eligibility rules.
- A serializable transaction rechecks a unique, non-banned admin, locks the selected Song/Review rows in ID order and compares content, metadata identity and review fingerprints.
- Backups of complete selected Song/Review rows are written before mutation, followed by proposed after rows and a commit summary. Backups and plans are ignored under `reports/song-repairs/`.
- Only Song.lyrics is updated when needed. The content-reset trigger runs normally; the intended private review mark is then written in the same transaction. No trigger, constraint, RLS policy or schema is disabled/changed.
- IDs, chord fields (including NULL), slugs, titles, artist/category links, popularity/difficulty and creation metadata are checked unchanged for each selected song. Song/favorite/playlist-link counts must be preserved. Favorites, personal transpose and playlist rows are never updated by this CLI.
- Stale rows abort the entire batch; there is no force mode. Applying the same old plan again fails rather than overwriting a newer review/edit.
- Before/after backup files alone are provisional; a successful COMMIT and `summary.json`/independent readback establish that the run was applied. If a connection fails during COMMIT, inspect current versions before attempting anything again.
- To restore a backup later, first compare current rows against the saved after version, then restore only those unchanged rows and their original review records in one guarded transaction. Never overwrite subsequent user/admin edits blindly.

## First Live Batch

Applied with the user's request to correct content and mark each processed song on 2026-10-27:

- 30 songs: damaged chord rows restored from the original archive, marked `manually_corrected`.
- 4 songs: three damaged-character Devojko Mala variants and one empty Metallica entry marked `needs_fix`; their content was not guessed or deleted.
- 16 existing manually corrected songs were excluded. No song was marked Verified.
- All 9,352 song records, 3 favorites and 162 playlist links were retained.
- Plan: `reports/song-repairs/plan-2026-10-27T22-51-04-956Z/manifest.json`.
- Backup: `reports/song-repairs/apply-2026-10-27T22-55-51-020Z/`.

The read-only full audit found 1,040 eligible clean-layout candidates before this first batch; 1,010 remain candidates, not automatically reviewed songs. Entity-only and uncertain source cases were left for separate review.

## Verification

`npm run test:song-repair` exercises source/lyric/chord agreement, preserving other columns and manual marks, source conflicts, entity text decoding, bounded status classification, plan tampering, stale/admin checks, transaction success and rollback after partial work. A real PostgreSQL test used only uniquely named temporary tables inside an outer rolled-back transaction to verify trigger-reset/review ordering and stale reapply rejection.

The actual SongSheet renderer was checked for all 30 repaired songs at 320/1366 px and two transpose offsets (120 combinations). Every expected chord token remained present, chord and lyric rows stayed vertically ordered, and no sheet overflow/page errors were detected. Screenshots were inspected for the originally reported Dijabolik example. An independent fresh read after COMMIT confirmed all 34 target contents/statuses.
