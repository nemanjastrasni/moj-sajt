import { normalizeChordSymbol, parseChordSymbol } from "./chordSymbols"

export type SheetToken = {
  start: number
  end: number
  chord: string
  bass: boolean
}

export type SheetLine = {
  kind: "chords" | "lyrics" | "inline" | "tab" | "empty"
  text: string
  tokens: SheetToken[]
}

const sectionLabel = /^\s*(?:uvod|intro|ref(?:ren)?|kraj|outro|solo|prelaz|riff|verse|chorus|bridge|interlude|instrumental|bass|bas)(?:\s+\d+)?\s*[.:]?\s*/i
const wordCharacter = /[\p{L}\p{N}_#\u266f\u266d]/u
const connector = /[-.\u2010-\u2015]/

function expandTabs(line: string) {
  let column = 0
  return line.replace(/\t|[^\t]/g, (character) => {
    const count = character === "\t" ? 8 - column % 8 : 1
    column += count
    return character === "\t" ? " ".repeat(count) : character
  })
}

export function isTabLine(line: string) {
  if (!/[-|:\u2010-\u2015]/.test(line)) return false
  const trimmed = line.trim()
  const label = trimmed.match(/^(?:[a-h](?:#|b)?|[1-6])\s*(?=[|:\-\u2010-\u2015])/i)
  const body = trimmed.slice(label?.[0].length ?? 0)
  // Silent strings are still tab rows; do not turn their E/A labels into chords.
  if (label && (/\s$/.test(label[0]) || /[|:]/.test(body)) && /^[\s|:\-\u2010-\u2015]+$/.test(body)
    && (/[-\u2010-\u2015]{3,}/.test(body) || /[|:]/.test(body) && /[-\u2010-\u2015]/.test(body))) return true
  return /^[\s|:\-\u2010-\u2015]*(?:\d|x)[\d\s|:xhHpPbBrR/\\~().<>^=\-\u2010-\u2015]*$/i.test(body)
}

function readSymbol(line: string, start: number) {
  let end = start
  while (end < line.length) {
    const character = line[end]
    if (/[\s,;:{}\[\]|.\-\u2010-\u2015]/.test(character)) break
    if (character === "(") {
      const close = line.indexOf(")", end + 1)
      if (close < 0 || !/^[\da-zA-Z#b+,/\s\u00b0\u00f8\u0394-]+$/.test(line.slice(end + 1, close))) break
      end = close + 1
    } else if (character === ")") {
      break
    } else {
      end += 1
    }
  }
  const symbol = line.slice(start, end)
  return symbol && parseChordSymbol(symbol) ? { end, symbol } : null
}

function scanTokens(line: string, bass = false, offset = 0): SheetToken[] {
  const tokens: SheetToken[] = []
  for (let index = 0; index < line.length;) {
    if (line[index] === "{" || line[index] === "(") {
      const close = line.indexOf(line[index] === "{" ? "}" : ")", index + 1)
      if (close >= 0) {
        const inner = line.slice(index + 1, close)
        const label = inner.match(/^\s*(?:bass|bas)\s*:\s*/i)
        if (label) tokens.push(...scanTokens(inner.slice(label[0].length), true, offset + index + 1 + label[0].length))
        else if (line[index] === "(") {
          const grouped = scanTokens(inner)
          if (grouped.length && !eraseTokens(inner, grouped).replace(/[\s,;:.|\-\u2010-\u2015]/g, "")) {
            tokens.push(...grouped.map((token) => ({ ...token, bass, start: token.start + offset + index + 1, end: token.end + offset + index + 1 })))
          }
        }
        index = close + 1
        continue
      }
    }
    if (/[a-h]/i.test(line[index]) && (index === 0 || !wordCharacter.test(line[index - 1]))) {
      const result = readSymbol(line, index)
      if (result) {
        tokens.push({ start: offset + index, end: offset + result.end, chord: normalizeChordSymbol(result.symbol), bass })
        index = result.end
        continue
      }
    }
    index += 1
  }
  return tokens
}

function eraseTokens(line: string, tokens: SheetToken[]) {
  let result = ""
  let cursor = 0
  for (const token of tokens) {
    result += line.slice(cursor, token.start) + " ".repeat(token.end - token.start)
    cursor = token.end
  }
  return result + line.slice(cursor)
}

function parseInlineChords(line: string): SheetLine | null {
  const bracket = /\[ch\]([^\n]*?)\[\/ch\]|\[([^\[\]\n]+)\]/gi
  const tokens: SheetToken[] = []
  let text = ""
  let cursor = 0
  for (const match of line.matchAll(bracket)) {
    const symbol = match[1] ?? match[2]
    if (!parseChordSymbol(symbol)) continue
    text += line.slice(cursor, match.index)
    const chord = normalizeChordSymbol(symbol)
    tokens.push({ start: text.length, end: text.length + chord.length, chord, bass: false })
    cursor = match.index! + match[0].length
  }
  if (!tokens.length) return null
  text += line.slice(cursor)
  return { kind: "inline", text, tokens }
}

export function parseSheetLine(line: string): SheetLine {
  if (!line.trim()) return { kind: "empty", text: "", tokens: [] }
  if (isTabLine(line)) return { kind: "tab", text: line, tokens: [] }

  const inline = parseInlineChords(line)
  if (inline) return inline

  const tokens = scanTokens(line, /^\s*(?:bass|bas)\s*:/i.test(line))
  const residue = eraseTokens(line, tokens)
    .replace(/\{[^}]*\}|\([^)]*\)/g, " ")
    .replace(sectionLabel, "")
    .replace(/\b(?:\d+x|x\d+|N\.?C\.?)\b/gi, "")
    .replace(/[\s,;:.|[\]()\-\u2010-\u2015]/g, "")

  if (tokens.length && !residue) {
    // Change separators only on musical lines; tablature and lyric punctuation stay intact.
    let text = ""
    let cursor = 0
    for (const token of tokens) {
      text += line.slice(cursor, token.start).replace(/[-.\u2010-\u2015]/g, " ")
      text += line.slice(token.start, token.end)
      cursor = token.end
    }
    text += line.slice(cursor).replace(/[-.\u2010-\u2015]/g, " ")
    return { kind: "chords", text, tokens }
  }

  // A connector-delimited prefix is explicit musical notation even before a lyric.
  if (tokens.length && /^\s*$/.test(line.slice(0, tokens[0].start))) {
    let prefixEnd = tokens[0].end
    const prefixTokens = [tokens[0]]
    for (const token of tokens.slice(1)) {
      if (!/^[\s.\-\u2010-\u2015]*$/.test(line.slice(prefixEnd, token.start))) break
      prefixTokens.push(token)
      prefixEnd = token.end
    }
    const prefix = line.slice(0, prefixEnd)
    if (prefixTokens.length > 1 && connector.test(prefix)) {
      const lyricStart = prefixEnd + (line.slice(prefixEnd).match(/^[\s.\-\u2010-\u2015]*/)?.[0].length ?? 0)
      return { kind: "inline", text: " ".repeat(lyricStart) + line.slice(lyricStart), tokens: prefixTokens }
    }
  }

  return { kind: "lyrics", text: line, tokens: [] }
}

export function parseSongSheet(source: string): SheetLine[] {
  const lines = source.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ")
    .replace(/[\u200b\uFEFF]/g, "").replace(/\[\/?tab\]/gi, "").split("\n").map(expandTabs)
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  return lines.map(parseSheetLine)
}

export function getUsedChords(lines: SheetLine[]) {
  return Array.from(new Set(lines.flatMap((line) => line.tokens.filter((token) => !token.bass).map((token) => token.chord))))
}

export type SheetBlock = { chordLine?: SheetLine; lyricLine?: SheetLine; tabLines?: SheetLine[] }

export function groupSheetLines(lines: SheetLine[]): SheetBlock[] {
  const blocks: SheetBlock[] = []
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (line.kind === "tab" || line.kind === "chords" && lines[index + 1]?.kind === "tab") {
      const chordLine = line.kind === "chords" ? line : undefined
      const start = index + (chordLine ? 1 : 0), tabLines: SheetLine[] = []
      while (tabLines.length < 6 && lines[start + tabLines.length]?.kind === "tab") tabLines.push(lines[start + tabLines.length])
      blocks.push({ chordLine, lyricLine: tabLines[0], tabLines })
      index = start + tabLines.length - 1
      continue
    }
    if (line.kind === "chords") {
      const next = lines[index + 1]
      if (next?.kind === "lyrics" && !sectionLabel.test(next.text)) {
        blocks.push({ chordLine: line, lyricLine: next })
        index += 1
      } else blocks.push({ chordLine: line })
    } else if (line.kind === "inline") {
      blocks.push({ chordLine: { ...line, text: " ".repeat(Math.max(line.text.length, ...line.tokens.map((token) => token.end))) }, lyricLine: { ...line, kind: "lyrics", tokens: [] } })
    } else blocks.push({ lyricLine: line })
  }
  return blocks
}

export function wrapSheetBlock(block: SheetBlock, columns: number) {
  const lyric = block.lyricLine?.text ?? ""
  const chordText = block.chordLine?.text ?? ""
  const length = Math.max(lyric.length, chordText.trimEnd().length, ...block.tabLines?.map(line => line.text.length) ?? [0], ...block.chordLine?.tokens.map((token) => token.end) ?? [0])
  const ranges: { start: number; end: number }[] = []
  if (block.lyricLine?.kind === "tab") return [{ start: 0, end: length }]
  let start = 0
  while (start < length) {
    let end = Math.min(length, start + Math.max(8, columns))
    if (end < length) {
      // Both rows must break at the same source column and outside any chord.
      const safeBreak = (column: number) =>
        (!lyric[column] || /\s/.test(lyric[column]) || /\s/.test(lyric[column - 1] ?? "")) &&
        !(block.chordLine?.tokens.some((token) => token.start < column && token.end > column))
      let boundary = end
      while (boundary > start && !safeBreak(boundary)) boundary--
      if (boundary > start) end = boundary
      else {
        while (end < length && !safeBreak(end)) end++
      }
    }
    ranges.push({ start, end })
    start = end
  }
  return ranges.length ? ranges : [{ start: 0, end: 0 }]
}
