/*! Pitchy and fft.js MIT license notices: /licenses/tuner.txt */
import { PitchDetector } from "pitchy"
import { TUNER_MIN_RMS, TunerTracker, type StringChoice, type TunerReading } from "./model"

export class TunerAudio {
  private source: MediaStreamAudioSourceNode
  private analyser: AnalyserNode
  private detector = PitchDetector.forFloat32Array(4096)
  private buffer = new Float32Array(4096)
  private tracker = new TunerTracker()
  private frame = 0
  private disposed = false
  private choice: StringChoice

  constructor(context: AudioContext, stream: MediaStream, choice: StringChoice, onReading: (reading: TunerReading | null) => void) {
    this.choice = choice
    this.source = context.createMediaStreamSource(stream)
    this.analyser = context.createAnalyser()
    try {
      this.analyser.fftSize = 4096; this.analyser.smoothingTimeConstant = 0
      this.detector.minVolumeAbsolute = TUNER_MIN_RMS
      // No connection to destination: microphone audio must never feed the speakers.
      this.source.connect(this.analyser)
      let last = -Infinity
      const analyse = (time: number) => {
        if (this.disposed) return
        if (time - last >= 50) {
          last = time
          this.analyser.getFloatTimeDomainData(this.buffer)
          const [frequency, clarity] = this.detector.findPitch(this.buffer, context.sampleRate)
          onReading(this.tracker.update(frequency, clarity, this.choice))
        }
        this.frame = requestAnimationFrame(analyse)
      }
      this.frame = requestAnimationFrame(analyse)
    } catch (error) { this.dispose(); throw error }
  }
  select(choice: StringChoice) { this.choice = choice; this.tracker.reset() }
  dispose() {
    if (this.disposed) return
    this.disposed = true; cancelAnimationFrame(this.frame)
    this.source.disconnect(); this.analyser.disconnect()
  }
}
