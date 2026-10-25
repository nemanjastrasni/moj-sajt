# Legacy biography provenance

This is a source/identity audit, not a statement that every biographical assertion is true or that the whole website is legally cleared. It does not license song lyrics, chord images, portraits or PDF exports.

## Read-only audit

```powershell
npm run artists:bios:audit -- --ca "C:\path\to\prod-ca-2021.crt"
```

The command snapshots Artist data and counts only, never user accounts, and supports **no database writes**. Reports/backups are in ignored `reports/artist-wiki/provenance-*`. It checks every nonempty biography locally, including exact duplicate content and narrowly detected suspicious subjects. A duplicate can be a valid alias; it is not automatically deleted.

Wikipedia/Wikidata requests use a seven-day cache, a 150-request default network budget, a 60-artist default live retry limit, request pacing, deadlines, size limits and a 429/503 circuit breaker. `--network-budget 0 --live-limit 0` uses cached data only. An unresolved or uncached artist is not declared incorrect. The current run does not exhaustively search historical revisions.

Attribution requires exactly one matching musical identity on Wikidata; a mainspace, non-disambiguation article pointing back to that identity; pinned revision HTML; confirmation of the language edition's CC BY-SA 4.0 license; and a match of the **entire stored biography**. Matching allows only whitespace/citation normalization and Serbian Cyrillic transliteration. The old six-paragraph/1200-character importer is reproduced explicitly; fuzzy snippets are not accepted. Suspicious subjects stay in the review queue even after a text match. The original import revision/date may be unknown and that limitation is recorded.

## Prepare source credits without changing text

```powershell
npm run artists:bios:audit -- --ca "C:\path\to\prod-ca-2021.crt" --prepare-credits
```

This opt-in changes only generated `public/artist-wiki/manifest.json`, with a backup. A fresh database read must still match the biography hash and artist ID/name/slug/category; existing conflicting Wikidata identities are skipped. Discography credits and unrelated entries are preserved. The public credit includes the revision link, contributor history, license and a description of modifications. It becomes visible on the biography only when the exact content hash matches, **after Git/deployment**. No database apply command is required for attribution-only changes.

Do not run the older combined biography replacement plan wholesale: a source-credit pass is not approval to replace manually edited text.

## First source-credit pass: 2026-10-25

- Fresh database: 1,197 artists, 921 nonempty biographies.
- 64 complete legacy texts matched: 49 old 1200-character cuts and 15 six-paragraph extracts. All 64 source credits prepared; zero skipped after the fresh-read guard.
- 73 differed from checked sources for their confirmed artist. These can include genuine wrong subjects **or older article versions**.
- 9 ambiguous identities, 22 identities not confidently found, 3 without a matching article, 750 requiring further network checks. These 857 unmatched records are **not all proven wrong**.
- 236 artist records share an exact biography with another record; 10 have a narrow suspicious-subject flag. These flags overlap other counts.
- 150 network requests; 53 bounded live retry attempts. All five language-edition licenses confirmed.
- Zero database writes/deletions. Existing biography, song, image and discography values remain unchanged.
- All 79 existing discography credit entries preserved, including pending entries. The resulting manifest has 134 artist entries and 102 biography credits: 64 match current legacy texts, while the other 38 are older pending proposals, not newly published biographies.
- Report/backup: `reports/artist-wiki/provenance-2026-10-25T14-28-52-792Z/index.html`, `before.json`, `manifest-before.json`, `credits-prepared.json`.

Examples requiring review: Oliver Dragojevic has a MESAM festival text; 100 Band has a YU 100 book text; Mile Kitic has an Elena Kitic text. No automatic deletion was performed.

## Public contact and remaining work

The owner approved `nemanjaivanovic979@gmail.com` for public contact and stated that the site is operated by an individual in Serbia. `/kontakt` and `/prijava-povrede` now use this address and provide an email report checklist. They do not collect identity documents, JMBG, passwords or card details and do not add a server-side contact form. The email client opens a draft; clicking the link does not send a report automatically. The owner must monitor the mailbox and handle actual reports.

Still pending: broader source checks/correction of reviewed wrong biographies, replacement or removal of unclear-origin photos, terms of use and a privacy notice based on the actual data flows. No operator name/address was invented. Do not call the site fully compliant or start monetization on the strength of attribution/contact pages alone.

## Verification

All 288 regression tests, TypeScript and targeted lint passed. Browser checks covered contact, rights reporting and source credits in Serbian/English, dark/light themes and 320/390/820/1366px widths, plus the local report at 320/1366px: 26 checks, no hydration errors or horizontal overflow. The email fits on a single line at 320px. The rights page's Back link points to Contact.

A second zero-network run reproduced all counts using cached evidence. Comparing its fresh 1,197 Artist rows against the initial snapshot found zero changed rows and all IDs preserved. No full production build, Git push or deployment was performed in this pass. Full database-backed local Prisma page checks retain the previously documented Windows TLS limitation; the tested contact/source pages do not rely on that connection.

## Primary references

- [Wikimedia Terms: licensing and attribution](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use#7._Licensing_of_Content)
- [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- [MediaWiki revision API](https://www.mediawiki.org/wiki/API:Revisions)
- [MediaWiki API etiquette](https://www.mediawiki.org/wiki/API:Etiquette)
