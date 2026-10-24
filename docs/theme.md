# Site theme

- Default: dark, intentionally independent of OS settings. The switch below the guitar menu enables light mode. Its accessible name is Svetla tema, with role=switch and aria-checked.
- Stored locally as gitarakordi-theme, available to guests and signed-in users. No database migration, authentication changes or new API is required. Storage failures fall back to dark on reload but do not disable switching in the current tab.
- A static initialization script in the root head applies the saved value before paint. React subscribes to the document value with useSyncExternalStore and listens for changes in other tabs. Only the root theme attribute/style has hydration suppression.
- app/theme.css bridges existing neutral utility colors into theme tokens, so page layout, routes and domain behavior remain unchanged. New components should prefer the same semantic variables.
- theme-dark-surface is an explicit exception for text on photographs/illustrations; do not remove it when changing media. theme-photo-band additionally provides the original dark base behind translucent decorative photos. Filled actions keep white lettering. theme-solid-action preserves a black call-to-action in both themes.
- Photos and chord PNGs are unchanged. White transparent chord diagrams sit on a dark plate; their surrounding controls and cards follow the selected theme. No image inversion or filter is used.
- Song category/artist page scrims follow the page theme while artist banners keep photo contrast. The light guitar neck keeps the same positions and geometry with maple colors/grain.
- The switch has fixed dimensions, a 44px touch target and reduced-motion support. This change does not implement translations.

Run npm run test:theme, the existing auth/search/chord/submission suites, TypeScript and targeted lint. Verify both themes on desktop/tablet/mobile, keyboard switching, remembered preference after navigation/reload and storage-disabled behavior.

Verified locally: 77 unit/regression tests passed, as did TypeScript and lint for the new theme module/toggle/root layout. Browser checks at 320, 390, 820 and 1366px covered switch geometry, no horizontal overflow, persistence across reload/navigation, cross-tab synchronization, keyboard switching, search/profile dropdowns, photo text contrast and preserved image overlays. A temporary data-only fixture checked song cards/touch previews, profile fields and submission form colors; it was removed afterward. API responses in these visual tests were mocked, not live Supabase data. Login was checked on its actual route. No browser runtime errors were observed.

The repository already has lint findings in legacy pages (for example explicit any in favorites); they are not introduced by theme changes. A full production build was not rerun for this change; the prior build remains blocked locally by the documented Supabase/Windows TLS connection error during prerendering.
