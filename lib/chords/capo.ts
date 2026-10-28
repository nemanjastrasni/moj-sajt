import { parseChordSymbol, transposeChordSymbol } from "./chordSymbols"
import type { SheetLine } from "./songSheet"

export const MAX_CAPO = 12
export const isCapo = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_CAPO
export function capoFromQuery(value: unknown): number | undefined {
  return typeof value === "string" && /^(?:[0-9]|1[0-2])$/.test(value) ? Number(value) : undefined
}
export function withCapoHref(href: string, fret: number | null) {
  return isCapo(fret) ? `${href}${href.includes("?") ? "&" : "?"}capo=${fret}` : href
}
export type CapoSource = { fret: number; ambiguous: boolean; headers: number[]; hasTabs: boolean }
export type CapoOption = { fret: number; chords: string[]; basic: number; easy: number; total: number; score: number }
const roman = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]

export function capoSource(lines: SheetLine[]): CapoSource {
  const headers: number[] = [], frets: number[] = []
  let ambiguous = false
  lines.forEach((line, index) => {
    const label = line.text.trim().replace(/^\[|\]$/g, "").trim()
    if (!/^(?:capo|kapo|kapodaster|capodaster)\b/i.test(label)) return
    const match = label.match(/^(?:capo|kapo|kapodaster|capodaster)\s*(?::|=)?\s*(?:(?:on|na)\s+)?(?:fret\s+)?(\d{1,2}|XII|XI|IX|VIII|VII|VI|IV|V|III|II|I)\s*\.?(?:st|nd|rd|th)?(?:\s*(?:fret|prag(?:u)?|polj(?:e|u)))?\s*\.?$/i)
    const fret = match ? /^\d+$/.test(match[1]) ? Number(match[1]) : roman.indexOf(match[1].toUpperCase()) : -1
    if (!isCapo(fret)) ambiguous = true
    else { headers.push(index); frets.push(fret) }
  })
  if (new Set(frets).size > 1) ambiguous = true
  return { fret: frets[0] ?? 0, ambiguous, headers, hasTabs: lines.some(line => line.kind === "tab") }
}

const pitch = (note: string) => ({ C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4, "E#": 5, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11, "B#": 0 })[note]
function signature(symbol: string) {
  const chord = parseChordSymbol(symbol)
  if (!chord) return null
  return JSON.stringify([pitch(chord.normalized.rootNote), chord.normalized.semitones, chord.normalized.bassNote ? pitch(chord.normalized.bassNote) : null])
}

// Costs describe common standard-tuning shapes, not the musical chord's quality.
const basicShapes = ["C", "D", "E", "G", "A", "Am", "Dm", "Em"]
const easyShapes = ["A7", "Am7", "C7", "Cmaj7", "Cadd9", "D7", "Dm7", "Dmaj7", "Dsus2", "Dsus4", "E7", "Em7", "Esus4", "G7", "Gmaj7", "Asus2", "Asus4", "Amaj7", "Fmaj7", "B7"]
const basic = new Set(basicShapes.map(signature)), easy = new Set(easyShapes.map(signature))
const familiar = new Set(["C/G", "Am/G", "D/F#", "G/B", "C/E", "Em/B"].map(signature))
export function shapeDifficulty(symbol: string) {
  const key = signature(symbol)
  if (!key) return { cost: 24, basic: false, easy: false }
  if (basic.has(key)) return { cost: 1, basic: true, easy: true }
  if (easy.has(key)) return { cost: 3, basic: false, easy: true }
  if (familiar.has(key)) return { cost: 5, basic: false, easy: false }
  const chord = parseChordSymbol(symbol)!
  const notes = chord.normalized.semitones
  return { cost: 9 + Math.max(0, notes.length - 3) * 2 + (chord.normalized.bassNote ? 3 : 0) + (chord.normalized.alterations.length + chord.normalized.adds.length) * 2, basic: false, easy: false }
}

export function capoSheet(lines: SheetLine[], transpose: number, selected: number | null, source = capoSource(lines)) {
  const active = isCapo(selected) && !source.ambiguous
  return {
    active, fret: active ? selected : source.fret,
    shift: transpose + (active ? source.fret - selected : 0),
    lines: active ? lines.filter((_, index) => !source.headers.includes(index)) : lines,
  }
}

export function rankCapos(lines: SheetLine[], transpose: number, source = capoSource(lines)): CapoOption[] {
  if (source.ambiguous || !Number.isInteger(transpose) || Math.abs(transpose) > 11) return []
  const counts = new Map<string, number>()
  for (const line of lines) for (const token of line.tokens) if (!token.bass) counts.set(token.chord, (counts.get(token.chord) ?? 0) + 1)
  if (!counts.size || [...counts.keys()].some(chord => !parseChordSymbol(chord))) return []
  return Array.from({ length: MAX_CAPO + 1 }, (_, fret) => {
    const chords = [...counts.keys()].map(chord => transposeChordSymbol(chord, source.fret + transpose - fret))
    const costs = chords.map(shapeDifficulty)
    const uniqueCost = costs.reduce((sum, item) => sum + item.cost, 0) / costs.length
    let weightedCost = 0, weight = 0
    ;[...counts.values()].forEach((count, index) => { const occurrences = Math.min(count, 8); weightedCost += costs[index].cost * occurrences; weight += occurrences })
    return { fret, chords: [...new Set(chords)], basic: costs.filter(item => item.basic).length, easy: costs.filter(item => item.easy).length, total: costs.length,
      score: uniqueCost + .2 * weightedCost / weight + fret * .08 + Math.max(0, fret - 7) * .3 }
  }).sort((a, b) => a.score - b.score || a.fret - b.fret)
}
