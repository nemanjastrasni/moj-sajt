# PDF Songs and Favorite Songbooks

## User Flow

- Every song has a PDF button next to the title actions. It exports the loaded text with the current transpose, text size and chord size, without menus, video or ads.
- In Favorites, open PDF book, select songs, arrange their order, set a transpose for each song, enter a title and download. Books include a cover, optional clickable contents and numbered A4 pages. Each song starts on a new page.
- A draft is saved in localStorage under `gitarakordi-songbook:<userId>`. There is one draft per account per browser, not a database-backed library or cross-device sync. New book clears only that draft, never favorites.
- A downloaded PDF is usable offline. Generating a book requires an online authenticated session; single-song generation needs its text and the locally served fonts to be loaded.

## Implementation

- `lib/songbook/layout.ts` reuses the existing song-sheet parser, grouping and wrapping rules. Chord/lyric pairs and six-string tablature groups stay together across page breaks. Transposition uses the existing chord-symbol implementation.
- `lib/songbook/pdf.ts` creates selectable text/vector PDFs with pdf-lib and embedded DejaVu Sans Mono fonts. Serbian Latin and Cyrillic are covered. Unsupported glyphs fail explicitly instead of silently producing unreadable text. Source parsing issues are not rewritten in the database.
- The PDF engine and fontkit are dynamically imported on export. Fonts are same-origin static files in `public/fonts/songbook`, with their source, checksum and full license. No third-party PDF service receives song text.
- `/api/songbook` is a read-only POST endpoint. It checks the current non-banned user, JSON body and same-origin policy, then fetches only that user's selected favorites. Client-supplied titles, lyrics and user IDs are ignored. Responses are private/no-store. Missing favorites fail the whole request, never silently omit songs.
- Limits: 100 songs, 100,000 characters per song, 1,500,000 total lyric characters, 3.8 MB encoded API response, 500 PDF pages. Books allow 8-16 pt text; individual exports convert existing screen sizes to 8-24 pt. Transpose is normalized to a semitone offset within -11 to +11.
- A visible download link remains after generation for browsers that block an automatic download. Old blob URLs are revoked on replacement/unmount. Failed fetches can be retried.
- No schema migration or production database write is required.

## Verification

Run `npm run test:songbook` for validation, draft persistence, layout, real PDF generation, API authorization and client error handling tests. Tests mock authentication/database reads and never mutate a database. Generated QA files in `reports/songbook` are ignored by Git.

Browser QA covers selection/order, negative transpose entry, manual text-size entry, draft reload and account isolation, authorization/font failures and retries, actual PDF downloads, and 320/390/820/1366 px layouts in both themes/languages. Rendered PDFs are checked for Unicode, page boundaries, chord/lyric grouping, complete text, clickable contents and correct page numbers.
