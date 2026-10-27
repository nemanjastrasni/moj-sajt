import { Context, Gain, Synth } from "tone/build/esm/classes.js"
import { setContext } from "tone/build/esm/core/Global.js"
import { isMetronomeSettings, type MetronomeSettings } from "./model"

// Each panel owns its clock and output; stopping cannot affect other site audio.
export class MetronomeAudio {
  private context: Context
  private output!: Gain
  private synth!: Synth
  private settings: MetronomeSettings
  private beat = 0
  private disposed = false

  constructor(raw: AudioContext, settings: MetronomeSettings, onBeat: (beat: number) => void) {
    if (!isMetronomeSettings(settings)) throw new Error("Invalid metronome settings")
    this.settings = { ...settings }
    this.context = new Context({ context: raw, lookAhead: .05, updateInterval: .025 })
    try {
      // Tone evaluates default options even with explicit contexts; avoid a spare global device/worker.
      setContext(this.context)
      this.output = new Gain({ context: this.context, gain: settings.volume / 100 * .3 }).toDestination()
      this.synth = new Synth({ context: this.context, oscillator: { type: "sine" }, envelope: { attack: .001, decay: .025, sustain: 0, release: .01 } }).connect(this.output)
      this.context.transport.bpm.value = settings.bpm
      this.context.transport.scheduleRepeat(time => {
        if (this.disposed) return
        const beat = this.beat++ % this.settings.beats
        this.synth.triggerAttackRelease(this.settings.accent && beat === 0 ? 1320 : 880, .025, time)
        this.context.draw.schedule(() => { if (!this.disposed) onBeat(beat) }, time)
      }, "4n")
      this.context.transport.start(this.context.now())
    } catch (error) {
      this.disposed = true
      this.synth?.dispose(); this.output?.dispose(); this.context.dispose()
      throw error
    }
  }

  update(settings: MetronomeSettings) {
    if (this.disposed || !isMetronomeSettings(settings)) return
    if (settings.beats !== this.settings.beats) this.beat = 0
    this.settings = { ...settings }
    this.context.transport.bpm.value = settings.bpm
    this.output.gain.rampTo(settings.volume / 100 * .3, .015)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.context.transport.stop()
    this.context.transport.cancel(0)
    this.context.draw.cancel(0)
    this.synth.dispose()
    this.output.dispose()
    this.context.dispose()
  }
}
