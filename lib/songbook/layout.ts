import { groupSheetLines, parseSongSheet, wrapSheetBlock, type SheetToken } from "../chords/songSheet"

export type PrintRow = { kind: "chords" | "lyrics" | "tab"; text: string; tokens: SheetToken[] }
export type PrintBlock = { rows: PrintRow[]; section: boolean }

export function printBlocks(lyrics: string, columns: number): PrintBlock[] {
  columns = Math.max(16, Math.floor(columns))
  const blocks = groupSheetLines(parseSongSheet(lyrics.normalize("NFC")))
  const result: PrintBlock[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (block.lyricLine?.kind === "tab") {
      const lines = [block.lyricLine.text]
      while (lines.length < 6 && blocks[i + 1]?.lyricLine?.kind === "tab") lines.push(blocks[++i].lyricLine!.text)
      const length = Math.max(...lines.map(line => line.length))
      for (let start = 0; start < length; start += columns) result.push({ section: false, rows: lines.map(text => ({ kind: "tab", text: text.slice(start, start + columns), tokens: [] })) })
      continue
    }
    const ranges = wrapSheetBlock(block, columns).flatMap(range => {
      const parts = []
      let start = range.start
      do {
        let end = Math.min(range.end, start + columns)
        const crossing = block.chordLine?.tokens.find(token => token.start < end && token.end > end)
        if (crossing) end = crossing.start > start ? crossing.start : crossing.end
        parts.push({ start, end }); start = end
      } while (start < range.end)
      return parts
    })
    for (const { start, end } of ranges) {
      const rows: PrintRow[] = []
      if (block.chordLine) rows.push({ kind: "chords", text: block.chordLine.text.slice(start, end), tokens: block.chordLine.tokens.filter(token => token.start >= start && token.start < end).map(token => ({ ...token, start: token.start - start, end: token.end - start })) })
      if (block.lyricLine) rows.push({ kind: "lyrics", text: block.lyricLine.text.slice(start, end), tokens: [] })
      result.push({ rows, section: !block.chordLine && /^\s*(?:\[.+\]|(?:ref(?:ren)?|strofa|verse|chorus|prelaz|intro|outro)\b)/i.test(block.lyricLine?.text || "") })
    }
  }
  return result
}
