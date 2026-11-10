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

export function capoSheet(lines: SheetLine[], transpose: number, selected: number | null, source = capoSource(lines)) {
  const active = isCapo(selected) && !source.ambiguous
  return {
    active, fret: active ? selected : source.fret,
    shift: transpose + (active ? source.fret - selected : 0),
    lines: active ? lines.filter((_, index) => !source.headers.includes(index)) : lines,
  }
}

