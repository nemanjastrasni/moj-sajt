require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const { biographyText, hasBiographyContent, biographyLetters, artistsForBiographyLetter } = require("../lib/biographies/catalog.ts")
const { normalizeDiscography } = require("../lib/discography.ts")
const Module = require("node:module")
let readArgs
const fixtures = [
  { id: "empty", name: "Akt", slug: "akt", category: "domace", image: null, bio: "", bioShort: null, discography: [] },
  { id: "bio", name: "Aerodrom", slug: "aerodrom", category: "domace", image: null, bio: "Biography", bioShort: null, discography: null },
  { id: "disc", name: "Album Band", slug: "album-band", category: "domace", image: null, bio: null, bioShort: null, discography: [{ title: "Album", year: "2000" }] },
  { id: "no-slug", name: "No link", slug: "", category: "domace", image: null, bio: "Biography", bioShort: null, discography: null },
]
const load = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "@/lib/prisma") return { prisma: { artist: { findMany: async args => { readArgs = args; return fixtures } } } }
  return load.call(this, request, parent, isMain)
}
let readBiographyArtists
try { ({ readBiographyArtists } = require("../lib/biographies/server.ts")) } finally { Module._load = load }

test("catalog read is category-scoped, read-only and strips private/full content before rendering", async () => {
  const before = structuredClone(fixtures)
  const artists = await readBiographyArtists("domace")
  assert.deepEqual(readArgs.where, { category: "domace" })
  assert.deepEqual(artists.map(a => a.id), ["bio", "disc"])
  assert.ok(artists.every(a => Object.keys(a).sort().join(",") === "category,id,image,name,slug"))
  assert.deepEqual(fixtures, before)
})

test("biography catalog hides only empty content, not artists missing one of the sections", () => {
  for (const artist of [{}, { bio: " \n\t\u200b", bioShort: "", discography: [] }, { bio: "Biografija nije dostupna.", discography: [null, {}, "[object Object]"] }, { discography: ["Discography is not available yet."] }]) assert.equal(hasBiographyContent(artist), false)
  for (const artist of [{ bio: "A real biography." }, { bioShort: "A short biography." }, { discography: [{ title: "First", year: "1999", kind: "studio" }] }, { discography: "Album (2000)" }]) assert.equal(hasBiographyContent(artist), true)
  assert.equal(biographyText(null), "")
  assert.equal(biographyText(" \nA real biography.  "), "A real biography.")
})

test("letters and number list use the same trimmed case-insensitive classification", () => {
  const rows = ["100 Band", " akt", "Aerodrom", "\u010cudesni", "\u017deljko", "# Band"].map(name => ({ name }))
  assert.deepEqual(biographyLetters(rows), ["#", "A", "\u010c", "\u017d"])
  assert.deepEqual(artistsForBiographyLetter(rows, "a").map(a => a.name), [" akt", "Aerodrom"])
  assert.deepEqual(artistsForBiographyLetter(rows, "num").map(a => a.name), ["100 Band", "# Band"])
  assert.deepEqual(artistsForBiographyLetter(rows, "#"), artistsForBiographyLetter(rows, "NUM"))
  assert.deepEqual(artistsForBiographyLetter(rows, "x"), [])
})

test("legacy discographies parse JSON arrays and explicit dates without stealing title years", () => {
  assert.deepEqual(normalizeDiscography('[{"title":"1989","year":"2014","kind":"studio"}]'), [{ title: "1989", year: "2014", kind: "studio" }])
  assert.deepEqual(normalizeDiscography("1999. First\nSecond - 2001\n1989\nHits 1970-2010 (2011)"), [
    { title: "First", year: "1999", kind: "album" }, { title: "Second", year: "2001", kind: "album" },
    { title: "1989", year: "", kind: "album" }, { title: "Hits 1970-2010", year: "2011", kind: "album" },
  ])
  assert.deepEqual(normalizeDiscography("[{broken}]"), [])
  assert.deepEqual(normalizeDiscography(["N/A", "-", "null", {}, null, "[object Object]"]), [])
})
