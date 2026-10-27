# Guitar Tuner

- Gauge icon beside the metronome in the shared utility bar and performance reader.
- Standard guitar tuning: MIDI 40/45/50/55/59/64, E2 A2 D3 G3 B3 E4. Serbian displays B natural as H; English uses B. A4 is fixed at 440 Hz.
- Automatic nearest standard string, plus explicit string selection. The actual detected note/octave and full target-relative cents are displayed; pitches are never octave-folded to fake an in-tune result.
- Stable readings within +/-5 cents turn green. Detuning over 300 cents asks to check the string rather than instructing a large tightening/loosening.
- Pitchy 4.1.0 (MIT) supplies McLeod pitch detection; FFT implementation is not hand-written. Pitchy and fft.js notices are also published at `/licenses/tuner.txt` and referenced in the audio module.
- Analysis: 4,096 samples, at most 20 frames/sec, minimum -50 dB RMS, clarity >=0.95, 60-420 Hz range. Three consistent frames are required; a median of up to five frames smooths display. Invalid/noisy frames immediately clear old readings.
- A single clear guitar string is expected, not chords/full songs. Dominant harmonics, noisy rooms, weak microphones and Bluetooth processing can still mislead a software tuner. Hardware device checks remain necessary.

## Microphone Privacy

- Opening the panel does not request capture or load pitch detection. Only Enable microphone starts getUserMedia/audio context/lazy local code.
- HTTPS (or localhost) and browser permission are required. No backend endpoint, recording, upload, transcription, microphone label logging or audio storage is used.
- Input connects only to a local analyser, never to the speakers. Requests disable echo cancellation/noise suppression/automatic gain when the browser honors those optional constraints.
- Stop/X/Escape, route navigation, pagehide, hidden tab, ended/muted track and audio interruption stop every capture track, cancel analysis, and close the context.
- Permission startup can be cancelled, and times out after 20 seconds. A late granted stream after cancellation/failure is immediately stopped and cannot revive the panel.
- Reopening never auto-starts. Selecting a string reuses the current mic and clears the previous reading.
- Tuner and metronome share an exclusive audio-tool claim so a minimized click track cannot confuse microphone detection; opening either stops the other.

## Verification

`npm run test:tuner` covers real Pitchy synthetic fundamentals and harmonic mixtures at 44.1/48 kHz, silence/noise gating, cents and octave semantics, stability, asynchronous cancellation/late grants, failure cleanup, interruptions and selection changes. Browser QA uses synthetic MediaStreams, never a real user's microphone, and checks layouts, permission errors, detected/flat/sharp/silent notes and complete cleanup. Real Android/iPhone microphone and acoustic checks should follow deploy.

Browser verification passed 12 off/tuned/reader layout combinations across 320x800, 390x844, 844x390 and 1366x900 with both themes/languages. It verified actual Pitchy analysis of synthetic MediaStreams, no input-to-speaker connection, no permission request before Enable, B/H naming, manual selection without recapture, cancelled late grants, denied/missing/busy device recovery, visibility/mute/context interruptions, exclusive metronome handoff, nested native fullscreen, Escape focus behavior, route changes and pagehide. No live user records or real microphones were used.

References: https://github.com/ianprime0509/pitchy and https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia.
