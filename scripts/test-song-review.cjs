/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS module-loader stubs. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const Module = require("node:module")
const path = require("node:path")
const { Prisma } = require("@prisma/client")
const { renderToStaticMarkup } = require("react-dom/server")
const model = require("../lib/songReview/model.ts")
const query = require("../lib/adminSongs/query.ts")
let state, session, down, revoked, failWrite, conflicts, attempts, locked, cacheFailure, reads, reviewQueries
const tx = {
  user: { findUnique: async ({ where }) => { if (down) throw Error("postgres://secret"); reads++; return state.users.find(user => user.id === where.id) ?? null } },
  $queryRaw: async value => { assert.ok(value.sql.includes("FOR UPDATE")); assert.deepEqual(value.values, ["song"]); locked = true; return [{ id: "song" }] },
  song: { findUnique: async ({ where }) => { assert.equal(locked, true); return state.songs.find(song => song.id === where.id) ? { ...state.songs.find(song => song.id === where.id), review: state.reviews.find(row => row.songId === where.id) ?? null } : null } },
  songReview: {
    findMany: async args => {
      reviewQueries.push(args)
      assert.deepEqual(args.select, { songId: true, status: true })
      return state.reviews.filter(row => args.where.songId.in.includes(row.songId)).map(({ songId, status }) => ({ songId, status }))
    },
    findUnique: async ({ where }) => { reads++; return state.reviews.find(row => row.songId === where.songId) ?? null },
    upsert: async ({ where, create, update }) => {
      assert.equal(locked, true)
      if (failWrite) throw Error("private database details")
      const current = state.reviews.find(row => row.songId === where.songId)
      if (current) return Object.assign(current, update)
      state.reviews.push(create); return create
    },
  },
}
const prisma = { ...tx, $transaction: async (work, options) => {
  attempts++; locked = false
  assert.equal(options.isolationLevel, "Serializable")
  if (conflicts-- > 0) throw new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "test" })
  if (revoked) state.users[0].role = "user"
  const before = structuredClone(state)
  try { return await work(tx) } catch (error) { state = before; throw error }
} }
const original = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "@/lib/prisma") return { prisma }
  if (request === "next/cache") return { revalidatePath() { if (cacheFailure) throw Error("cache") } }
  if (request === "./AdminContentButtons" || request === "./SongReviewControl") return { __esModule: true, default: () => null }
  if (request === "./UiText") return { __esModule: true, default: ({ text }) => text, useI18n: () => ({ t: text => text, locale: "sr" }) }
  if (request.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, isMain)
}
let server, route, PageActions, ArtistSongList
try {
  server = require("../lib/songReview/server.ts")
  route = require("../app/api/admin/songs/[id]/review/route.ts")
  PageActions = require("../app/components/AdminPageActions.tsx").default
  ArtistSongList = require("../app/components/ArtistSongList.tsx").default
} finally { Module._load = original }
beforeEach(() => {
  state = { users: [{ id: "admin", role: "admin", banned: false }, { id: "user", role: "user", banned: false }], songs: [{ id: "song", title: "Song", lyrics: "  G       D\nOvo je stih.", chords: null }], reviews: [] }
  session = { user: { id: "admin", role: "admin" } }; down = revoked = failWrite = cacheFailure = false; conflicts = attempts = reads = 0; locked = false
  reviewQueries = []
})
const body = (status = "verified", expectedStatus = "unreviewed") => ({ status, expectedStatus, version: server.songReviewVersion(state.songs[0]) })
const req = (data, headers = {}) => new Request("https://site.test/api/admin/songs/song/review", { method: "PATCH", headers: { "content-type": "application/json", origin: "https://site.test", ...headers }, body: JSON.stringify(data) })
const ctx = id => ({ params: Promise.resolve({ id }) })

