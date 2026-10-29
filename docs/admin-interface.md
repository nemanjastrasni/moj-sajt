# Admin Interface

Admin routes keep their server-side current-role guard. The presentation uses
`AdminFrame`, six section links with a current-page marker, and one shared control
stylesheet, `app/controls.css`. The legacy `/admin/edit` redirect remains available
but is no longer a duplicate menu item.

Songs, artist forms, reports, users, playlist dialogs and public admin action
dialogs share the same button/input/dialog sizing and theme tokens. The guitar
header is preserved. Desktop has a side navigation; smaller widths use a
scrollable section navigation. Mobile users are laid out as labeled rows rather
than requiring a horizontal scroll to reach presence or actions.

Role changes require a modal confirmation. Artist deletion and user blocking
require typing the target name/email. These confirmations are UI safeguards,
not substitutes for server authorization. Blocking now checks the current
database admin role instead of trusting the role stored in an old session.

The overview uses real counts, not hard-coded metrics. Database errors do not
display fake zero counts or connection details. The admin error boundary gives
a retry action and warns to check previous writes before resubmitting.

Verification on 2026-10-29 included 320/390/820/1440px, dark/light themes, actual
shared component fixtures for lists, editors, reports and users, confirmation
cancel/error/retry, typed form submission without nested forms, and playlist
dialogs. Browser writes were intercepted; no real accounts/content were modified
by those UI tests. Temporary fixture routes were removed after checking.

This does not claim a complete end-to-end test of every admin action against the
live site. Database permission changes and the missing submission table setup
are recorded separately in `docs/database-access.md`.

The isolated production check compiled successfully and passed Next's type
validation. Its static generation then failed on `/top-50/strane` because the
Windows Prisma engine could not open TLS (`No credentials are available in the
security package`, OS error -2146893042). TLS verification was not disabled.
The full production build is therefore not reported as passing.
