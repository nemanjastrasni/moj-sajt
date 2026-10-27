export const MIN_BPM = 40
export const MAX_BPM = 240
export const METRONOME_KEY = "gitarakordi-metronome-v1"
export const METRONOME_CLAIM = "gitarakordi-metronome-claim"
export type MetronomeSettings = { bpm: number; beats: number; volume: number; accent: boolean }
export const DEFAULT_METRONOME: MetronomeSettings = { bpm: 90, beats: 4, volume: 60, accent: true }

export function isMetronomeSettings(value: unknown): value is MetronomeSettings {
  if (!value || typeof value !== "object") return false
  const data = value as MetronomeSettings
  return Number.isInteger(data.bpm) && data.bpm >= MIN_BPM && data.bpm <= MAX_BPM
    && Number.isInteger(data.beats) && data.beats >= 1 && data.beats <= 8
    && Number.isInteger(data.volume) && data.volume >= 0 && data.volume <= 100 && typeof data.accent === "boolean"
}

export function tapTempo(previous: readonly number[], now: number): { taps: number[]; bpm: number | null } {
  const last = previous.at(-1)
  if (!Number.isFinite(now) || last !== undefined && now <= last) return { taps: [...previous], bpm: null }
  if (last === undefined || now - last > 2000) return { taps: [now], bpm: null }
  if (now - last < 150) return { taps: [...previous], bpm: null }
  const taps = [...previous, now].slice(-5)
  const bpm = Math.round(60000 * (taps.length - 1) / (now - taps[0]))
  return { taps, bpm: Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)) }
}
