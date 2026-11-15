export const TAB_STRINGS = ["e", "B", "G", "D", "A", "E"] as const
export const MAX_TAB_STEPS = 64
export type TabStep = (number | null)[]

export function emptyTabSteps(count = 8): TabStep[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_TAB_STEPS) throw new RangeError("Invalid tab length")
  return Array.from({ length: count }, () => Array<number | null>(6).fill(null))
}
export function setTabFret(steps: TabStep[], step: number, string: number, fret: number): TabStep[] {
  if (!Number.isInteger(step) || step < 0 || step >= steps.length || !Number.isInteger(string) || string < 0 || string >= 6 || !Number.isInteger(fret) || fret < 0 || fret > 24) throw new RangeError("Invalid fret position")
  return steps.map((column, index) => index === step ? column.map((note, row) => row === string ? note === fret ? null : fret : note) : column)
}
export function tabHasNotes(steps: TabStep[]) { return steps.some(step => step.some(note => note !== null)) }
export function renderTabSteps(steps: TabStep[]): string {
  if (!steps.length || steps.length > MAX_TAB_STEPS || steps.some(step => step.length !== 6 || step.some(note => note !== null && (!Number.isInteger(note) || note < 0 || note > 24)))) throw new RangeError("Invalid tab draft")
  return TAB_STRINGS.map((label, row) => label + "|-" + steps.map(step => step[row] === null ? "---" : String(step[row]).padEnd(3, "-")).join("") + "|").join("\n")
}

export function hasCompleteTabSystem(rows: string[]): boolean {
  if (rows.length !== 6) return false
  const parsed = rows.map(row => row.match(/^\s*([eBGDAE])\s*\|([\d\s|:xhHpPbBrRsStTvV/\\~().<>^=*+_\-\u2010-\u2015]+)$/i))
  return parsed.every((row, index) => row && row[1].toUpperCase() === TAB_STRINGS[index].toUpperCase()) && parsed.some(row => row && /\d/.test(row[2]))
}

export function insertTabBlock(source: string, cursor: number, tab: string, maxLength: number): { value: string; cursor: number } {
  if (!Number.isFinite(cursor)) cursor = source.length
  const position = Math.max(0, Math.min(source.length, Math.trunc(cursor)))
  let end = source.indexOf("\n", position)
  if (end < 0) end = source.length
  if (end > 0 && source[end - 1] === "\r") end--
  const newline = source.includes("\r\n") ? "\r\n" : "\n"
  const before = source.slice(0, end), after = source.slice(end), block = tab.replace(/\r\n?/g, "\n").replace(/\n/g, newline)
  const prefix = !before || before.endsWith(newline + newline) ? "" : before.endsWith(newline) ? newline : newline + newline
  const suffix = after.startsWith(newline + newline) ? "" : after.startsWith(newline) ? newline : after ? newline + newline : newline
  const value = before + prefix + block + suffix + after
  if (value.length > maxLength) throw new RangeError("Tabulatura prelazi dozvoljenu dužinu teksta. Skrati tab ili tekst pesme.")
  return { value, cursor: before.length + prefix.length + block.length + suffix.length }
}
