# Capo Recommendations

The song page and performance view offer a temporary capo setting from fret 0
(no capo) through fret 12. Opening the control applies the suggested position;
the selector and step buttons explore alternatives. Reset restores the source
shapes at the current sounding transposition.

Capo changes never write songs, reviews or favorite transpositions. The chosen
position is not saved to an account. A song opened in playlist performance
passes its current capo in the performance URL, scoped to that initial song.
Subsequent songs do not inherit the previous song's position. Favorite key
restoration continues to work independently.

## Musical Behavior

The shape offset is `sounding transpose + original capo - selected capo`.
The existing chord-symbol parser and transposer preserve extensions,
alterations and slash bass. Bass runs follow the same offset but are excluded
from shape-difficulty ranking. Source token columns and lyrics are not moved.

Ranking favors eight common open triads (C, D, E, G, A, Am, Dm, Em), then
common open extensions. Barre or unfamiliar shapes cost more. Unique shapes
have the main influence; capped occurrence counts and a high-fret penalty
provide secondary preferences. This is a deterministic heuristic for common
standard-tuning fingerings, not a guarantee of every guitarist's easiest
voicing, best tone or fastest chord changes. It never drops chord tones to
manufacture an easier result. There is no promise that all songs can be played
with six basic shapes.

Explicit standalone source headers such as `Capo 2`, `Capo II`, `[Capo: 5]`
and `kapodaster na 3. pragu` are included once in the sounding offset. Converted
views remove those source headers to avoid conflicting fret instructions.
Ambiguous or conflicting recognized headers disable conversion rather than
guess. An undeclared capo, unusual tuning or unrecognized embedded instruction
cannot be reliably inferred; recommendation quality also depends on accurate
source chords. Partial capos and alternate-tuning fingerings are not supported.

Tablature numbers stay unchanged and receive a warning. Capo conversion only
changes recognized chord symbols and bass notes, not tablature, recordings or
embedded videos.

## PDF and Interface

Single-song PDF export follows the selected capo, prints its fret and uses the
same converted chord shapes as the screen. Existing playlist/songbook exports
do not acquire an account-wide capo setting. Without a selected capo their
behavior stays unchanged.

Controls are translated in Serbian/English, themed in dark/light, use 44px
targets and fit on a 320px viewport. Expanding a panel belongs to its song;
changing songs resets the panel. An initial performance capo is honored both
when content is present on mount and when loaded asynchronously.

## Verification

Run `npm run test:capo` and `npx tsc --noEmit`. Tests cover all fret positions,
positive/negative transpositions, sounding roots and slash bass, preserved
extensions, source capo headers, no-chord cases, tablature and real PDFs.

The 2026-10-29 review also checked 24 browser viewport/theme/language
combinations, source/ambiguous/no-chord examples, original reset, key changes,
performance state transfer, playlist next-song isolation and browser-generated
PDF content. API/session fixtures were intercepted locally, with no real
database writes. Temporary preview routes were removed after verification.

Physical-device/audio comparison and a full production build were not verified
in this review. These checks do not validate every song's musical accuracy.
Persistent per-song capo preferences and side-by-side ranked alternatives are
possible follow-ups, not requirements of this first version.
