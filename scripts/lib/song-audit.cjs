/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS audit loads the shared TypeScript parser through ts-node. */
const { createHash } = require("node:crypto")
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { parseSongSheet, getUsedChords, groupSheetLines, wrapSheetBlock } = require("../../lib/chords/songSheet.ts")
const { parseChordSymbol, transposeChordSymbol } = require("../../lib/chords/chordSymbols.ts")
const { getChordAssetName, getChordAssetUrl } = require("../../lib/chords/chordAssets.ts")

const hash = value => createHash("sha256").update(value).digest("hex")
const normalizeText = text => text.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "")
const nameKey = text => text.normalize("NFD").replace(/\p{M}/gu, "").replace(/[\u0111\u0110]/g, "dj").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const songKey = (artist, title) => `${nameKey(artist)}\0${nameKey(title)}`

function sheetSignature(text) {
  return hash(JSON.stringify(parseSongSheet(text).map(line => ({
    kind: line.kind, text: line.text, tokens: line.tokens,
  }))))
}

function selectSample(songs, count) {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error("Sample count must be positive")
  const buckets = new Map()
  // Spread deterministically across categories and notation types, not just the alphabet.
  for (const song of songs) {
    const features = /\[ch\]|\[[A-H][#b]?m?\]/i.test(song.lyrics) ? "inline"
      : /bass:|\{riff\}|[#b]\d|\b[A-H]is|\/[A-H]/i.test(song.lyrics) ? "complex"
        : /[-.]{3,}/.test(song.lyrics) ? "connectors" : "plain"
    const key = `${song.category}:${features}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(song)
  }
  const groups = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, rows]) => rows.sort((a, b) => hash(a.id).localeCompare(hash(b.id))))
  const result = []
  for (let round = 0; result.length < Math.min(count, songs.length); round++) {
    for (const rows of groups) if (rows[round] && result.length < count) result.push(rows[round])
  }
  return result
}

function compareSources(song, candidates) {
  if (!candidates.length) return { state: "not_found", candidates: 0, files: [] }
  const content = normalizeText(song.lyrics)
  const signature = sheetSignature(song.lyrics)
  const exact = candidates.filter(candidate => normalizeText(candidate.text) === content)
  const equivalent = exact.length ? exact : candidates.filter(candidate => sheetSignature(candidate.text) === signature)
  const distinct = new Set(candidates.map(candidate => hash(normalizeText(candidate.text))))
  return {
    state: exact.length ? "exact_local_match" : equivalent.length ? "same_parsed_layout" : "different",
    candidates: candidates.length, distinctVersions: distinct.size,
    files: (equivalent.length ? equivalent : candidates).map(candidate => candidate.file),
    // Local archives may already contain scraper errors; equality is not musical verification.
    conflictingLocalVersions: distinct.size > 1,
  }
}

function createAuditor(assetExists = () => true) {
  const symbolChecks = new Map()
  function checkSymbol(symbol) {
    if (symbolChecks.has(symbol)) return symbolChecks.get(symbol)
    const original = parseChordSymbol(symbol)
    let transposeOK = Boolean(original)
    const pitchClass = note => ({ C: 0, "B#": 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, Fb: 4, "E#": 5, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11, Cb: 11 })[note]
    for (const shift of [-13, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
      const next = parseChordSymbol(transposeChordSymbol(symbol, shift))
      if (!original || !next || next.normalized.semitones.join() !== original.normalized.semitones.join() ||
        pitchClass(next.normalized.rootNote) !== (pitchClass(original.normalized.rootNote) + shift % 12 + 12) % 12 ||
        (original.input.bassNote && pitchClass(next.normalized.bassNote) !== (pitchClass(original.normalized.bassNote) + shift % 12 + 12) % 12)) transposeOK = false
    }
    const assetName = getChordAssetName(symbol)
    const asset = assetName ? getChordAssetUrl(assetName) : null
    const result = { transposeOK, asset, assetOK: Boolean(asset && assetExists(asset)) }
    symbolChecks.set(symbol, result)
    return result
  }
  return function auditSong(song, candidates = []) {
    const lines = parseSongSheet(song.lyrics)
    const issues = []
    function add(code, line, detail, severity = "warning") {
      if (!issues.some(issue => issue.code === code && issue.line === line && issue.detail === detail)) issues.push({ code, line, detail, severity })
    }
    if (!song.lyrics.trim()) add("empty_content", null, "Prazan tekst", "error")
    if (!song.title.trim() || !song.artist.trim()) add("missing_metadata", null, "Nedostaje naziv pesme ili izvodjaca", "error")
    if (/\uFFFD|\x00/.test(song.lyrics)) add("encoding", null, "Ostecen znak ili NUL u tekstu", "error")
    if (/<\/?(?:div|span|pre|br|a|script)\b|&(?:nbsp|amp|lt);/i.test(song.lyrics)) add("html_residue", null, "Zaostao HTML ili HTML entitet")
    const chords = getUsedChords(lines)
    const tokens = lines.flatMap(line => line.tokens)
    if (!tokens.length) add("no_recognized_chords", null, "Nema prepoznatih akorda; mozda je samo tekst ili tab")
    const rawLines = normalizeText(song.lyrics).replace(/\u00a0/g, " ").replace(/[\u200b\uFEFF]/g, "").replace(/\[\/?tab\]/gi, "").split("\n")
    while (rawLines.length && !rawLines[0].trim()) rawLines.shift()
    while (rawLines.length && !rawLines.at(-1).trim()) rawLines.pop()
    const lineOffset = normalizeText(song.lyrics).split("\n").findIndex(line => line.trim())
    lines.forEach((line, index) => {
      const number = index + Math.max(0, lineOffset) + 1
      if (line.kind === "lyrics" || line.kind === "inline") {
        const raw = rawLines[index] || line.text
        const words = raw.replace(/[-.\u2010-\u2015]{2,}/g, " ").trim().split(/\s+/)
        const possible = words.filter(word => parseChordSymbol(word.replace(/^[,|:]+|[,|:]+$/g, "")))
        if (line.kind === "lyrics" && possible.length >= 2 && (/[-.\u2010-\u2015]{2,}/.test(raw) || possible.length / words.length >= 0.6) ||
          line.kind === "inline" && /[-.\u2010-\u2015]{2,}/.test(raw) && /^\s*[A-H](?:[#b]|\d|maj|sus|dim|aug|m\d)/.test(line.text)) {
          add("unparsed_musical_line", number, raw.slice(0, 180))
        }
        if (/\[ch\]|\[\/?ch\]|\[[A-H][#b]?(?:m|maj|sus|dim|aug|\d)[^\]]*\]/i.test(line.text)) add("unparsed_inline_chord", number, raw.slice(0, 180))
        if (/(\b[\p{L}]+(?:\s+[\p{L}]+){2,5})\s+\1\b/iu.test(raw)) add("possible_duplicated_words", number, raw.slice(0, 180), "note")
      }
      if (line.kind === "chords" && index + 1 < lines.length && lines[index + 1].kind === "lyrics") {
        const lyric = lines[index + 1].text
        if (line.tokens.some(token => !token.bass && token.start > lyric.trimEnd().length + 12)) add("chord_far_after_lyric", number, "Akord vise od 12 kolona posle kraja stiha; proveriti raspored")
      }
    })
    for (const token of tokens) if (!checkSymbol(token.chord).transposeOK) add("transpose_failure", null, token.chord, "error")
    for (const chord of chords) if (!checkSymbol(chord).assetOK) add("missing_diagram", null, chord)
    const blocks = groupSheetLines(lines)
    for (const [index, block] of blocks.entries()) {
      for (const columns of [18, 30, 50, 80]) {
        const ranges = wrapSheetBlock(block, columns)
        const expected = Math.max(block.lyricLine?.text.length ?? 0, block.chordLine?.text.trimEnd().length ?? 0, ...block.tabLines?.map(line => line.text.length) ?? [0], ...block.chordLine?.tokens.map(token => token.end) ?? [0])
        const contiguous = ranges[0].start === 0 && ranges.at(-1).end === expected && ranges.every((range, i) => range.end >= range.start && (!i || ranges[i - 1].end === range.start))
        const retained = (block.chordLine?.tokens ?? []).every(token => ranges.filter(range => token.start >= range.start && token.end <= range.end).length === 1)
        if (!contiguous || !retained) add("wrap_failure", null, `Blok ${index + 1}, ${columns} kolona`, "error")
      }
    }
    const source = compareSources(song, candidates)
    const attention = issues.some(issue => issue.severity !== "note")
    return {
      id: song.id, title: song.title, artist: song.artist, category: song.category,
      href: `/pesme/${encodeURIComponent(song.category)}/${encodeURIComponent(song.artistSlug)}/${encodeURIComponent(song.slug)}`,
      editHref: `/admin/songs/${encodeURIComponent(song.id)}/edit`,
      manualStatus: song.reviewStatus || "unreviewed",
      version: hash(JSON.stringify([song.lyrics, song.chords])),
      outcome: attention ? "needs_attention" : "technical_pass",
      sourceConfirmedCandidate: !issues.length && ["exact_local_match", "same_parsed_layout"].includes(source.state) && !source.conflictingLocalVersions,
      lineCount: lines.length, chordCount: tokens.length, chords, source, issues,
    }
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char])
}

function csvCell(value) {
  const text = String(value ?? "")
  // Reports can contain user-controlled titles and must not execute spreadsheet formulas.
  return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`
}

module.exports = { hash, normalizeText, nameKey, songKey, sheetSignature, selectSample, compareSources, createAuditor, escapeHtml, csvCell }
