# Biography catalog and discography cleanup

Biography category letters and artist lists now share a content filter. An artist is listed if there is a readable biography, a short biography or at least one displayable discography entry. Empty/whitespace/known missing-content messages and malformed album rows do not qualify. A portrait alone does not qualify. Having only one of the two sections is enough; useful biographies must not disappear just because an album list is missing.

This is display filtering, not Artist deletion. Song indexes, songs, images, favorites, playlists and direct artist editing remain intact. The song artist page also hides its biography link when there is no content. The category letter index and the letter results use the same trimmed/case-insensitive classification, including `num`/`#`. Previously saved direct biography URLs still resolve. Short biographies are displayed as a fallback, without falsely attaching full-biography source credits to them.

## Audit and Applied Data

The fresh snapshot contained 1,197 artists, 921 biographies, 73 populated discographies and 9,352 songs. With the shared display filter, 264 empty artists are excluded and 933 remain available in the biography catalog. This is not a semantic fact-check of those 921 biographies.

Reports: `reports/artist-wiki/catalog-audit-2026-10-28` and `catalog-after-2026-10-28`. The latter is a new verified-TLS read after the write, not a proposed result.

Re-parsing all 73 currently published, hash-matching discographies against their pinned sources found 72 unchanged and one extraction defect. Ed Sheeran's source uses a standalone `EP` definition label, which the parser ignored, incorrectly carrying the studio-album classification forward. Standalone EP labels now end the studio section. Album quote handling also preserves internal title quotes instead of stripping a trailing quote unconditionally.

This recheck establishes extraction consistency with those source revisions, not complete/current discographies or album-by-album factual verification. Manual/untracked/renamed lists are preserved.

Five existing, rechecked proposals already had identical deployed attribution. Applied only their `discography` field: Eva Braun (5), Generacija 5 (4), Josipa Lisac (10), Kerber (6), Van Gogh (11): 36 studio-album entries. Backup: `reports/artist-wiki/apply-2026-10-27T23-28-27-171Z`. A fresh full Artist comparison found precisely those five discography changes, no other changed fields/IDs, and 9,352 songs before and after. The database now contains 78 populated discographies, 784 entries. No biography text was replaced or deleted.

## Pending Publication

Prepared, **not applied**, in `reports/artist-wiki/discography-fixes-2026-10-28/report.json`:

- Ed Sheeran: 22 mislabeled studio entries become the source's 8 actual studio entries; EPs are not deleted as separate artist/song records.
- The Killers: 5 become 7 studio entries using the identity-confirmed English article, including 2020 and 2021 releases missing from the older regional list.
- The Beach Boys: add 29 studio entries from the identity-confirmed English article, including the 2012 album and intact quoted titles. This supersedes the older pending 28-entry regional list.

Only these three discography credit entries changed in the public manifest; other biography/discography credits are preserved. First deploy the current manifest and UI with the owner's normal Git workflow, then run:

```powershell
npm run artists:wiki -- apply --report reports/artist-wiki/discography-fixes-2026-10-28/report.json --field discography --ca "C:\Users\dimit\OneDrive\Desktop\Chords\slike\prod-ca-2021.crt" --base-url https://moj-sajt-rho.vercel.app --apply
```

The normal deployment/hash guard and pre-write backup remain mandatory. Re-read the database after applying. Do not apply the older `ready/report.json` or `discography-rechecked/revised.json` wholesale. An edited field is preserved by the old-value guard. There is no automatic Git push or deployment.

## Repeatable Read-only Recheck

```powershell
npm run artists:discographies:recheck -- --published --report reports/artist-wiki/ready/report.json --ca "C:\path\to\certificate.crt" --out reports/artist-wiki/published-recheck-new
node --test scripts/test-biography-catalog.cjs scripts/test-artist-wiki.cjs
```

`--published` rechecks currently stored arrays only when the current value matches a tracked source hash and artist identity. It never overwrites manual changes. The reference plan supplies the original identity evidence; the matching manifest supplies the pinned source. Outputs are read-only, and changed source credits still need deployment before application.

## Verification

All 381 regression tests and TypeScript passed. Targeted frontend lint passed; CommonJS script lint uses the repository's existing CommonJS style with the ESM-only require rule disabled. Browser checks used the production catalog/discography components with a fresh read-only database snapshot and the three pending proposals. Akt and Aerodrom, which have photos but no biography/discography content, are absent; Alisa remains. Expected album counts and exact matching source links are 8, 7 and 29. Sixteen language/theme/viewport combinations (Serbian/English, dark/light, 320/390/820/1366px) retained original album titles without horizontal overflow or page errors. Screenshots: `reports/artist-wiki/catalog-ui-2026-10-28`.

The temporary preview route was removed. Full local database-backed Prisma routes retain the documented Windows TLS issue; the snapshot preview does not claim to test that connection. No full production build, Git push or new deployment was performed.
