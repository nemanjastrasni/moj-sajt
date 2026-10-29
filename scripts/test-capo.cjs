/* eslint-disable @typescript-eslint/no-require-imports -- Node tests exercise the shared TypeScript chord engine. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs"), path = require("node:path")
const { isCapo, capoSource, capoSheet, rankCapos, shapeDifficulty, capoFromQuery, withCapoHref } = require("../lib/chords/capo.ts")
const { parseSongSheet, getUsedChords } = require("../lib/chords/songSheet.ts")
const { transposeChordSymbol, parseChordSymbol } = require("../lib/chords/chordSymbols.ts")
const { printBlocks } = require("../lib/songbook/layout.ts")
const sheet = source => parseSongSheet(source + "\nProbni stih pesme")

test("an immediately available performance song honors a valid initial capo", () => {
  const Module = require("node:module"), React = require("react"), { renderToStaticMarkup } = require("react-dom/server")
  const originalLoad = Module._load
  let useSongCapo
  Module._load = function(request, parent, main) {
    if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
    return originalLoad.call(this, request, parent, main)
  }
  try { useSongCapo = require("../app/components/useSongCapo.ts").default } finally { Module._load = originalLoad }
  for (const [initial, expected] of [[{ id: "first", fret: 2 }, 2], [{ id: "first", fret: 0 }, 0], [{ id: "other", fret: 2 }, null], [{ id: "first", fret: 13 }, null]]) {
    let result
    function Harness() { result = useSongCapo("first", sheet("F#m D A E"), 0, initial); return null }
    renderToStaticMarkup(React.createElement(Harness))
    assert.equal(result.selected, expected)
    assert.equal(result.active, expected !== null)
  }
})

test("capo frets accept only integers from zero through twelve", () => {
  for (const value of [0, 1, 5, 12]) assert.equal(isCapo(value), true)
  for (const value of [null, undefined, false, "2", -1, 13, 1.5, NaN, Infinity]) assert.equal(isCapo(value), false)
})
test("playlist performance carries only a validated capo choice", () => {
  assert.equal(withCapoHref("/plejliste/p/sviranje?song=s", 5), "/plejliste/p/sviranje?song=s&capo=5")
  assert.equal(withCapoHref("/plejliste/p/sviranje", 0), "/plejliste/p/sviranje?capo=0")
  assert.equal(withCapoHref("/plejliste/p/sviranje?song=s", null), "/plejliste/p/sviranje?song=s")
  for (const value of ["0", "5", "12"]) assert.equal(capoFromQuery(value), Number(value))
  for (const value of [null, undefined, 5, ["5"], "13", "-1", "05", "1.5", "2&admin=true"]) assert.equal(capoFromQuery(value), undefined)
})
test("known capo headers include Arabic, Roman, English and Serbian frets", () => {
  for (const [label, fret] of [["Capo II", 2], ["[Capo: 5]", 5], ["kapodaster na 3. pragu", 3], ["Capo on 4th fret", 4], ["Capo XII", 12], ["Capo 0", 0], ["capo fret 7", 7]]) {
    const source = capoSource(sheet(label + "\nC G Am F"))
    assert.equal(source.ambiguous, false, label); assert.equal(source.fret, fret, label); assert.deepEqual(source.headers, [0])
  }
})
test("unclear, unsupported and conflicting capo headers fail closed", () => {
  for (const label of ["Capo 99", "Capo 13", "Capo -1", "Capo 2 ili 3", "Capo na drugom pragu", "Capo 2\nCapo 4", "Capo 2 (half capo)"]) {
    const lines = sheet(label + "\nC G Am F")
    assert.equal(capoSource(lines).ambiguous, true, label)
    assert.deepEqual(rankCapos(lines, 0), [], label)
    const display = capoSheet(lines, 2, 5)
    assert.equal(display.active, false); assert.equal(display.shift, 2); assert.strictEqual(display.lines, lines)
  }
})
test("ordinary lyrics and repeated matching headers are not ambiguous", () => {
  assert.equal(capoSource(sheet("Da capo, jos jednom\nC G")).ambiguous, false)
  const source = capoSource(sheet("Capo 2\nG D\nCapo II\nAm C"))
  assert.equal(source.ambiguous, false); assert.equal(source.fret, 2); assert.deepEqual(source.headers, [0, 2])
})
test("a useful recommendation replaces barre shapes without changing harmony", () => {
  const best = rankCapos(sheet("F#m D A E"), 0)[0]
  assert.equal(best.fret, 2); assert.deepEqual(best.chords, ["Em", "C", "G", "D"])
  assert.equal(best.basic, 4); assert.equal(best.easy, 4)
  assert.equal(rankCapos(sheet("C G Am F"), 0)[0].fret, 5)
})
test("already easy songs prefer no capo, with deterministic low-fret ties", () => {
  const lines = sheet("G D Em C")
  const options = rankCapos(lines, 0)
  assert.equal(options[0].fret, 0)
  assert.equal(options.length, 13); assert.equal(new Set(options.map(option => option.fret)).size, 13)
  assert.deepEqual(options, rankCapos(lines, 0))
})
test("F and Bm are not falsely classified as easy open triads", () => {
  for (const symbol of ["C", "D", "E", "G", "A", "Am", "Dm", "Em"]) assert.equal(shapeDifficulty(symbol).basic, true)
  for (const symbol of ["F", "Bm", "F#m", "E(#9)", "C7(b9,#11)", "not a chord"]) assert.equal(shapeDifficulty(symbol).easy, false)
  for (const symbol of ["Am7", "Cmaj7", "Cadd9", "Dsus4", "B7"]) assert.equal(shapeDifficulty(symbol).easy, true)
})
test("aliases and enharmonic names receive equivalent shape scores", () => {
  for (const [left, right] of [["Cb7", "B7"], ["Fb", "E"], ["c", "C"], ["H7", "B7"], ["Cmajor7", "Cmaj7"]]) assert.deepEqual(shapeDifficulty(left), shapeDifficulty(right), left)
})
test("extensions, alterations and slash bass are preserved in capo shapes", () => {
  const lines = sheet("E(#9) E(b9) Am/G Cmaj7 G7/B Fism")
  const display = capoSheet(lines, 0, 2)
  assert.deepEqual(getUsedChords(display.lines).map(chord => transposeChordSymbol(chord, display.shift)), ["D(#9)", "D(b9)", "Gm/F", "A#maj7", "F7/A", "Em"])
  for (const option of rankCapos(lines, 0)) {
    assert.equal(option.chords.length, 6)
    assert.ok(option.chords[0].endsWith("(#9)")); assert.ok(option.chords[1].endsWith("(b9)")); assert.ok(option.chords[2].includes("/"))
  }
})
const notes = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 }
const mod = value => (value % 12 + 12) % 12
test("all positions and transpositions preserve sounding root, intervals and bass", () => {
  for (const symbol of ["C", "F#m", "Cb6", "E(#9)", "E(b9)", "C7(b9,#11)", "Am/G", "G7/B", "Fism", "H7", "Dbmaj7"]) {
    const original = parseChordSymbol(symbol)
    for (const sourceFret of [0, 2, 5]) for (const transpose of [-11, -2, 0, 3, 11]) for (let fret = 0; fret <= 12; fret++) {
      const shape = parseChordSymbol(transposeChordSymbol(symbol, sourceFret + transpose - fret))
      assert.equal(mod(notes[shape.normalized.rootNote] + fret), mod(notes[original.normalized.rootNote] + sourceFret + transpose), `${symbol}/${fret}/${transpose}`)
      assert.deepEqual(shape.normalized.semitones, original.normalized.semitones)
      if (original.normalized.bassNote) assert.equal(mod(notes[shape.normalized.bassNote] + fret), mod(notes[original.normalized.bassNote] + sourceFret + transpose))
    }
  }
})
test("existing source capo is counted once and original mode restores it untouched", () => {
  const lines = sheet("Capo II\nAm G C F"), before = JSON.stringify(lines)
  const same = capoSheet(lines, 0, 2), converted = capoSheet(lines, 0, 5)
  assert.equal(same.shift, 0); assert.equal(converted.shift, -3)
  assert.ok(converted.lines.every(line => !line.text.includes("Capo II")))
  const original = capoSheet(lines, 3, null)
  assert.equal(original.active, false); assert.equal(original.shift, 3); assert.strictEqual(original.lines, lines)
  assert.equal(JSON.stringify(lines), before)
})
test("capo zero removes an original capo and compensates the chord shapes", () => {
  const display = capoSheet(sheet("Capo II\nAm G"), 1, 0)
  assert.equal(display.active, true); assert.equal(display.shift, 3)
  assert.deepEqual(getUsedChords(display.lines).map(chord => transposeChordSymbol(chord, display.shift)), ["Cm", "A#"])
})
test("bass runs transpose with shapes but do not distort the recommendation", () => {
  const one = sheet("F#m D A E"), two = sheet("F#m D A E (bass: F# F# E E D D C# C#)")
  assert.deepEqual(rankCapos(one, 0), rankCapos(two, 0))
  const bass = two[0].tokens.filter(token => token.bass)
  assert.equal(transposeChordSymbol(bass[0].chord, capoSheet(two, 0, 2).shift), "E")
})
test("tablature and lyric positions remain unchanged by capo conversion", () => {
  const lines = sheet("Capo 2\nG      D\nTekst pesme\ne|--0--2--3--\nB|--0--2--3--"), before = JSON.stringify(lines)
  const display = capoSheet(lines, -1, 4)
  assert.equal(capoSource(lines).hasTabs, true)
  assert.deepEqual(display.lines.flatMap(line => line.tokens.map(token => token.start)), lines.flatMap(line => line.tokens.map(token => token.start)))
  assert.deepEqual(display.lines.filter(line => line.kind === "tab"), lines.filter(line => line.kind === "tab"))
  assert.equal(JSON.stringify(lines), before)
})
test("empty, lyric-only and bass-only sheets do not invent recommendations", () => {
  for (const lyrics of ["", "Samo tekst bez akorda", "bass: C D E F", "e|--0--2--3--"]) assert.deepEqual(rankCapos(parseSongSheet(lyrics), 0), [])
  assert.deepEqual(rankCapos(sheet("C G"), NaN), [])
  assert.deepEqual(rankCapos(sheet("C G"), 12), [])
})
test("capo rendering works with the same PDF block parser and original mode is identical", () => {
  const lyrics = "Capo 2\nG      D\nTekst pesme", lines = parseSongSheet(lyrics)
  assert.deepEqual(printBlocks(lyrics, 40), printBlocks(lines, 40))
  const blocks = printBlocks(capoSheet(lines, 0, 5).lines, 40)
  assert.ok(!blocks.flatMap(block => block.rows).some(row => row.text.includes("Capo 2")))
})
test("PDF includes chosen capo and uses converted shapes without changing the source", async () => {
  const { generateSongbookPdf } = require("../lib/songbook/pdf.ts")
  const { PDFDocument, PDFPage } = require("pdf-lib")
  const song = { id: "capo-test", title: "Capo provera", artist: "Probni bend", lyrics: "Capo 2\nAm       G       C       F\nOvo je stih za proveru capoa.\nE(#9)      E(b9)      Am/G\nDodaci i bas ostaju sacuvani.\ne|--0--2--3--", transpose: 0, capo: 5 }
  const original = JSON.stringify(song), drawn = [], drawText = PDFPage.prototype.drawText
  const fonts = { regular: fs.readFileSync(path.join(__dirname, "../public/fonts/songbook/DejaVuSansMono.ttf")), bold: fs.readFileSync(path.join(__dirname, "../public/fonts/songbook/DejaVuSansMono-Bold.ttf")) }
  const options = { title: "Capo provera", fontSize: 11, book: false, contents: false, locale: "sr" }
  PDFPage.prototype.drawText = function(value, options) { drawn.push(value); return drawText.call(this, value, options) }
  try {
    const result = await generateSongbookPdf([song], options, fonts)
    assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 1)
    assert.ok(drawn.some(text => text.includes("Capo 5 (hvatovi)")))
    assert.ok(!drawn.includes("Capo 2")); assert.ok(drawn.includes("F#m")); assert.ok(drawn.includes("C#(#9)")); assert.ok(drawn.includes("F#m/E"))
    assert.ok(drawn.includes("Tabulatura ostaje u izvornom zapisu."))
    const output = path.join(__dirname, "../reports/capo"); fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, "capo-qa.pdf"), result.bytes)
    for (const capo of [-1, 13, "5", null]) await assert.rejects(generateSongbookPdf([{ ...song, capo }], options, fonts), /Neispravan capo/)
    await assert.rejects(generateSongbookPdf([{ ...song, lyrics: "Capo 2 ili 3\nAm G" }], options, fonts), /nije jasna/)
  } finally { PDFPage.prototype.drawText = drawText }
  assert.equal(JSON.stringify(song), original)
})
