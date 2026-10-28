# Compact Mobile Guitar Header

Below 768px the existing stepped guitar menu becomes a 56px neck strip (57px including the outer border), with the original dark/maple theme backgrounds and frets. It contains an icon-only logical Back link when applicable, the site-name home link, a search trigger and a menu toggle. Controls are at least 44px square. At 768px and above the old desktop navigation and controls keep their original layout.

The mobile menu is a normal disclosure in document flow, not an ARIA menu or a modal. It pushes content down when expanded, scrolls within the remaining dynamic viewport, and does not trap focus or lock body scrolling. It includes the main links, all three song categories, role-aware account links, presence counts and the existing tuner/metronome/theme/language controls. Images alone do not determine authentication. Existing server authorization remains unchanged; hiding an admin link is not a security boundary.

The same tool/settings component tree is shared between desktop and mobile and stays mounted when the disclosure collapses. A minimized, playing metronome can continue with the menu closed; a green dot and accessible status on the menu button indicate it is active. Closing/stopping the metronome clears the indicator. Tuner permission remains explicit; opening a menu or tuner panel never starts microphone capture. Existing route/visibility/audio resource cleanup remains in place.

The presence heartbeat remains in the outer Menu component, not duplicated in desktop/mobile variants or restarted by toggling the disclosure. Pathname-keyed navigation clears transient menus, search and tools after navigation. The existing logical Back/playlist parent provider remains unchanged. Resize across the breakpoint closes transient disclosures, and Escape returns focus to the relevant trigger. Pointer interaction outside the header closes ordinary disclosures without hijacking a native tool dialog's events.

## Global Mobile Search

The search icon opens a labeled native dialog, focuses the search field and restores focus/body overflow on close. The original SongSearch request limits, debounce, abort/error/retry and keyboard selection behavior remain shared with the homepage. An optional `inlinePopup` keeps results inside the native dialog's top layer; ordinary page search retains its body portal. An optional `onNavigate` closes the dialog immediately on result selection, including keyboard Enter, rather than waiting for the next page to finish loading. Album/song text and URLs are not changed.

## Checks

- `npm run test:mobile-header`: six server-rendering/accessibility/role/account-escaping/control-sharing checks, using synthetic sessions and no database writes.
- All 387 regression tests, TypeScript and targeted frontend lint passed.
- Browser checks used mocked API responses/session identities. Twenty Serbian/English, dark/light and viewport combinations (320, 390, 767, 768 and 1366px) passed without page overflow or runtime errors. A 320px-high search viewport also retained reachable, clickable results.
- Measured admin-header reduction at 390px: 403px to 57px. At 1366px, before/after header screenshots are pixel-identical and the height remains 281px.
- Checked native search focus/results, click selection, error/retry, Escape, scrollable account menu, role-aware links, safe real `/kontakt` -> `/akordi` -> home navigation and logical Back.
- Checked tuner opening without microphone permission, metronome opening/playing/minimizing with menu collapsed, status-dot persistence and cleanup on Escape. Audio output was muted for the browser check. No physical microphone, phone keyboard or real Google login was tested.
- Screenshots and isolated build artifacts are ignored under `reports/mobile-header`. The development server runs at `http://127.0.0.1:3000`.

An isolated production build compiled successfully and completed type checking. Full prerendering did not complete: the existing `/top-50/domace` page requires a database connection, and the isolated build intentionally used a non-production closed localhost port instead of live credentials. This is not a successful full production build and not evidence that production data connectivity works. Its temporary source copies/junctions were removed after recording the result so they do not pollute the project's TypeScript input set.

No database/schema changes, content maintenance, Git push or deployment are part of this change. The previously prepared three discography updates remain a separate post-deployment task.
