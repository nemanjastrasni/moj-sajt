# Artist photo audit and review

This is an offline maintenance tool, not a new public website feature. It reads artist identity/image fields and song counts. It does not update the database, overwrite manual photos, import biographies/discographies or modify the existing wiki_full_import.js script.

## Commands

Run from the repository root with development dependencies installed:

```powershell
npm run artists:images -- audit --ca "C:\path\to\prod-ca-2021.crt" --check-remote
npm run artists:images -- discover --ca "C:\path\to\prod-ca-2021.crt" --balanced --limit 30 --download
```

Set ARTIST_IMAGES_CA to avoid passing --ca each time. .env.local/.env are read locally; no credentials are copied to reports. The pg client explicitly verifies TLS certificates and hostnames. It uses the Supabase CA supplied by the project owner, without disabling TLS. This connection is separate from the application's existing Prisma connection; no application environment settings are changed.

The default data source is the live database in a READ ONLY transaction. --snapshot backup.sql or --snapshot artists-export.json can be used explicitly for offline work; reports prominently mark this as an old snapshot, not live data. A name-only JSON export has unknown image coverage, never falsely counted as missing. Only the Artist COPY block is extracted from SQL dumps; account/password data is not exported.

Reports go under reports/artist-images and are gitignored. Each contains report.json and a standalone index.html with a searchable catalog and candidate gallery. --report-dir selects a known output folder; reruns replace generated report files, not source photographs. API JSON is cached for 7 days. --download saves eligible previews under the report's staged directory, not public/. Previews retain the full aspect ratio, rotate by EXIF orientation, resize inside 960x960 without enlargement, and encode as WebP. File names are content-addressed and created exclusively, so existing staged files are not overwritten.

## Matching and review

- Existing nonempty image fields are never candidates for replacement, including broken/unchecked links.
- Discovery selects missing fields only; --limit bounds a batch to at most 100. Default is 12. --balanced rotates among Zabavne/Narodne/Strane, prioritizing more represented artists within each category. --category and repeated --name flags narrow the selection.
- Candidate identity needs an exact normalized label/alias match and structured Wikidata evidence: a musical group, or a human with a musician/singer occupation or bounded subclass. Serbian Cyrillic and Latin accents are normalized; spelling errors and incomplete names are not guessed.
- Multiple musical matches stay ambiguous. Albums, species and other subjects are not accepted merely because their name matches. There is no first-search-result import.
- P18 supplies the proposed portrait/group image. Logos/signatures/SVGs are excluded. Commons metadata retains source, author, license URL and restrictions. Only a conservative set of known free-photo licenses and adequate JPEG/PNG/WebP dimensions can be staged. Jurisdiction-specific or unclear licenses stay for manual review. This filter is not legal clearance; inspect the source page and respect attribution, share-alike and any other applicable rights before publication.
- Every proposed image still requires human review. Search results are a shortlist, not proof of exhaustive identity resolution. No mass publication or apply command exists in this version.
- Do not publish files from staged/ without appropriate visible author/license/source credits. A production import should be a separate reviewed step, rechecking the current image field and using conditional updates only for still-empty fields. The 56 currently assigned images remain untouched.

## Image checks

--check-remote checks current URLs with bounded HTTPS requests and image decoding. Private/reserved IPs, credentials, custom ports and unsafe redirects are blocked; DNS addresses are pinned to prevent rebinding. Certificate/host verification stays enabled. Timeouts, blocked sites and uncertain decoding are unverified, not automatically declared missing. Only definite missing local files and HTTP 404/410 are broken. Unverified photos are preserved for manual inspection. Local public paths are resolved and checked for traversal/symlink escapes. Wikimedia discovery uses a separate strict host allowlist.

## Verification

npm run test:artist-images covers snapshot safety, identity normalization/musical types, animal rejection, ambiguity, license filters, path protection, network restrictions, bounded requests, staging/aspect ratio and escaped review HTML. The audit/discovery commands can be run repeatedly without database writes.

Initial live audit: 1,198 artists; 56 assigned images; 1,142 missing image fields. 55 assigned images were verified as decodable remote images; the Babe URL could not be verified and was preserved. A balanced batch of 30 missing-image artists produced 21 staged review previews, 1 ambiguous identity, 4 unmatched names, 2 identities without a usable P18 photo and 2 license/quality reviews. Makedonske Pesme and Starogradske pesme appear to be collection labels rather than individual artists and require catalog review; U 2/Lexington were not guessed from incomplete names. These findings are a snapshot, not a permanent completeness guarantee.

16 focused tests and TypeScript passed. The standalone gallery was checked at desktop/mobile widths: all 21 local prepared images rendered, all 30 review entries were present, and filtering worked. A fresh database read after the run confirmed 56 assigned image fields and zero changed preexisting image values. No photos were published. Local reports/previews remain excluded from Git; only the tooling/docs/dependency changes are intended for commit.

Sources: [Wikidata data access](https://www.wikidata.org/wiki/Help:Data_access), [MediaWiki imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo), [Commons metadata](https://www.mediawiki.org/wiki/Extension:CommonsMetadata/en), [Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia), [Supabase SSL verification](https://supabase.com/docs/guides/platform/ssl-enforcement).
