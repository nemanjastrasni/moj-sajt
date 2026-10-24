# Wikipedia artist maintenance

The old `scripts/wiki_full_import.js` first-result importer is replaced by a compatibility entry point to `scripts/artist-wiki.cjs`. Running it without a subcommand performs a read-only audit. It no longer downloads images, guesses an article from `name + muzika`, references an undefined Discogs token, truncates all bios blindly at 1200 characters or overwrites artist photos/members.

## Audit and plans

```powershell
npm run artists:wiki -- audit --ca "C:\path\to\prod-ca-2021.crt"
npm run artists:wiki -- plan --ca "C:\path\to\prod-ca-2021.crt" --limit 100 --balanced --min-songs 5 --report-dir reports/artist-wiki/first-plan
npm run artists:wiki -- combine --report reports/artist-wiki/popular-plan/report.json --report reports/artist-wiki/balanced-plan/report.json --report reports/artist-wiki/reviewed-plan/report.json --report-dir reports/artist-wiki/ready
```

The verified-TLS pg connection is shared with the photo maintenance tool, not the application's Prisma connection. Secrets are never included in reports. Reports and backups live in ignored `reports/artist-wiki`. A live audit snapshots Artist identity, biography/discography, photo/member values and song counts, not account data. `--name` is repeatable; `--exclude-report` skips identities already inspected in another plan. Limits are bounded to 200 per run. This is not a claim that every existing biography has been fact-checked.

Identity resolution requires one exact-normalized name/alias with structured musician/singer or musical-group evidence on Wikidata. Ambiguous names, spelling changes and collection labels are skipped. Wikipedia titles come from that entity's sitelinks (`sr`, `sh`, `hr`, `bs`, `en`), not from a search's first result. Each article must point back to the same Wikidata identity, be in the main namespace and not be a disambiguation. Its specific revision is parsed and recorded.

Biographies prefer regional-language prose, preserving paragraph boundaries, up to 14,000 characters at paragraph boundaries. Serbian Cyrillic prose is transliterated, not translated. Existing long/manual/different text is preserved. Automatic replacements are limited to blanks, narrowly detected calendar articles, explicitly reviewed wrong-subject hashes, or matching old 1200-character truncations. Source verification is identity/provenance checking, not a guarantee every Wikipedia assertion is correct. Referenced career/history prose is selected; citation-needed paragraphs, navigation, reference lists and designated controversy/political/legal sections are omitted. Partial source text is not passed off as an independently written biography.

**Automatic discography imports currently cover explicitly labeled studio albums only.** Generic lists, singles, videos, duets, various-artist appearances, live albums and compilations are not automatically published. This conservative first phase is intentional: these formats often overlap in article layouts. The parser supports lists, structured tables and multi-column layout tables, separates release years from years inside titles, ignores italic record-label names, rejects future/undated entries and preserves source album-title spelling. Regional/English sources can supply album lists independently of the biography's source. Wikipedia lists can be incomplete; the result is not advertised as an exhaustive discography.

Plans contain the original value and proposed value of each field, full source/revision/history/CC BY-SA 4.0 details, a review HTML page and a content hash. `public/artist-wiki/manifest.json` contains credits/hashes, not full biography text. Hashes are stable across PostgreSQL JSONB object-key reordering.

## Removing confirmed bad text

`scripts/wiki-reviewed-corrections.json` records personally reviewed mismatches with exact old-value hashes and a reason. A changed/manual replacement will not match the old hash and will be preserved. Calendar detection is narrow and does not treat a musician merely mentioning a year as bad.

```powershell
npm run artists:wiki -- clear-reviewed --report reports/artist-wiki/current-audit/report.json --ca "C:\path\to\prod-ca-2021.crt" --apply
```

This clears **bio only**, not the Artist row, image, members, bioShort, songs or categories. Clearing a confirmed bad biography does not require new attribution UI, but does require a pre-write backup. After clearing, regenerate plans against the fresh database so their old-value guards reflect the newly blank fields.

## Publishing new content

First deploy the code and generated public manifest. Biography/info pages display a source/revision link, contributor-history link and license for imported fields whose content hash matches. `/wiki-izvori` lists source metadata and modifications; the footer links it. Both structured and legacy string discographies render without `[object Object]`; the admin form preserves JSON instead of joining objects into garbage.

```powershell
npm run artists:wiki -- apply --report reports/artist-wiki/ready/report.json --ca "C:\path\to\prod-ca-2021.crt" --base-url https://YOUR-PUBLIC-SITE.vercel.app --apply
```

Without `--apply`, apply/clear commands do not mutate. Adding content requires a deployed identical manifest and credit-page checksum, with each planned field matching its published source hash. Unavailable/stale/protected deployments fail closed. A transaction locks affected rows, saves `before.json`, then uses parameterized updates with exact old-value and identity guards. Fields edited since planning are skipped, not overwritten. Only bio/discography are writable; no Artist deletion, category/name/slug/photo/member updates or song edits occur. SQL NULL and JSONB null are both treated as empty JSON when checking old discographies. `intent.json` and `result.json` distinguish planned/completed writes; re-read live state if a connection is lost during commit. Never restore a backup wholesale without comparing later manual changes.

Do not claim additions are live until deployment verification, apply and a fresh database check have succeeded. No git push is performed automatically by this maintenance CLI.

## First pass, 2026-10-24

The live audit contained 1,198 artists, 937 nonempty bios, no populated discographies and 149 photo assignments. Source/identity discovery inspected 208 distinct artist records in bounded popular, category-balanced and reviewed-name batches. Not all 937 existing bios have been semantically verified.

Fifteen confirmed incorrect bios were cleared with pre-write backup: four calendar-year articles and eleven reviewed wrong subjects (Crvena Jabuka album instead of band; Film film-score article; Time/Magazin general music history; Sinan Sakic/Dejan Matic different people; Osmi putnik film; Nikos Vertis unrelated album; Regata event; Styx river; Suncokreti film). Backup: `reports/artist-wiki/apply-2026-10-24T15-52-15-584Z`. A fresh check found exactly 15 changed bios, zero changed image/member/discography fields, 922 remaining nonempty bios and all 149 photos preserved.

The final combined plan prepares **55 new/expanded/corrected bios and 111 studio-discography lists containing 1,204 albums**, across 125 attributed artists. Sources are revision-pinned and paragraphs retain readable spacing. Unknown/ambiguous identities and untyped release lists are not guessed. Existing long/manual bios are retained. Preview: `reports/artist-wiki/ready/index.html`. The combined JSON report and rollback backups are local/ignored; the attribution manifest and UI belong in Git.

139 tests, TypeScript, targeted new-code lint and desktop/tablet/390/320px checks passed. Both themes, structured album rendering, source links, attribution checksum and biography expand/collapse were checked with a temporary development-only preview route that was removed afterward. No full production build was run. The current public Wikipedia manifest returns HTTP 404, and the publication guard correctly refuses additions before deployment. **Only the 15 removals are live so far. The 55 bios/111 lists still require Git/deploy and the guarded apply command.**

## Sources

- [MediaWiki parse API](https://www.mediawiki.org/wiki/API:Parsing_wikitext)
- [Wikidata data access](https://www.wikidata.org/wiki/Help:Data_access)
- [Wikimedia terms, content licensing and attribution](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use#7._Licensing_of_Content)
- [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
