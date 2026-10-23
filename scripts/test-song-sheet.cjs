require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "CommonJS", moduleResolution: "Node" },
})

const { test } = require("node:test")
const assert = require("node:assert/strict")
const { parseSheetLine, parseSongSheet, getUsedChords, groupSheetLines, wrapSheetBlock } = require("../lib/chords/songSheet.ts")
const { normalizeChordSymbol, transposeChordSymbol } = require("../lib/chords/chordSymbols.ts")
const { getChordAssetName, getChordAssetUrl } = require("../lib/chords/chordAssets.ts")

test("connectors become equal-width spaces without moving chords", () => {
  for (const source of ["G------------------------Am", "B---Ab----G-------------Cm---Ab-B", "Abm.....E.....Dbm....B7...Eb", "G----B", "A----B7", "B----Em7"]) {
    const line = parseSheetLine(source)
    assert.equal(line.kind, "chords", source)
    assert.equal(line.text.length, source.length)
    assert.ok(!/[-.]/.test(line.text))
    for (const token of line.tokens) assert.equal(token.start, source.indexOf(source.slice(token.start, token.end), token.start))
  }
})

test("recognizes altered, extended, lowercase and European symbols", () => {
  const line = parseSheetLine("E(#9) E(b9) Am A7 C7(b9,#11) Fism e7 a d Cb6 Fb CM7 A+")
  assert.equal(line.kind, "chords")
  assert.deepEqual(line.tokens.map(t => t.chord), ["E(#9)", "E(b9)", "Am", "A7", "C7(b9,#11)", "F#m", "E7", "A", "D", "B6", "E", "CM7", "A+"])
})

test("bass runs transpose but do not appear as chord diagrams", () => {
  const line = parseSheetLine("F#    B    F#    C# (bass: C# C# B B A# A# G# G# F#)")
  assert.equal(line.kind, "chords")
  assert.equal(line.tokens.filter(t => t.bass).length, 9)
  assert.deepEqual(getUsedChords([line]), ["F#", "B", "C#"])
  assert.equal(transposeChordSymbol(line.tokens[4].chord, 2), "D#")
})

test("riff annotations and section labels do not disable chords", () => {
  assert.deepEqual(getUsedChords(parseSongSheet("Prelaz 2:\n G{riff}\nU velikoj zurbi\nA{riff}\nZaboravismo\nD\n Kraj: G, C,")), ["G", "A", "D", "C"])
  assert.equal(parseSheetLine("G{riff}").text, "G{riff}")
})

test("does not identify letters in lyrics or notes as chords", () => {
  for (const source of ["on A warm San Franciscan night", "A nekad tako srecan sam bio", ". I think About the old Days", "Capo II", "[Verse 2]", "Hello A and D", "Uvodna prica o pesmi", "Prelaz 2:"]) {
    const line = parseSheetLine(source)
    assert.equal(line.kind, "lyrics", source)
    assert.equal(line.tokens.length, 0, source)
    assert.equal(line.text, source)
  }
})

test("preserves real tablature and lyric punctuation", () => {
  for (const source of ["e|----0--2h3----|", "B|----1--1-----|", "|----0---2---|", "E-----0---3---5---"]) {
    assert.equal(parseSheetLine(source).kind, "tab", source)
    assert.equal(parseSheetLine(source).text, source)
  }
  assert.equal(parseSheetLine("Da... jos uvek - za tobom").text, "Da... jos uvek - za tobom")
  assert.equal(parseSheetLine("| Am | G | F | E |").kind, "chords")
})

test("explicit inline chords move above lyrics at the correct lyric column", () => {
  const line = parseSheetLine("[Am]Ovo je [G]pesma")
  assert.equal(line.kind, "inline")
  assert.equal(line.text, "Ovo je pesma")
  assert.deepEqual(line.tokens.map(t => t.start), [0, 7])
  assert.equal(parseSheetLine("[ch]C[/ch]Noc je [ch]G[/ch]carobna").text, "Noc je carobna")
  assert.equal(parseSheetLine("B----Em-- tad").kind, "inline")
})

test("transposes root and slash bass and retains alteration spelling", () => {
  assert.equal(transposeChordSymbol("Am/G", 2), "Bm/A")
  assert.equal(transposeChordSymbol("E(#9)", 1), "F(#9)")
  assert.equal(transposeChordSymbol("E(b9)", -13), "D#(b9)")
  assert.equal(transposeChordSymbol("A+", 0), "A+")
  assert.equal(normalizeChordSymbol("CM7"), "CM7")
})

