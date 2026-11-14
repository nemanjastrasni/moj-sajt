import { groupSheetLines, type SheetBlock, type SheetLine } from "./songSheet"

type TabRow = { prefix: string; music: string; annotation: string }
// Presentation only: preserve the stored notation and the assessment algorithm.
// Slides may begin before the first fret, and a closing bar may carry a note.
export function tabDisplayRow(text: string): TabRow | undefined {
  const label = text.match(/^\s*(?:[a-h](?:#|b)?|[1-6])(?:\s*[|:]|\s+(?=[\-\u2010-\u2015])|(?=[\-\u2010-\u2015]))/i) ?? text.match(/^\s*[|:]/)
  if (!label) return
  const prefix = label[0], remainder = text.slice(prefix.length), closingBar = remainder.lastIndexOf("|")
  const suffix = closingBar < 0 ? "" : remainder.slice(closingBar + 1)
  const annotation = /^\s+\([^\n]*\)\s*$/.test(suffix) ? suffix : ""
  const music = annotation ? text.slice(0, text.length - annotation.length) : text
  const body = music.slice(prefix.length)
  if (!/^[\d\s|:xhHpPbBrRsStTvV/\\~().<>^=*+_\-\u2010-\u2015]+$/.test(body) || !/[\d xX\-\u2010-\u2015]/.test(body)) return
  return { prefix, music, annotation }
}

export function displaySheetLines(lines: SheetLine[]) {
  return lines.map(line => line.kind === "lyrics" && tabDisplayRow(line.text)
    ? { ...line, kind: "tab" as const, tokens: [] } : line)
}
export function groupDisplaySheetLines(lines: SheetLine[]) {
  return groupSheetLines(displaySheetLines(lines))
}

export type TabSegment = { start: number; end: number; prefixWidth: number; rows: string[] }
export function layoutTabBlock(block: SheetBlock, columns: number, fit = true) {
  const originals = block.tabLines ?? (block.lyricLine ? [block.lyricLine] : [])
  const rows = originals.map(line => tabDisplayRow(line.text) ?? { prefix: "", music: line.text, annotation: "" })
  const prefixWidth = Math.max(0, ...rows.map(row => row.prefix.length))
  const length = Math.max(0, ...rows.map(row => row.music.length), block.chordLine?.text.trimEnd().length ?? 0,
    ...block.chordLine?.tokens.map(token => token.end) ?? [])
  const spans = rows.flatMap(row => Array.from(row.music.matchAll(/[(/\\<]*\d+(?:[hHpPbBrRsStT/\\]-*(?:\d+|x))*[)>~^v]*/g), match => ({ start: match.index!, end: match.index! + match[0].length })))
  spans.push(...block.chordLine?.tokens ?? [])
  const protectedColumns = new Set<number>()
  for (const span of spans) for (let column = span.start + 1; column < span.end; column++) protectedColumns.add(column)
  const safe = (column: number) => !protectedColumns.has(column)
  const limit = Number.isFinite(columns) ? Math.max(prefixWidth + 8, Math.floor(columns)) : 80
  const segments: TabSegment[] = []
  for (let start = 0; start < length;) {
    const repeatedPrefix = start ? prefixWidth : 0, capacity = limit - repeatedPrefix
    let end = fit ? Math.min(length, start + capacity) : length
    if (end < length) {
      // Prefer a shared barline, then a safe note boundary. A long indivisible
      // technique remains whole and may use the single shared scroll container.
      let bar = end
      while (bar > start + Math.floor(capacity / 2) && !(safe(bar) && rows.every(row => row.music.length < bar || row.music[bar - 1] === "|"))) bar--
      if (bar > start + Math.floor(capacity / 2)) end = bar
      else {
        while (end > start && !safe(end)) end--
        if (end === start) { end = start + capacity; while (end < length && !safe(end)) end++ }
      }
    }
    segments.push({ start, end, prefixWidth: repeatedPrefix,
      rows: rows.map(row => (start ? row.prefix.padEnd(prefixWidth, " ") : "") + row.music.slice(start, end)) })
    start = end
  }
  return { segments, annotations: rows.filter(row => row.annotation).map(row => ({ label: row.prefix.trim(), text: row.annotation.trim() })) }
}
