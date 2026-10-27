/* eslint-disable @typescript-eslint/no-require-imports -- Tests use deterministic signals and fake media devices, never a real microphone. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const { GUITAR_STRINGS, TUNER_MIN_RMS, midiFrequency, centsFrom, noteName, stringChoice, TunerTracker, tunerError } = require("../lib/tuner/model.ts")
const { beginTuner } = require("../lib/tuner/session.ts")
const signal = (frequency, rate, amplitude = .3, harmonics = false) => Float32Array.from({ length: 4096 }, (_, i) => {
  const angle = 2 * Math.PI * frequency * i / rate
  return amplitude * (Math.sin(angle) + (harmonics ? .6 * Math.sin(2 * angle) + .3 * Math.sin(3 * angle) : 0))
})
const stable = (tracker, frequency, choice = "auto", clarity = 1) => { let value; for (let i = 0; i < 5; i++) value = tracker.update(frequency, clarity, choice); return value }
test("standard strings use E2 A2 D3 G3 B3 E4 and localize only the B/H name", () => {
  assert.deepEqual(GUITAR_STRINGS.map(string => Math.round(midiFrequency(string.midi) * 100) / 100), [82.41,110,146.83,196,246.94,329.63])
  assert.equal(noteName(59,"sr"),"H3"); assert.equal(noteName(59,"en"),"B3")
  for (const value of ["", "0", "7", "6.0", "-1", "auto", "constructor"]) assert.equal(stringChoice(value),"auto")
  assert.equal(stringChoice("6"),6)
})
test("real Pitchy detects all six guitar fundamentals at 44.1 and 48 kHz, including harmonic-rich plucks", async () => {
  const { PitchDetector } = await import("pitchy")
  const detector = PitchDetector.forFloat32Array(4096); detector.minVolumeAbsolute = TUNER_MIN_RMS
  for (const rate of [44100,48000]) for (const string of GUITAR_STRINGS) for (const harmonics of [false,true]) {
    const frequency = midiFrequency(string.midi), [found, clarity] = detector.findPitch(signal(frequency,rate,.3,harmonics),rate)
    assert.ok(Math.abs(centsFrom(found,frequency)) < 1, `${frequency} at ${rate}`)
    assert.ok(clarity >= .95)
    const reading = stable(new TunerTracker(),found,"auto",clarity)
    assert.equal(reading.target.number,string.number); assert.equal(reading.direction,"in_tune")
  }
})
test("silence, quiet audio and seeded noise cannot produce a green result", async () => {
  const { PitchDetector } = await import("pitchy")
  const detector = PitchDetector.forFloat32Array(4096); detector.minVolumeAbsolute = TUNER_MIN_RMS
  let seed = 42
  const noise = Float32Array.from({length:4096},()=>{seed=(1664525*seed+1013904223)>>>0;return(seed/2**32-.5)*.5})
  for (const samples of [new Float32Array(4096),signal(110,48000,.0001),noise]) {
    const [frequency, clarity] = detector.findPitch(samples,48000)
    assert.equal(stable(new TunerTracker(),frequency,"auto",clarity),null)
  }
})
test("sharp/flat directions compare the real target, with no octave folding or unsafe large-detune advice", () => {
  const target = midiFrequency(40)
  assert.equal(stable(new TunerTracker(),target*2**(-20/1200),6).direction,"flat")
  assert.equal(stable(new TunerTracker(),target*2**(20/1200),6).direction,"sharp")
  assert.equal(stable(new TunerTracker(),target*2,6).direction,"wrong_string")
  assert.equal(stable(new TunerTracker(),target*2,6).midi,52)
  assert.equal(stable(new TunerTracker(),target*2**(4/1200),6).direction,"in_tune")
})
test("three stable clear frames are required and weak/noisy/out-of-range or changed tones clear stale tuning", () => {
  const tracker = new TunerTracker(), e = midiFrequency(40), a = 110
  assert.equal(tracker.update(e,1,"auto"),null); assert.equal(tracker.update(e,1,"auto"),null)
  assert.equal(tracker.update(e,1,"auto").direction,"in_tune")
  assert.equal(tracker.update(a,1,"auto"),null)
  for (const [frequency, clarity] of [[NaN,1],[Infinity,1],[0,1],[59,1],[421,1],[e,.94],[e,NaN],[e,1.1]]) assert.equal(stable(tracker,frequency,"auto",clarity),null)
  stable(tracker,e); assert.equal(tracker.update(0,0,"auto"),null)
  assert.equal(tracker.update(e,1,"auto"),null)
  assert.equal(tracker.update(e,1,999),null)
})
function fixture(options = {}) {
  let interrupted = 0, received = [], engines = 0
  const instances = []
  const track = new EventTarget(); Object.assign(track,{readyState:"live",stops:0,stop(){this.readyState="ended";this.stops++}})
  const stream = {getTracks:()=>[track],getAudioTracks:()=>[track]}
  const context = {state:"suspended",onstatechange:null,closed:0,resume(){this.state="running";return options.resume ? options.resume() : Promise.resolve()},close(){this.state="closed";this.closed++;return Promise.resolve()}}
  class Audio {
    constructor(ctx,s,choice,reading){ assert.equal(ctx,context);assert.equal(s,stream);if(options.engineFails)throw Error("Failed");engines++;instances.push(this);this.choice=choice;this.reading=reading }
    select(value){this.choice=value}
    dispose(){this.disposed=true}
  }
  const deps = {context:()=>context,microphone:()=>options.microphone ? options.microphone(stream) : Promise.resolve(stream),audio:()=>options.audio ? options.audio() : Promise.resolve({TunerAudio:Audio}),timeoutMs:options.timeoutMs ?? 1000}
  return {context,stream,track,deps,begin:()=>beginTuner("auto",value=>received.push(value),()=>interrupted++,deps),engine:()=>instances.at(-1),engines:()=>engines,interrupted:()=>interrupted,received}
}
test("an explicit session resumes immediately, delivers readings and disposes mic and context exactly once", async () => {
  const f=fixture(),session=f.begin();assert.equal(f.context.state,"running");await session.ready
  f.engine().reading({test:true});assert.equal(f.received.length,1)
  session.select(2);assert.equal(f.engine().choice,2)
  session.stop();session.stop();f.engine().reading({test:true})
  assert.equal(f.received.length,1);assert.equal(f.track.stops,1);assert.equal(f.context.closed,1);assert.equal(f.engine().disposed,true)
})
test("cancel while permission is pending closes immediately and stops a later granted stream", async () => {
  let grant
  const f=fixture({microphone:stream=>new Promise(resolve=>{grant=()=>resolve(stream)})}),session=f.begin()
  session.stop();await assert.rejects(session.ready,{name:"AbortError"});assert.equal(f.context.state,"closed")
  grant();await new Promise(resolve=>setImmediate(resolve));assert.equal(f.track.readyState,"ended");assert.equal(f.engines(),0)
})
test("timeout is bounded and late permissions never reactivate capture", async () => {
  let grant
  const f=fixture({timeoutMs:5,microphone:stream=>new Promise(resolve=>{grant=()=>resolve(stream)})}),session=f.begin()
  await assert.rejects(session.ready,{name:"TimeoutError"});grant();await new Promise(resolve=>setImmediate(resolve))
  assert.equal(f.track.readyState,"ended");assert.equal(f.context.state,"closed");assert.equal(f.engines(),0)
})
test("denied capture, module failure, resume failure and engine failure release every acquired resource", async () => {
  for (const options of [
    {microphone:()=>Promise.reject(new DOMException("secret details","NotAllowedError"))},
    {audio:()=>Promise.reject(Error("module"))},
    {resume:()=>Promise.reject(Error("resume"))},
    {engineFails:true},
    {microphone:()=>{throw Error("sync")}},
  ]) {
    const f=fixture(options),session=f.begin();await assert.rejects(session.ready)
    assert.equal(f.context.state,"closed")
    if (!options.microphone) assert.equal(f.track.readyState,"ended")
  }
})
test("track ended/muted and audio context interruption stop capture and notify only once", async () => {
  for (const event of ["ended","mute","context"]) {
    const f=fixture(),session=f.begin();await session.ready
    if(event==="context"){f.context.state="suspended";f.context.onstatechange()}
    else f.track.dispatchEvent(new Event(event))
    f.track.dispatchEvent(new Event("ended"));assert.equal(f.interrupted(),1)
    assert.equal(f.track.readyState,"ended");assert.equal(f.context.state,"closed");assert.equal(f.engine().disposed,true)
  }
})
test("selection changes during permission startup reach the eventual detector without another mic request", async () => {
  let grant
  const f=fixture({microphone:stream=>new Promise(resolve=>{grant=()=>resolve(stream)})}),session=f.begin()
  session.select(1);grant();await session.ready;assert.equal(f.engine().choice,1);assert.equal(f.engines(),1);session.stop()
})
test("error messages distinguish user actions without echoing device or implementation details", () => {
  for (const name of ["NotAllowedError","SecurityError","NotFoundError","NotReadableError","TimeoutError","NotSupportedError","Other"]) {
    const text=tunerError({name,message:"private device label or internal trace"})
    assert.ok(text.length>10);assert.ok(!text.includes("private"))
  }
})
