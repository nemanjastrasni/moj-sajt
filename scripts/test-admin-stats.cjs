/* eslint-disable @typescript-eslint/no-require-imports -- Admin statistics use isolated fixtures, never production writes. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test, beforeEach } = require("node:test"), assert = require("node:assert/strict")
const Module = require("node:module"), path = require("node:path"), React = require("react"), { renderToStaticMarkup } = require("react-dom/server")
const model = require("../lib/adminStats/model.ts")
let allowed, fail, rows, artists, calls, invalidations, authCalls, store, cacheOptions
const original = Module._load
Module._load = function(request, parent, main) {
  if (request === "@/lib/adminSongs/server") return { requireSongAdmin: async () => { authCalls++; if (!allowed) throw Object.assign(Error("denied"), { status: 403 }); return { id: "admin" } } }
  if (request === "@/lib/prisma") return { prisma: { $transaction: async (work, options) => {
    calls.push({ kind: "transaction", options }); if (fail) throw Error("database unavailable")
    const batch = (data, query) => { const from = query.cursor ? data.findIndex(row => row.id === query.cursor.id) + query.skip : 0; return data.slice(from, from + query.take) }
    return work({
      song: { findMany: async query => { calls.push({ kind: "songs", query }); return batch(rows, query) } },
      artist: { findMany: async query => { calls.push({ kind: "artists", query }); return batch(artists, query) } },
      user: { count: async () => 7 },
    })
  } } }
  if (request === "next/cache") return {
    unstable_cache: (work, keys, options) => { cacheOptions = { keys, options }; return async () => { if (!store) store = await work(); return store } },
    revalidateTag: tag => { invalidations.push(tag); store = null },
    revalidatePath: route => invalidations.push(route),
  }
  if (request === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, main)
}
let server, actions, Page
try {
  server = require("../lib/adminStats/server.ts")
  actions = require("../app/admin/actions.ts")
  Page = require("../app/admin/page.tsx").default
} finally { Module._load = original }

beforeEach(() => {
  allowed = true; fail = false; calls = []; invalidations = []; authCalls = 0; store = null
  rows = [{ id: "a", lyrics: "C G Am\nOvo je probni stih.", chords: null }, { id: "b", lyrics: "Ovo je probni stih bez akorda.", chords: null }]
  artists = [{ id: "a", bio: "Probna biografija", bioShort: null, discography: [{ title: "Album", year: "2001" }] }]
})

test("embedded and separate chord notation count even when the other database field is empty", () => {
  for (const song of [
    { lyrics: "C G Am\nProbni stih.", chords: null },
    { lyrics: "Probni stih.", chords: "Am Dm E7" },
    { lyrics: "[Am]Probni [G]stih.", chords: null },
    { lyrics: null, chords: "F#m Bm E" },
  ]) assert.equal(model.songContentKind(song), "withChords")
  assert.equal(model.songContentKind({ lyrics: "A kada pođem daleko\nBiće mi drago.", chords: null }), "textOnly", "lyric words do not become chord symbols")
})

test("tablature and bass notation are not counted as lyric-only songs", () => {
  assert.equal(model.songContentKind({ lyrics: "e|---0---2---3---|\nB|---1---3---0---|", chords: null }), "notationOnly")
  assert.equal(model.songContentKind({ lyrics: "Probni tekst.", chords: "e|---0---2---3---|" }), "notationOnly")
  assert.equal(model.songContentKind({ lyrics: "{bass: E A B}", chords: null }), "notationOnly")
  assert.equal(model.songContentKind({ lyrics: "e|---0---2---3---|\nAm G", chords: null }), "withChords")
})

test("blank and wrapper-only records stay separate from songs containing actual text", () => {
  for (const lyrics of [null, "", " \r\n\t", "\u200b\u200d\ufeff", "[tab]\n[/tab]"]) assert.equal(model.songContentKind({ lyrics, chords: null }), "empty")
  assert.equal(model.songContentKind({ lyrics: "", chords: "Probni stih bez akorda." }), "textOnly")
})

test("biographies count once per artist and require real prose; discographies require an album", () => {
  const counts = { artists: 0, biographies: 0, discographies: 0 }
  model.addArtistCounts(counts, [
    { bio: "Biografija nije dostupna.", bioShort: "Biography is not available yet.", discography: [] },
    { bio: null, bioShort: "Kratka biografija", discography: [{ title: "Album" }, { title: "Drugi album" }] },
    { bio: "Duga biografija", bioShort: "Kratka biografija", discography: '[{"title":"Treći album","year":"2003"}]' },
    { bio: "\u200b", bioShort: null, discography: [null, {}, { title: "" }, "Diskografija nije dostupna."] },
    { bio: null, bioShort: null, discography: "2001 - Stari album\n2002 - Novi album" },
  ])
  assert.deepEqual(counts, { artists: 5, biographies: 2, discographies: 3 })
})

test("song content counters form a complete partition and never mutate source content", () => {
  const input = [...rows, { lyrics: "e|---1---2---|", chords: null }, { lyrics: " ", chords: null }], before = structuredClone(input), counts = model.emptySongCounts()
  model.addSongCounts(counts, input)
  assert.deepEqual(counts, { songs: 4, withChords: 1, textOnly: 1, notationOnly: 1, empty: 1 })
  assert.deepEqual(input, before)
})

test("admin authorization is checked even for a cached result and a forced refresh", async () => {
  await server.readAdminStatistics()
  assert.equal(calls.filter(call => call.kind === "transaction").length, 1)
  allowed = false
  await assert.rejects(server.readAdminStatistics(), error => error.status === 403)
  await assert.rejects(actions.refreshAdminStatistics(), error => error.status === 403)
  assert.deepEqual(invalidations, [])
  assert.equal(authCalls, 3)
})

test("keyset batches cover the complete catalog once and cache aggregates without content or accounts", async () => {
  rows = Array.from({ length: 1003 }, (_, index) => ({ id: String(index).padStart(5, "0"), lyrics: index % 2 ? "C G\nProbni stih" : "Probni stih bez akorda", chords: null }))
  artists = Array.from({ length: 503 }, (_, index) => ({ id: String(index).padStart(5, "0"), bio: "Biografija", bioShort: null, discography: [] }))
  const result = await server.readAdminStatistics()
  assert.equal(result.songs, 1003); assert.equal(result.textOnly, 502); assert.equal(result.withChords, 501)
  assert.equal(result.artists, 503); assert.equal(result.biographies, 503); assert.equal(result.users, 7)
  assert.equal(calls.filter(call => call.kind === "songs").length, 3)
  assert.equal(calls.filter(call => call.kind === "artists").length, 2)
  assert.equal(calls[0].options.isolationLevel, "RepeatableRead")
  assert.ok(calls.filter(call => call.query).every(call => call.query.take === 500 && call.query.orderBy.id === "asc"))
  assert.doesNotMatch(JSON.stringify(result), /lyrics|bioShort|password|email|Probni|Biografija/)
  await server.readAdminStatistics()
  assert.equal(calls.filter(call => call.kind === "transaction").length, 1)
  assert.deepEqual(cacheOptions.options.tags, [server.ADMIN_STATS_TAG]); assert.equal(cacheOptions.options.revalidate, 300)
})

test("refresh invalidates only statistics and the admin page, with no database mutation", async () => {
  await actions.refreshAdminStatistics()
  assert.deepEqual(invalidations, [server.ADMIN_STATS_TAG, "/admin"])
  assert.equal(calls.length, 0)
})

test("database errors cannot appear as a successful all-zero dashboard", async () => {
  fail = true
  await assert.rejects(server.readAdminStatistics(), /database unavailable/)
  fail = false
  assert.equal((await server.readAdminStatistics()).songs, 2)
})

test("dashboard shows distinct content counts with their definitions and a protected refresh action", async () => {
  const html = renderToStaticMarkup(await Page())
  for (const label of ["Pesme ukupno", "Samo tekst", "Biografije", "Diskografije", "Izvođači", "Korisnici", "Osveži statistiku", "najmanje jednim albumom", "Bez prepoznatih akorda", "Poslednji obračun"]) assert.ok(html.includes(label), label)
  assert.doesNotMatch(html, /Probni stih/)
})
