export const GUITAR_STRINGS = [
  { number: 6, midi: 40 }, { number: 5, midi: 45 }, { number: 4, midi: 50 },
  { number: 3, midi: 55 }, { number: 2, midi: 59 }, { number: 1, midi: 64 },
] as const
export type StringChoice = "auto" | 1 | 2 | 3 | 4 | 5 | 6
export const TUNER_MIN_RMS = 10 ** (-50 / 20)
export type TunerReading = { frequency: number; target: typeof GUITAR_STRINGS[number]; midi: number; cents: number; direction: "in_tune" | "flat" | "sharp" | "wrong_string" }
export const midiFrequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
export const centsFrom = (frequency: number, target: number) => 1200 * Math.log2(frequency / target)
export function noteName(midi: number, locale: "sr" | "en") {
  const names = locale === "sr" ? ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "H"] : ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  return names[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1)
}
export function stringChoice(value: string): StringChoice {
  return /^[1-6]$/.test(value) ? Number(value) as StringChoice : "auto"
}

export class TunerTracker {
  private samples: number[] = []
  private target = 0
  reset() { this.samples = []; this.target = 0 }
  update(frequency: number, clarity: number, choice: StringChoice): TunerReading | null {
    if (!Number.isFinite(frequency) || frequency < 60 || frequency > 420 || !Number.isFinite(clarity) || clarity < .95 || clarity > 1) { this.reset(); return null }
    const target = choice === "auto"
      ? GUITAR_STRINGS.reduce((a, b) => Math.abs(centsFrom(frequency, midiFrequency(a.midi))) <= Math.abs(centsFrom(frequency, midiFrequency(b.midi))) ? a : b)
      : GUITAR_STRINGS.find(string => string.number === choice)
    if (!target) { this.reset(); return null }
    const last = this.samples.at(-1)
    if (this.target !== target.number || last !== undefined && Math.abs(centsFrom(frequency, last)) > 45) this.reset()
    this.target = target.number
    this.samples = [...this.samples, frequency].slice(-5)
    if (this.samples.length < 3) return null
    const sorted = [...this.samples].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)]
    const cents = centsFrom(median, midiFrequency(target.midi))
    const settled = this.samples.slice(-3).every(value => Math.abs(centsFrom(value, midiFrequency(target.midi))) <= 5)
    return {
      frequency: median, target, midi: Math.round(69 + 12 * Math.log2(median / 440)), cents,
      direction: Math.abs(cents) > 300 ? "wrong_string" : Math.abs(cents) <= 5 && settled ? "in_tune" : cents < 0 ? "flat" : "sharp",
    }
  }
}

export function tunerError(error: unknown): string {
  const name = error && typeof error === "object" && "name" in error ? error.name : ""
  if (name === "NotAllowedError" || name === "SecurityError") return "Pristup mikrofonu je odbijen. Proveri dozvolu u pregledacu."
  if (name === "NotFoundError") return "Mikrofon nije pronadjen."
  if (name === "NotReadableError") return "Mikrofon nije dostupan ili ga koristi druga aplikacija."
  if (name === "TimeoutError") return "Pristup mikrofonu traje predugo. Pokusaj ponovo."
  if (name === "NotSupportedError") return "Stimer zahteva HTTPS i pregledac sa podrskom za mikrofon."
  return "Stimer nije mogao da se pokrene. Pokusaj ponovo."
}
