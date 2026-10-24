# Interface languages

Serbian (default, sr-Latn) and English are supported for the primary public interface: navigation/account menu, theme switch, home headings/categories, search, authentication forms and messages, profile fields, song controls/chord preview controls, playlist controls and song submission forms/statuses.

Category names in English are Ex-Yu Folk (narodne), Ex-Yu Pop & Rock (domace) and International (strane). These are display labels only. Routes, slugs, database categories, form option values, search matching and playlist/song data remain unchanged. International means the site's non-Ex-Yu collection, not just US/UK music.

Song titles, artist names, original lyrics/chords/tabs, user biographies, playlist names and administrator review notes are never automatically translated. SongSheet is marked translate=no. The instructional submission example is UI copy and has its own English version; the entered song stays unchanged.

Language selection lives next to the theme switch and is stored as gitarakordi-language in localStorage. It works for guests, survives reload/navigation and synchronizes across tabs. No database migration, external translation service, language URLs or API contract change is required. Storage failure allows switching in the current tab but defaults to Serbian again on reload.

lib/i18n/messages.ts contains an explicit source-copy dictionary. Only use t/UiText for interface strings, never user or music content. Unknown messages fall back to their original text, never an automatic/machine translation. UiText/CategoryLabel/UiDate can be embedded in server components; useI18n is restricted to client components. Raw server error responses remain stable and are translated only where displayed by the UI.

The root script sets the document language before hydration. Server HTML remains Serbian, with client-side English UI after hydration. This is not a multilingual SEO implementation: metadata, canonical URLs, biographies and full editorial/admin back-office pages are not translated by this change. For indexable localized content, plan a separate locale routing/server-rendering project.

Verification: npm run test:i18n plus the existing theme/auth/search/chord/submission suites and npx tsc --noEmit. Browser checks should verify both themes/locales, narrow screen wrapping, forms keeping their entered values, original song content unchanged, search showing original names, and navigation/reload persistence.

Verified locally: 88 tests passed across all six suites. TypeScript and targeted lint for the new localization layer and primary updated components passed. Browser checks at 320, 390, 820 and 1366px verified adjacent controls without overflow, English menus/categories/search, remembered language, independent theme and cross-tab updates. Song titles deliberately matching UI keys stayed original, as did the full chord/lyric rendering and form values/submission JSON. Mobile chord variation arrows still worked in English. Profile/user review notes remained original while labels/statuses changed. The actual signup and playlist index routes were checked, including English client validation/server error display and responsive layout.

Visual checks used mocked API responses and a temporary fixture for database-backed content; that fixture has been removed. No live database publication was performed. No full production build was rerun in this change; the prior build is locally blocked by the documented Supabase/Windows TLS issue during existing prerenders. Existing legacy lint findings outside the targeted files remain out of scope.
