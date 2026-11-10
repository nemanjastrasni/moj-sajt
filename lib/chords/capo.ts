import { parseChordSymbol, transposeChordSymbol } from "./chordSymbols"
import type { SheetLine } from "./songSheet"
import { MAX_CAPO, capoSource, type CapoOption } from "./capoDisplay"
export * from "./capoDisplay"

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