test("four explicit statuses separate manual layout corrections from verified music; no coercion", () => {
  assert.deepEqual(model.reviewStatuses, ["unreviewed", "needs_fix", "manually_corrected", "verified"])
  assert.equal(model.reviewLabels.manually_corrected, "Ispravljeno ru\u010dno")
  assert.equal(require("../lib/i18n/messages.ts").english[model.reviewLabels.manually_corrected], "Manually corrected")
  for (const value of [null, "correct", ["verified"], true, {}, "__proto__"]) assert.equal(model.isReviewStatus(value), false)
  for (const value of [null, [], { ...body(), status: "bad" }, { ...body(), expectedStatus: "bad" }, { ...body(), version: "old" }]) assert.throws(() => server.validateSongReview(value))
  assert.deepEqual(server.validateSongReview({ ...body(), reviewedById: "user", lyrics: "injected" }), body())
})
test("content version ignores title/visits but catches whitespace, chords and NULL transitions", () => {
  const song = state.songs[0], version = server.songReviewVersion(song)
  assert.equal(version, server.songReviewVersion({ ...song, title: "New", popularity: 50 }))
  for (const patch of [{ lyrics: song.lyrics + " " }, { lyrics: song.lyrics.replace("       ", " ") }, { chords: "" }, { chords: "G D" }]) assert.notEqual(version, server.songReviewVersion({ ...song, ...patch }))
})
test("only current non-banned admins can write even with forged/stale session roles", async () => {
  for (const identity of [null, { id: "user", role: "admin" }, { id: "missing", role: "admin" }, { id: "admin", role: "admin" }]) {
    session = identity ? { user: identity } : null; state.users[0].banned = identity?.id === "admin"
    assert.ok([401, 403].includes((await route.PATCH(req(body()), ctx("song"))).status))
    assert.equal(state.reviews.length, 0)
  }
})
test("cross-origin, malformed, oversized and non-JSON writes fail without a review", async () => {
  assert.equal((await route.PATCH(req(body(), { origin: "https://evil.test" }), ctx("song"))).status, 403)
  assert.equal((await route.PATCH(req(body(), { "sec-fetch-site": "cross-site" }), ctx("song"))).status, 403)
  assert.equal((await route.PATCH(req(body(), { "content-type": "text/plain" }), ctx("song"))).status, 415)
  assert.equal((await route.PATCH(req({ huge: "x".repeat(600001) }), ctx("song"))).status, 413)
  assert.equal((await route.PATCH(new Request("https://site.test/review", { method: "PATCH", headers: { "content-type": "application/json" }, body: "{" }), ctx("song"))).status, 400)
  assert.equal(state.reviews.length, 0)
})
test("manual review records the real actor and server timestamp without changing song data", async () => {
  const before = structuredClone(state.songs)
  const response = await route.PATCH(req({ ...body(), reviewedById: "forged", updatedAt: "1900", lyrics: "forged" }), ctx("song"))
  assert.equal(response.status, 200); assert.equal((await response.json()).review.status, "verified")
  assert.equal(state.reviews[0].reviewedById, "admin"); assert.ok(state.reviews[0].updatedAt instanceof Date)
  assert.deepEqual(state.songs, before); assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.equal(response.headers.get("vary"), "Cookie")
})
test("admin can move between all four statuses while retaining a single current row", async () => {
  await route.PATCH(req(body()), ctx("song"))
  assert.equal((await route.PATCH(req(body("needs_fix", "verified")), ctx("song"))).status, 200)
  assert.equal((await route.PATCH(req(body("manually_corrected", "needs_fix")), ctx("song"))).status, 200)
  assert.equal(state.reviews[0].status, "manually_corrected")
  assert.equal((await route.PATCH(req(body("unreviewed", "manually_corrected")), ctx("song"))).status, 200)
  assert.equal(state.reviews.length, 1); assert.equal(state.reviews[0].status, "unreviewed")
})
test("a stale displayed song cannot be marked verified after its text or chord spacing changes", async () => {
  const stale = body(); state.songs[0].lyrics += " changed"
  const response = await route.PATCH(req(stale), ctx("song"))
  assert.equal(response.status, 409); assert.match((await response.json()).error, /Tekst ili akordi/); assert.equal(state.reviews.length, 0)
})
test("a second administrator's change cannot be overwritten using a stale status", async () => {
  state.reviews.push({ songId: "song", status: "needs_fix", reviewedById: "other", updatedAt: new Date() })
  assert.equal((await route.PATCH(req(body()), ctx("song"))).status, 409)
  assert.equal(state.reviews[0].status, "needs_fix")
})
test("deleted songs and malformed IDs cannot acquire reviews", async () => {
  const data = body(); state.songs = []
  assert.equal((await route.PATCH(req(data), ctx("song"))).status, 404)
  assert.equal((await route.PATCH(req(data), ctx("../song"))).status, 400)
})
test("rights revoked after initial authorization are rechecked inside the transaction", async () => {
  revoked = true
  assert.equal((await route.PATCH(req(body()), ctx("song"))).status, 403)
  assert.equal(locked, false); assert.equal(state.reviews.length, 0)
})
test("row-lock and serializable retries are bounded; failed write never looks saved", async () => {
  conflicts = 2; cacheFailure = true
  assert.equal((await route.PATCH(req(body()), ctx("song"))).status, 200); assert.equal(attempts, 3)
  conflicts = 3; assert.equal((await route.PATCH(req(body("needs_fix", "verified")), ctx("song"))).status, 503)
  failWrite = true; assert.equal((await route.PATCH(req(body("needs_fix", "verified")), ctx("song"))).status, 503)
  assert.equal(state.reviews[0].status, "verified")
})
test("database errors do not leak credentials or render a successful empty review", async () => {
  down = true; const response = await route.PATCH(req(body()), ctx("song"))
  assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(await response.json()), /postgres|secret/)
})
test("public controls do not query or expose reviews to ordinary/anonymous visitors", async () => {
  const props = { id: "song", name: "Song", kind: "song", editHref: "/edit", songVersion: body().version }
  session = null; assert.equal(await PageActions(props), null); assert.equal(reads, 0)
  session = { user: { id: "user", role: "admin" } }; assert.equal(await PageActions(props), null); assert.equal(reads, 1)
  session = { user: { id: "admin" } }
  const element = await PageActions(props)
  const control = element.props.children[1]
  assert.equal(control.props.initial.status, "unreviewed"); assert.equal(control.props.initial.version, props.songVersion)
})
test("admin filters handle absent review rows, checked/flagged records and pagination links", () => {
  assert.equal(query.adminSongFilters({ review: ["verified"] }).review, "")
  assert.equal(query.adminSongFilters({ review: "invented" }).review, "")
  for (const status of model.reviewStatuses) {
    const filters = query.adminSongFilters({ review: status, q: "Song", artist: "Band", page: "2" })
    const where = JSON.stringify(query.adminSongWhere(filters))
    assert.ok(where.includes(status)); if (status === "unreviewed") assert.ok(where.includes('"is":null'))
    assert.equal(new URL(query.adminSongHref(filters, 3), "https://site.test").searchParams.get("review"), status)
  }
})
test("review is an optional private relation, not a public Song scalar field", () => {
  const song = Prisma.dmmf.datamodel.models.find(model => model.name === "Song")
  assert.equal(song.fields.find(field => field.name === "review").kind, "object")
  assert.ok(!song.fields.some(field => field.kind === "scalar" && /review/i.test(field.name)))
})

