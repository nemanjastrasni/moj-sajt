/* eslint-disable @typescript-eslint/no-require-imports -- Pure parser and rendering fixtures. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test } = require("node:test"), assert = require("node:assert/strict"), Module = require("node:module"), path = require("node:path")
const { parseSongSheet } = require("../lib/chords/songSheet.ts"), { lyricsOnlyLines } = require("../lib/chords/lyricsOnly.ts")
test("lyrics mode removes full chord/bass/tab rows and their spacing, while retaining stanzas", () => {
  const sheet = parseSongSheet("Am---C--G\n  Prvi    stih.\nDm   Am\n Drugi stih!\n\nRef.\nE(#9) E(b9) Am A7\nNovi refren.\n\ne|---0-1---|\nB|---1-3---|\nG    (bass: G A B)\nKraj stiha.")
  const before = JSON.stringify(sheet)
  assert.deepEqual(lyricsOnlyLines(sheet), ["Prvi stih.", "Drugi stih!", "", "Ref.", "Novi refren.", "", "Kraj stiha."])
  assert.equal(JSON.stringify(sheet), before)
})
test("inline and connector-prefix chords disappear without deleting lyric characters or punctuation", () => {
  assert.deepEqual(lyricsOnlyLines(parseSongSheet("[Am]Dobro[G]dosao, svet!\nB----Em-- tad\nA ja idem.\nBilo je lepo.")), ["Dobrodosao, svet!", "tad", "A ja idem.", "Bilo je lepo."])
})
test("music-only material stays empty and section markers survive musical rows", () => {
  assert.deepEqual(lyricsOnlyLines(parseSongSheet("G{riff}\nA{riff}\nD7/F#\n\n")), [])
  assert.deepEqual(lyricsOnlyLines(parseSongSheet("Uvod: Am G\nPrvi stih\nKraj: G, C")), ["Uvod:", "Prvi stih", "Kraj:"])
})
test("rendered lyrics have no chord components, preserve stanzas and escape text", () => {
  const original = Module._load
  Module._load = function(request, parent, isMain) {
    if (request === "./UiText") return { useI18n: () => ({ t: value => value }) }
    if (request === "./Chord") return { __esModule: true, default: () => { throw Error("No chord should render") } }
    if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
    return original.call(this, request, parent, isMain)
  }
  let Sheet
  try { Sheet = require("../app/components/SongSheet.tsx").default } finally { Module._load = original }
  const React = require("react"), { renderToStaticMarkup } = require("react-dom/server")
  const html = renderToStaticMarkup(React.createElement(Sheet, { lines: parseSongSheet("Am G\nStih <script>x</script>\n\nC F\nDruga strofa"), transpose: 5, textSize: 18, chordSize: 18, lyricsOnly: true }))
  assert.match(html, /data-lyrics-only/); assert.doesNotMatch(html, /data-chord-row|<script>/)
  assert.match(html, /&lt;script&gt;/); assert.match(html, /\n\nDruga strofa/)
})
