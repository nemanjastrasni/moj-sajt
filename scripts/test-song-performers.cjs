/* eslint-disable @typescript-eslint/no-require-imports -- Isolated performer and page fixtures. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test } = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), Module = require("node:module")
const { collaborationPlan, collaborationParts, artistNameKey } = require("../lib/artists/collaborations.ts")
const { isResolvedCollaboration, performerArtists, performerHref } = require("../lib/artists/performers.ts")
const artist = (id, name, category = "narodne") => ({ id, name, category, slug: id })
test("duets, featuring and three-way collaborations resolve to independent existing artists", () => {
  const artists = [artist("aca", "Aca Lukas"), artist("marija", "Marija \u0160erifovi\u0107"), artist("ivana", "Ivana Selakov"), artist("duet", "Aca Lukas & Marija Serifovic"), artist("trio", "Aca Lukas feat. Marija Serifovic & Ivana Selakov")]
  const plan = collaborationPlan(artists)
  assert.equal(plan.ready.length, 2)
  assert.deepEqual(plan.ready[0].performers.map(row => row.id), ["aca", "marija"])
  assert.deepEqual(plan.ready[1].performers.map(row => row.id), ["aca", "marija", "ivana"])
  assert.equal(artistNameKey("\u0110ani"), artistNameKey("Djani"))
})
test("band names are not split even if apparent individual members exist", () => {
  for (const name of ["Denis & Denis", "Denis I Denis", "Leb i Sol", "Nick Cave & The Bad Seeds", "Emerson Lake & Palmer", "Inspektor Bla\u017ea i Kljunovi"]) assert.equal(collaborationParts(name), null, name)
})
test("ambiguous or missing people, repeated credits and abbreviations do not get guessed", () => {
  const plan = collaborationPlan([artist("a", "Aca Lukas"), artist("m1", "Marija Serifovic"), artist("m2", "Marija \u0160erifovi\u0107"), artist("duet", "Aca Lukas & Marija Serifovic"), artist("unknown", "Aca Lukas & Ivana"), artist("same", "Aca Lukas & Aca Lukas")])
  assert.equal(plan.ready.length, 0)
  assert.equal(plan.unresolved.length, 3)
})
test("cross-category appearances are permitted but a unique same-category profile wins", () => {
  const plan = collaborationPlan([artist("a", "Aca Lukas"), artist("m", "Marija Serifovic", "domace"), artist("duet", "Aca Lukas & Marija Serifovic")])
  assert.equal(plan.ready[0].performers[1].id, "m")
})
test("a combined artist hides only when every song has at least two distinct performer links", () => {
  assert.equal(isResolvedCollaboration([]), false)
  assert.equal(isResolvedCollaboration([{ performers: [{ artistId: "a" }, { artistId: "b" }] }]), true)
  assert.equal(isResolvedCollaboration([{ performers: [{ artistId: "a" }, { artistId: "b" }] }, { performers: [] }]), false)
  assert.equal(isResolvedCollaboration([{ performers: [{ artistId: "a" }, { artistId: "a" }] }]), false)
  assert.deepEqual(performerArtists(undefined), [])
  assert.equal(performerHref(artist("aca", "Aca")), "/pesme/narodne/aca")
})
test("additive schema protects links, prevents duplicates and does not change parent tables", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../prisma/sql/song-performers.sql"), "utf8")
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/)
  assert.match(sql, /REVOKE ALL.*PUBLIC, anon, authenticated/)
  assert.match(sql, /PRIMARY KEY \("songId", "artistId"\)/)
  assert.match(sql, /UNIQUE \("songId", "position"\)/)
  assert.doesNotMatch(sql, /DROP|UPDATE public|DELETE FROM|ALTER TABLE public\."(?:Song|Artist)" /)
})

test("artist pages union owned songs and guest appearances with canonical links", async () => {
  let query
  const original = Module._load
  Module._load = function(request, parent, isMain) {
    if (request === "@/lib/prisma") return { prisma: { artist: { findFirst: async () => ({ ...artist("aca", "Aca Lukas"), bio: null }) }, song: { findMany: async input => { query = input; return [] } } } }
    if (request === "@/lib/artistPhotos") return { getArtistImage: () => null }
    if (request === "@/lib/adminContent/server") return { artistContentVersion: () => "version" }
    if (request.endsWith(".module.css")) return {}
    if (request.startsWith("@/app/components/")) return { __esModule: true, default: () => null, UiText: () => null }
    if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
    return original.call(this, request, parent, isMain)
  }
  let Page
  try { Page = require("../app/pesme/[category]/[artist]/page.tsx").default } finally { Module._load = original }
  await Page({ params: Promise.resolve({ category: "narodne", artist: "aca" }) })
  assert.deepEqual(query.where.OR, [{ artistId: "aca" }, { performers: { some: { artistId: "aca" } } }])
  assert.ok(query.select.artist)
  assert.ok(query.select.performers)
})
