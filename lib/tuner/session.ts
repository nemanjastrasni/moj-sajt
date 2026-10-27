import type { TunerAudio } from "./audio"
import type { StringChoice, TunerReading } from "./model"

type Dependencies = {
  context: () => AudioContext
  microphone: () => Promise<MediaStream>
  audio: () => Promise<{ TunerAudio: typeof TunerAudio }>
  timeoutMs?: number
}
const browserDependencies: Dependencies = {
  context() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.AudioContext) throw new DOMException("Unsupported", "NotSupportedError")
    return new AudioContext({ latencyHint: "interactive" })
  },
  microphone: () => navigator.mediaDevices.getUserMedia({ video: false, audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }),
  audio: () => import("./audio"),
}

export function beginTuner(choice: StringChoice, reading: (value: TunerReading | null) => void, interrupted: () => void, dependencies = browserDependencies) {
  const context = dependencies.context()
  let stream: MediaStream | null = null, engine: TunerAudio | null = null, disposed = false, selection = choice
  let timer: ReturnType<typeof setTimeout> | undefined
  let cancel: () => void = () => {}
  const cancelled = new Promise<never>((_, reject) => { cancel = () => reject(new DOMException("Stopped", "AbortError")) })
  void cancelled.catch(() => {})
  const tracks = () => stream?.getTracks() ?? []
  const stop = () => {
    if (disposed) return
    disposed = true; clearTimeout(timer); cancel()
    context.onstatechange = null
    for (const track of tracks()) { track.removeEventListener("ended", lost); track.removeEventListener("mute", lost); track.stop() }
    engine?.dispose()
    if (context.state !== "closed") void context.close().catch(() => {})
  }
  const lost = () => { if (!disposed) { stop(); interrupted() } }
  const ready = (async () => {
    try {
      // Resume before any await so mobile browsers retain the explicit click gesture.
      const resumed = context.resume()
      void resumed.catch(() => {})
      const captured = dependencies.microphone().then(value => {
        if (disposed) { value.getTracks().forEach(track => track.stop()); throw new DOMException("Stopped", "AbortError") }
        stream = value; return value
      })
      const [{ TunerAudio }, , capturedStream] = await Promise.race([
        Promise.all([Promise.resolve().then(dependencies.audio), resumed, captured]), cancelled,
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new DOMException("Timed out", "TimeoutError")), dependencies.timeoutMs ?? 20000) }),
      ])
      clearTimeout(timer)
      if (disposed) throw new DOMException("Stopped", "AbortError")
      if (context.state !== "running" || !capturedStream.getAudioTracks().some(track => track.readyState === "live")) throw new DOMException("Unavailable", "NotReadableError")
      engine = new TunerAudio(context, capturedStream, selection, value => { if (!disposed) reading(value) })
      context.onstatechange = () => { if (context.state !== "running") lost() }
      for (const track of tracks()) { track.addEventListener("ended", lost); track.addEventListener("mute", lost) }
    } catch (error) { stop(); throw error }
  })()
  return { ready, stop, select(value: StringChoice) { selection = value; engine?.select(value) } }
}
