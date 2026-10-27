/* eslint-disable @typescript-eslint/no-require-imports -- Maintenance helpers share the site's TypeScript chord parser. */
const { decodeHTML } = require("entities")
const { hash, normalizeText, createAuditor } = require("./song-audit.cjs")
const { parseSongSheet } = require("../../lib/chords/songSheet.ts")
const PROTECTED = new Set(["verified", "manually_corrected"])
const CRITICAL = new Set(["empty_content", "missing_metadata", "encoding"])
const REVIEW_WARNINGS = new Set(["empty_content", "missing_metadata", "encoding", "html_residue", "no_recognized_chords", "unparsed_musical_line", "unparsed_inline_chord", "chord_far_after_lyric", "transpose_failure", "wrap_failure"])
const decode = text => decodeHTML(normalizeText(text))
const contentVersion = song => hash(JSON.stringify([song.id, song.title, song.slug, song.category, song.artistId, song.lyrics, song.chords, song.review]))

function chordResidue(line) {
  let result = "", cursor = 0
  for (const token of line.tokens) { result += line.text.slice(cursor, token.start); cursor = token.end }
  return (result + line.text.slice(cursor)).replace(/[-.\u2010-\u2015]/g, " ")
}
function layoutBlocks(text) {
  const decoded = decode(text)
  if (/\[\/?tab\]|[\u200b\uFEFF]/i.test(decoded)) return null
  const rawLines = decoded.split("\n"), offset = Math.max(0, rawLines.findIndex(line => line.trim()))
  const lines = parseSongSheet(decoded)
  if (lines.some(line => line.kind === "inline")) return null
  const result = [], pending = []
  for (const [index,line] of lines.entries()) {
    if (line.kind === "chords") pending.push({ ...line, sourceIndex: index + offset, original: rawLines[index + offset] })
    else result.push({ kind: line.kind, text: line.text.trim(), fullText: line.text.trimEnd(), chords: pending.splice(0) })
  }
  if (pending.length) result.push({ kind: "end", text: "", chords: pending })
  return result
}
const bag = lines => lines.flatMap(line => line.tokens.map(token => `${token.bass ? "bass:" : ""}${token.chord}`)).sort().join("\0")
const residue = lines => lines.map(chordResidue).join(" ").replace(/\s+/g, " ").trim()

function sourceLayoutRepair(current, raw) {
  if (typeof current !== "string" || typeof raw !== "string" || raw.length > 100000 || /\uFFFD|\x00/.test(raw)) return null
  const before = layoutBlocks(current), source = layoutBlocks(raw)
  if (!before || !source || !before.length || before.length !== source.length) return null
  let restoredBlocks = 0
  const replacements = []
  for (let i = 0; i < before.length; i++) {
    const a = before[i], b = source[i]
    if (a.kind !== b.kind || a.text !== b.text || bag(a.chords) !== bag(b.chords) || residue(a.chords) !== residue(b.chords)) return null
    if (a.chords.length < b.chords.length) return null
    if (a.chords.length > b.chords.length) {
      if (b.chords.length !== 1 || a.fullText !== b.fullText || a.chords.some(line => !line.tokens.length)) return null
      restoredBlocks++
      replacements.push({ start:a.chords[0].sourceIndex, end:a.chords.at(-1).sourceIndex+1, text:b.chords[0].original })
    }
  }
  if (!restoredBlocks) return null
  const lines = decode(current).split("\n")
  for (const replacement of replacements.reverse()) lines.splice(replacement.start,replacement.end-replacement.start,replacement.text)
  return { lyrics: lines.join("\n"), restoredBlocks }
}

function createRepairPlanner(assetExists = () => true) {
  const audit = createAuditor(assetExists)
  return (song, candidates = []) => {
    if (PROTECTED.has(song.review?.status)) return { state: "protected", operation: null }
    const before = audit({ ...song, reviewStatus: song.review?.status })
    const possible = candidates.map(candidate => ({ ...candidate, repair: sourceLayoutRepair(song.lyrics, candidate.text) })).filter(candidate => candidate.repair)
    const distinct = new Set(possible.map(candidate => candidate.repair.lyrics))
    let next = null, rule = null, evidence = null
    if (distinct.size === 1) {
      const source = possible[0]
      next = source.repair.lyrics; rule = "source_layout_restore"
      evidence = { file: source.file, sourceHash: hash(source.text), sourceText: source.text, restoredBlocks: source.repair.restoredBlocks }
    } else if (distinct.size > 1) return { state: "conflicting_sources", operation: null }
    else if (decode(song.lyrics) !== song.lyrics) {
      next = decode(song.lyrics); rule = "decode_html_entities"
    }
    if (next === song.lyrics) next = null
    const after = next === null ? before : audit({ ...song, lyrics: next })
    if (next !== null && after.issues.some(issue => issue.severity === "error")) return { state: "unsafe_result", operation: null }
    if (next === null && !before.issues.some(issue => CRITICAL.has(issue.code))) return { state: "unchanged", operation: null }
    const status = next === null || after.issues.some(issue => REVIEW_WARNINGS.has(issue.code)) ? "needs_fix" : "manually_corrected"
    if (next === null && song.review?.status === status) return { state: "already_flagged", operation: null }
    return {
      state: "candidate",
      operation: {
        id: song.id, artist: song.artist, title: song.title, href: before.href,
        expectedVersion: contentVersion(song), before: song, afterLyrics: next ?? song.lyrics,
        status, rule: rule ?? "flag_confirmed_error", evidence,
        beforeIssues: before.issues, afterIssues: after.issues,
      },
    }
  }
}

function validateOperation(operation, planner) {
  if (!operation || typeof operation !== "object" || !operation.before || operation.id !== operation.before.id || !["needs_fix", "manually_corrected"].includes(operation.status)) throw Error("Invalid repair operation")
  const source = operation.evidence ? [{ file: operation.evidence.file, text: operation.evidence.sourceText }] : []
  if (source.some(row => typeof row.file !== "string" || typeof row.text !== "string" || hash(row.text) !== operation.evidence.sourceHash)) throw Error("Invalid source evidence")
  const computed = planner(operation.before, source).operation
  if (!computed || ["id", "expectedVersion", "afterLyrics", "status", "rule"].some(key => computed[key] !== operation[key])) throw Error("Repair no longer satisfies conservative rules")
  return computed
}

module.exports = { PROTECTED, CRITICAL, decode, contentVersion, layoutBlocks, sourceLayoutRepair, createRepairPlanner, validateOperation }
