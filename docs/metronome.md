# Metronome

- Available from the Timer icon beside theme/language and in the performance reader.
- Anonymous and signed-in visitors use the same client-only tool; no database changes or paid entitlement.
- Tempo: integer 40-240 BPM. One click per beat, 1-8 beats per bar, optional first-beat accent, 0-100% volume, tap tempo.
- Tone.js 15.1.22 (MIT) supplies the audio clock, scheduling and synthesis. A private Context/Transport is used, not the global Tone Transport.
- Audio code loads only after Start. The native AudioContext is created/resumed within the click gesture before awaiting the dynamic import.
- No microphone, recordings, external samples, account data or audio uploads.
- Only validated settings are saved locally under `gitarakordi-metronome-v1`; playback never auto-starts.
- Stop, close, Escape, navigation, hidden tab/pagehide and audio interruption dispose the sound and clock. Opening after X/Escape is always stopped.
- Minimize explicitly hides only the panel so visitors can read/scroll the song while hearing the beat. Its Timer icon turns green while playing; reopening that panel retains the current beat. X/Escape fully stop and dispose, unlike Minimize.
- Opening the reader's metronome stops a minimized header metronome (and vice versa), so two instances never tick simultaneously.
- The panel works inside the native-fullscreen reader and restores keyboard focus on close.
- Browser audio interruptions require another explicit Start. Background/lock-screen playback is intentionally not supported.
- Verify on real Android/iPhone hardware before promising timing under Bluetooth or OS interruptions; desktop emulation does not establish device audio latency.

Checks: `npm run test:metronome`, `npm run test:performance`, `npm run test:i18n`, TypeScript and ESLint. Browser QA covers mobile/landscape/desktop, themes/languages, actual audio output/timing, cleanup, focus and failure recovery.

Browser QA used fake song/session fixtures and intercepted API responses, not real user data. Web Audio oscillator start times measured 0.5-second spacing at 120 BPM and 0.25-second spacing at 240 BPM, within 2 ms; an analyser confirmed nonzero sound output. Checks also covered minimize/resume without recreating audio, cross-panel handoff, native fullscreen, unsupported-device recovery, interruptions, visibility/pagehide/navigation cleanup and focus restoration. This is browser verification, not an Android/iPhone hardware or Bluetooth latency guarantee.
