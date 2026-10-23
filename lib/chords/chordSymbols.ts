import { chordParserFactory, chordRendererFactory } from "chord-symbol/lib/chord-symbol.js"
import type { Chord as ParsedChord } from "chord-symbol"

const parse = chordParserFactory({ notationSystems: ["english"] })
const parsedSymbols = new Map<string, ParsedChord | null>()

function prepareSymbol(symbol: string) {
  return symbol.trim()
    .replace(/\u266f/g, "#")
    .replace(/\u266d/g, "b")
    .replace(/(^|\/)([a-h])(is|es)?/gi, (_, separator: string, root: string, accidental?: string) =>
      separator + (root.toUpperCase() === "H" ? "B" : root.toUpperCase()) +
      (accidental ? accidental.toLowerCase() === "is" ? "#" : "b" : ""))
}

export function parseChordSymbol(symbol: string): ParsedChord | null {
  const prepared = prepareSymbol(symbol)
  if (parsedSymbols.has(prepared)) return parsedSymbols.get(prepared)!
  const result = parse(prepared)
  const chord = "error" in result ? null : result
  if (parsedSymbols.size >= 2048) parsedSymbols.clear()
  parsedSymbols.set(prepared, chord)
  return chord
}

export function normalizeChordSymbol(symbol: string) {
  const chord = parseChordSymbol(symbol)
  if (!chord) return symbol
  return chord.normalized.rootNote + (chord.input.descriptor ?? "") +
    (chord.input.bassNote ? "/" + chord.normalized.bassNote : "")
}

export function transposeChordSymbol(symbol: string, semitones: number) {
  const chord = parseChordSymbol(symbol)
  if (!chord) return symbol
  const shift = ((semitones % 12) + 12) % 12
  if (!shift) return normalizeChordSymbol(symbol)
  const render = chordRendererFactory({ transposeValue: shift, accidental: "sharp" })
  const transposed = parseChordSymbol(render(chord))
  if (!transposed) return symbol
  // Preserve the author's extensions while transposing both root and slash bass.
  return transposed.normalized.rootNote + (chord.input.descriptor ?? "") +
    (chord.input.bassNote ? "/" + transposed.normalized.bassNote : "")
}