test("tabs expand to their original tab stops and leading columns survive", () => {
  const lines = parseSongSheet("\n  Am\tG\r\n  reci\u00a0pesme\n")
  assert.equal(lines[0].tokens[0].start, 2)
  assert.equal(lines[0].tokens[1].start, 8)
  assert.equal(lines[1].text, "  reci pesme")
})

test("mobile wrapping breaks chords and lyrics together without losing text", () => {
  const lines = parseSongSheet("Am             G                C\nOvo je veoma dugacak stih za mali ekran")
  const blocks = groupSheetLines(lines)
  assert.equal(blocks.length, 1)
  const ranges = wrapSheetBlock(blocks[0], 18)
  assert.ok(ranges.length > 1)
  assert.equal(ranges.map(r => blocks[0].lyricLine.text.slice(r.start, r.end)).join(""), lines[1].text)
  for (const token of lines[0].tokens) {
    assert.ok(ranges.some(r => token.start >= r.start && token.end <= r.end))
  }
})

test("parenthesized chords and separately labeled bass runs are musical", () => {
  const line = parseSheetLine("G  (G Am) (ponovi 2x)")
  assert.equal(line.kind, "chords")
  assert.deepEqual(getUsedChords([line]), ["G", "Am"])
  assert.equal(getUsedChords([parseSheetLine("bass: C# C# B A#")]).length, 0)
  assert.deepEqual(getUsedChords([parseSheetLine("G (A zasto je to tako)")]), ["G"])
})

test("image lookup handles enharmonics and encodes sharps without substituting chords", () => {
  assert.equal(getChordAssetName("Cb6"), "B6")
  assert.equal(getChordAssetName("Fb"), "Emaj")
  assert.equal(getChordAssetName("CM7"), "Cmaj7")
  assert.equal(getChordAssetName("Am/G"), "Am_g")
  assert.equal(getChordAssetName("Am/G#"), "Am_ab")
  assert.equal(getChordAssetUrl("F#m"), "/chords_final/F%23m_v1.png")
  assert.equal(getChordAssetName("E(#9)"), null)
  assert.equal(getChordAssetName("F(#9)"), null)
  assert.equal(getChordAssetName("F#9"), "F#9")
  assert.equal(getChordAssetName("E7(b9)"), "E7b9")
})

test("six added slash chords resolve to their own images including enharmonic bass names", () => {
  for (const [symbol, asset] of [
    ["E7/B", "E7_b"], ["D7/F#", "D7_f#"], ["Em7/B", "Em7_b"],
    ["D7/A", "D7_a"], ["B7/F#", "B7_f#"], ["G7/B", "G7_b"],
    ["D7/Gb", "D7_f#"], ["H7/Gb", "B7_f#"],
  ]) {
    assert.equal(getChordAssetName(symbol), asset, symbol)
  }
  assert.equal(getChordAssetUrl("D7_f#"), "/chords_final/D7_f%23_v1.png")
})

test("added PNGs are intact transparent 300px images and contain the required bass and chord tones", async () => {
  const fs = require("node:fs")
  const path = require("node:path")
  const crypto = require("node:crypto")
  const sharp = require("sharp")
  const { images } = require("./slash-chord-image-sources.json")
  const expected = {
    "E7/B": { tones: [2, 4, 8, 11], bass: 11 },
    "D7/F#": { tones: [0, 2, 6, 9], bass: 6 },
    "Em7/B": { tones: [2, 4, 7, 11], bass: 11 },
    "D7/A": { tones: [0, 2, 6, 9], bass: 9 },
    "B7/F#": { tones: [3, 6, 9, 11], bass: 6 },
    "G7/B": { tones: [2, 5, 7, 11], bass: 11 },
  }
  assert.equal(images.length, 6)
  assert.equal(new Set(images.map(image => image.symbol)).size, 6)
  for (const image of images) {
    const png = fs.readFileSync(path.join(__dirname, "../public/chords_final", image.file))
    assert.equal(crypto.createHash("sha256").update(png).digest("hex"), image.pngSha256)
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    assert.equal(info.width, 300)
    assert.equal(info.height, 300)
    assert.equal(data[3], 0)
    assert.ok(data.some((value, index) => index % 4 === 3 && value === 255))
    const pitches = image.frets.flatMap((fret, index) => fret < 0 ? [] : [[40, 45, 50, 55, 59, 64][index] + fret])
    assert.deepEqual([...new Set(pitches.map(pitch => pitch % 12))].sort((a, b) => a - b), expected[image.symbol].tones)
    assert.equal(Math.min(...pitches) % 12, expected[image.symbol].bass)
  }
})
