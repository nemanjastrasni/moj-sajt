import { chordParserFactory, chordRendererFactory } from "chord-symbol/lib/chord-symbol.js"
import type { Chord as ParsedChord } from "chord-symbol"

const parse = chordParserFactory({ notationSystems: ["english"] })
const parsedSymbols = new Map<string, ParsedChord>()
const rejectedSymbols = new Set<string>()
const MAX_CACHED_SYMBOL_LENGTH = 128

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
  if (rejectedSymbols.has(prepared)) return null
  const result = parse(prepared)
  const chord = "error" in result ? null : result
  // Lyrics contain many non-chord candidates. Keep their bounded cache separate
  // so they cannot repeatedly flush the frequently reused parsed chord objects.
  // Long inputs still use the same parser, but do not occupy either cache.
  if (prepared.length <= MAX_CACHED_SYMBOL_LENGTH) {
    if (chord) {
      if (parsedSymbols.size >= 1024) parsedSymbols.delete(parsedSymbols.keys().next().value!)
      parsedSymbols.set(prepared, chord)
    } else {
      if (rejectedSymbols.size >= 8192) rejectedSymbols.delete(rejectedSymbols.values().next().value!)
      rejectedSymbols.add(prepared)
    }
  }
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
