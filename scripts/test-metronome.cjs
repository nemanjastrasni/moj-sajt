/* eslint-disable @typescript-eslint/no-require-imports -- Unit tests isolate the Tone clock without opening an audio device. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test } = require("node:test")
const assert = require("node:assert/strict"), Module = require("node:module")
const { isMetronomeSettings, DEFAULT_METRONOME, tapTempo } = require("../lib/metronome/model.ts")
const contexts = [], synths = [], gains = []
let failSynth = false
class Context {
  constructor(options) {
    this.options = options; this.disposed = false; this.startTime = null; this.callbacks = []
    this.transport = { bpm: { value: 0 }, scheduleRepeat: (callback, interval) => { this.callback = callback; this.interval = interval }, start: time => { this.startTime = time }, stop: () => { this.stopped = true }, cancel: time => { this.cancelled = time } }
    this.draw = { schedule: (callback, time) => this.callbacks.push({ callback, time }), cancel: time => { this.drawCancelled = time } }
    contexts.push(this)
  }
  now() { return 5.05 }
  dispose() { this.disposed = true }
}
class Gain {
  constructor(options) { this.options = options; this.gain = { rampTo: (value, duration) => { this.ramp = { value, duration } } }; gains.push(this) }
  toDestination() { return this }
  dispose() { this.disposed = true }
}
class Synth {
  constructor(options) { if (failSynth) throw Error("Audio device failed"); this.options = options; this.notes = []; synths.push(this) }
  connect(output) { this.output = output; return this }
  triggerAttackRelease(...args) { this.notes.push(args) }
  dispose() { this.disposed = true }
}
const original = Module._load
let MetronomeAudio
try {
  Module._load = function (request, parent, main) { return request.startsWith("tone/") ? { Context, Gain, Synth, setContext() {} } : original.call(this, request, parent, main) }
  ;({ MetronomeAudio } = require("../lib/metronome/audio.ts"))
} finally { Module._load = original }

test("only bounded integer settings are accepted, including silent volume", () => {
  assert.equal(isMetronomeSettings(DEFAULT_METRONOME), true)
  assert.equal(isMetronomeSettings({ ...DEFAULT_METRONOME, bpm: 40, beats: 1, volume: 0 }), true)
  assert.equal(isMetronomeSettings({ ...DEFAULT_METRONOME, bpm: 240, beats: 8, volume: 100 }), true)
  for (const [key, values] of Object.entries({ bpm: [39, 241, NaN, Infinity, 90.5, "90"], beats: [0, 9, 2.5, "4"], volume: [-1, 101, null, .5], accent: [0, "true", null] })) {
    for (const value of values) assert.equal(isMetronomeSettings({ ...DEFAULT_METRONOME, [key]: value }), false)
  }
  for (const value of [null, [], {}, "test"]) assert.equal(isMetronomeSettings(value), false)
})
test("tap tempo averages recent taps, clamps, ignores bounce and restarts after a pause", () => {
  let state = tapTempo([], 1000)
  assert.equal(state.bpm, null)
  for (const now of [1500, 2000, 2500, 3000, 3500]) state = tapTempo(state.taps, now)
  assert.equal(state.bpm, 120); assert.equal(state.taps.length, 5)
  assert.equal(tapTempo(state.taps, 3520).bpm, null)
  assert.equal(tapTempo(state.taps, 3400).bpm, null)
  assert.equal(tapTempo(state.taps, Infinity).bpm, null)
  assert.deepEqual(tapTempo(state.taps, 6000), { taps: [6000], bpm: null })
  assert.equal(tapTempo([0], 1800).bpm, 40)
  assert.equal(tapTempo([0], 150).bpm, 240)
})
test("Tone schedules exact audio timestamps and aligned visual beats, accenting the first beat only", () => {
  const beats = [], engine = new MetronomeAudio({}, { ...DEFAULT_METRONOME, beats: 3 }, beat => beats.push(beat))
  const context = contexts.at(-1), synth = synths.at(-1)
  assert.equal(context.interval, "4n"); assert.equal(context.transport.bpm.value, 90); assert.equal(context.startTime, 5.05)
  for (const time of [10, 10.5, 11, 11.5]) context.callback(time)
  assert.deepEqual(synth.notes.map(note => note[0]), [1320, 880, 880, 1320])
  assert.deepEqual(synth.notes.map(note => note[2]), [10, 10.5, 11, 11.5])
  assert.deepEqual(beats, [])
  for (const task of context.callbacks) task.callback()
  assert.deepEqual(beats, [0, 1, 2, 0]); engine.dispose()
})
test("live tempo, volume, accent and bar changes update the existing clock without duplicate loops", () => {
  const engine = new MetronomeAudio({}, DEFAULT_METRONOME, () => {})
  const context = contexts.at(-1), synth = synths.at(-1), gain = gains.at(-1), count = contexts.length
  context.callback(1)
  engine.update({ bpm: 140, beats: 2, volume: 0, accent: false })
  context.callback(2); context.callback(3)
  assert.equal(context.transport.bpm.value, 140); assert.equal(gain.ramp.value, 0)
  assert.equal(contexts.length, count); assert.deepEqual(synth.notes.map(note => note[0]), [1320, 880, 880])
  engine.update({ ...DEFAULT_METRONOME, bpm: 999 }); assert.equal(context.transport.bpm.value, 140)
  engine.dispose()
})
test("disposing cancels future audio and stale visual callbacks and is idempotent", () => {
  const beats = [], engine = new MetronomeAudio({}, DEFAULT_METRONOME, beat => beats.push(beat))
  const context = contexts.at(-1), synth = synths.at(-1), gain = gains.at(-1)
  context.callback(1); engine.dispose(); engine.dispose(); context.callback(2)
  for (const task of context.callbacks) task.callback()
  engine.update({ ...DEFAULT_METRONOME, bpm: 200 })
  assert.equal(synth.notes.length, 1); assert.deepEqual(beats, [])
  assert.equal(context.transport.bpm.value, 90); assert.equal(context.stopped, true)
  assert.equal(context.cancelled, 0); assert.equal(context.drawCancelled, 0)
  assert.equal(context.disposed, true); assert.equal(synth.disposed, true); assert.equal(gain.disposed, true)
})
test("independent panels never stop or retime each other's transport", () => {
  const a = new MetronomeAudio({}, DEFAULT_METRONOME, () => {}), ca = contexts.at(-1)
  const b = new MetronomeAudio({}, { ...DEFAULT_METRONOME, bpm: 200 }, () => {}), cb = contexts.at(-1)
  a.dispose(); assert.equal(cb.disposed, false); assert.equal(cb.transport.bpm.value, 200)
  assert.notEqual(ca, cb); b.dispose()
  assert.throws(() => new MetronomeAudio({}, { ...DEFAULT_METRONOME, bpm: 999 }, () => {}))
})
test("a partially initialized audio device releases its output and clock on failure", () => {
  failSynth = true
  try {
    assert.throws(() => new MetronomeAudio({}, DEFAULT_METRONOME, () => {}))
    assert.equal(contexts.at(-1).disposed, true); assert.equal(gains.at(-1).disposed, true)
  } finally { failSynth = false }
})
