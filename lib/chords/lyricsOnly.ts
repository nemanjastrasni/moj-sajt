import type { SheetLine } from "./songSheet"

export function lyricsOnlyLines(lines: SheetLine[]) {
  const result: string[] = []
  for (const line of lines) {
    if (line.kind === "tab") continue
    let text = ""
    if (line.kind === "lyrics" || line.kind === "inline") text = line.text.trim().replace(/\s+/g, " ")
    else if (line.kind === "chords") {
      text = line.text.match(/^\s*((?:uvod|intro|ref(?:ren)?|kraj|outro|solo|prelaz|verse|chorus|bridge|interlude|instrumental)(?:\s+\d+)?\s*[.:]?)/i)?.[1].trim() ?? ""
      if (!text) continue
    }
    if (text || result.length && result[result.length - 1] !== "") result.push(text)
  }
  while (result.at(-1) === "") result.pop()
  return result
}
