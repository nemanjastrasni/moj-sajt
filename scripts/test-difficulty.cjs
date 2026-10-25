/* eslint-disable @typescript-eslint/no-require-imports -- Node tests run the real TypeScript modules. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { songChords, estimateDifficulty, difficultyLevels, playableLevel } = require("../lib/music/difficulty.ts")
const { matchesCatalog, catalogEntry } = require("../lib/playlists/catalog.ts")
const song = lyrics => ({ lyrics, category: "domace", difficulty: "beginner" })

test("five difficulty levels use recognized shapes and complexity, not the database beginner default", () => {
  const examples = ["C G Am", "C G Am D Em", "F#m Bm E", "C/E D/F# G/B", "E(#9) E(b9) Am A7"]
  assert.deepEqual(examples.map(lyrics => estimateDifficulty(song(lyrics)).level), difficultyLevels)
  assert.equal(estimateDifficulty(song("Bez akorda ovde\nPamet kad se pomeri")).level, null)
})
test("musical lines, inline symbols, lowercase, European names and connectors use the shared parser", () => {
  assert.deepEqual(songChords(song("b----em-- tad")), ["B", "Em"])
  assert.deepEqual(songChords(song("E(#9) E(b9) Am A7\nPamet kad se pomeri")), ["E(#9)", "E(b9)", "Am", "A7"])
  assert.deepEqual(songChords(song("F# B F# C# (bass: C# C# B A# G# F#)")), ["F#", "B", "C#"])
  assert.deepEqual(songChords(song("Prelaz 2:\nG{riff}\n...U velikoj zurbi\nA{riff}\nKraj: G, C,")), ["G", "A", "C"])
  assert.deepEqual(songChords(song("[Am]Stih [G]pesme")), ["Am", "G"])
  assert.deepEqual(songChords(song("Fis H B")), ["F#", "B"])
})
test("words and tablature are not chords; isolated backing chords are a fallback only", () => {
  assert.deepEqual(songChords(song("Belo oko mene sve je belo\nDanas dolazim\nA ljubav ostaje")), [])
  assert.deepEqual(songChords(song("e|--0--2--3--|\nB|--0--1--0--|")), [])
  assert.deepEqual(songChords({ lyrics: "Tekst pesme", chords: "Am G" }), ["Am", "G"])
  assert.deepEqual(songChords({ lyrics: "D Em\nTekst pesme", chords: "C" }), ["D", "Em"])
  assert.deepEqual(songChords(song("H B Cb B")), ["B"])
})
test("catalogs share the same estimate, never fill an empty selection with unrelated songs", () => {
  for (const level of ["veoma-lako", "lako", "srednje", "tesko", "veoma-tesko"]) assert.ok(catalogEntry(level))
  assert.equal(matchesCatalog(song("E(#9) A7"), "veoma-lako"), false)
  assert.equal(matchesCatalog(song("E(#9) A7"), "veoma-tesko"), true)
  assert.equal(matchesCatalog(song("C G Am"), "beginner"), true)
  assert.equal(matchesCatalog(song("C G Am"), "4-akorda"), true)
  assert.equal(matchesCatalog(song("Belo oko mene sve je belo"), "4-akorda"), false)
  assert.equal(matchesCatalog(song("C G Am"), "rock"), false)
  assert.equal(matchesCatalog(song("Bez akorda"), "domace"), true)
  assert.equal(matchesCatalog(song("C G"), "narodne"), false)
  assert.deepEqual(["beginner", "intermediate", "advanced", "unknown"].map(playableLevel), [1, 2, 4, 1])
})

test("all five difficulty colors stay distinct and readable in both themes", () => {
  const css = fs.readFileSync(path.join(__dirname, "../app/components/SongDifficulty.module.css"), "utf8")
  const luminance = hex => {
    const channels = hex.match(/[\da-f]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722
  }
  for (const [light, background] of [[false, "111111"], [true, "ffffff"], [true, "f5f7f8"]]) {
    const lines = css.split("\n").filter(line => line.includes("--difficulty-color:") && line.includes("data-difficulty=") && line.includes(':global(:root[data-theme="light"])') === light)
    const colors = difficultyLevels.map(level => lines.find(line => line.includes(`data-difficulty="${level}"`))?.match(/--difficulty-color: #([a-f\d]{6})/i)?.[1])
    assert.equal(new Set(colors).size, 5)
    for (const color of colors) {
      assert.ok(color)
      const values = [luminance(color), luminance(background)].sort((a, b) => a - b)
      assert.ok((values[1] + .05) / (values[0] + .05) >= 4.5, `${color} on ${background}`)
    }
  }
})