const artistListProps = () => ({ category: "domace", artist: "test-band", songs: state.songs.map(song => ({ ...song, slug: song.id, difficulty: "beginner" })) })

test("artist song list exposes no reviews and performs no review query for non-admin visitors", async () => {
  for (const identity of [null, { id: "user", role: "admin" }, { id: "missing", role: "admin" }, { id: "admin", role: "admin" }]) {
    session = identity ? { user: identity } : null
    state.users[0].banned = identity?.id === "admin"
    const html = renderToStaticMarkup(await ArtistSongList(artistListProps()))
    assert.ok(html.includes("Song"))
    assert.ok(!html.includes("data-song-review"))
    assert.equal(reviewQueries.length, 0)
  }
})

test("admin artist list batches only displayed song IDs and shows all four marks plus default unreviewed", async () => {
  state.songs = [...model.reviewStatuses, "absent"].map(id => ({ ...state.songs[0], id, title: id }))
  state.reviews = model.reviewStatuses.map(status => ({ songId: status, status, reviewedById: "private-reviewer", updatedAt: new Date() }))
  state.reviews.push({ songId: "another-artists-song", status: "verified", reviewedById: "secret" })
  const html = renderToStaticMarkup(await ArtistSongList(artistListProps()))
  assert.equal(reviewQueries.length, 1)
  assert.deepEqual(reviewQueries[0].where.songId.in, state.songs.map(song => song.id))
  for (const status of model.reviewStatuses) assert.ok(html.includes(`data-song-review="${status}"`))
  assert.equal((html.match(/data-song-review="unreviewed"/g) || []).length, 2)
  assert.ok(html.includes("Ispravljeno ru\u010dno"))
  assert.ok(!/private-reviewer|another-artists-song|secret/.test(html))
  assert.ok(html.includes('/pesme/domace/test-band/manually_corrected'))
})

test("empty artist list skips all auth/status reads; authorization outages are not silent public fallbacks", async () => {
  await ArtistSongList({ ...artistListProps(), songs: [] })
  assert.equal(reads, 0); assert.equal(reviewQueries.length, 0)
  down = true
  await assert.rejects(() => ArtistSongList(artistListProps()))
  assert.equal(reviewQueries.length, 0)
})

test("new manual-correction status rejects stale content and stale previous marks", async () => {
  const stale = body("manually_corrected")
  state.songs[0].lyrics += " changed"
  assert.equal((await route.PATCH(req(stale), ctx("song"))).status, 409)
  state.reviews.push({ songId: "song", status: "verified" })
  assert.equal((await route.PATCH(req(body("manually_corrected")), ctx("song"))).status, 409)
  assert.equal(state.reviews[0].status, "verified")
})
