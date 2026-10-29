require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, beforeEach, afterEach } = require("node:test")
const assert = require("node:assert/strict")
const Module = require("node:module")
const path = require("node:path")
const { Prisma } = require("@prisma/client")
const validation = require("../lib/adminSongs/validation.ts")
const query = require("../lib/adminSongs/query.ts")
let state, session, failCreate, failDelete, down, serialFailures, attempts, listArgs, cacheFailure, failReview, revokeOnWrite
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "AND") return value.every(w => matches(row, w))
    if (key === "OR") return value.some(w => matches(row, w))
    if (key === "NOT") return (Array.isArray(value) ? value : [value]).every(w => !matches(row, w))
    if (key === "artist") return matches(state.artists.find(a => a.id === row.artistId), value)
    if (value && typeof value === "object") {
      if ("not" in value) return row[key] !== value.not
      let actual = row[key] || ""
      let expected = String(value.equals ?? value.contains ?? value.startsWith).replace(/\\([\\%_])/g, "$1")
      if (value.mode === "insensitive") { actual = actual.toLowerCase(); expected = expected.toLowerCase() }
      return "equals" in value ? actual === expected : "contains" in value ? actual.includes(expected) : actual.startsWith(expected)
    }
    return row?.[key] === value
  })
}
const withArtist = song => song ? { ...song, artist: state.artists.find(a => a.id === song.artistId) } : null
const tx = {
  user: { findUnique: async ({ where }) => state.users.find(u => u.id === where.id) ?? null },
  songReview: { create: async ({ data }) => { if (failReview) throw Error("review-write-failed"); state.reviews.push({ ...data }); return data } },
  artist: {
    findUnique: async ({ where }) => state.artists.find(a => a.id === where.id) ?? null,
    findMany: async ({ where, take }) => state.artists.filter(a => matches(a, where)).slice(0, take),
    create: async ({ data }) => {
      if (state.artists.some(a => a.slug === data.slug)) throw new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "test" })
      const row = { ...data, id: "artist-" + state.artists.length }; state.artists.push(row); return row
    },
  },
  song: {
    findUnique: async ({ where }) => withArtist(state.songs.find(s => s.id === where.id)),
    findFirst: async ({ where }) => state.songs.find(s => matches(s, where)) ?? null,
    create: async ({ data }) => { if (data.title === failCreate) throw Error("secret-db-url"); const row = { ...data, id: "song-" + state.songs.length }; state.songs.push(row); return row },
    update: async ({ where, data }) => Object.assign(state.songs.find(s => s.id === where.id), data),
    delete: async ({ where }) => {
      if (failDelete) throw Error("secret-delete-error")
      if (state.favorites.some(f => f.songId === where.id) || state.playlistSongs.some(p => p.songId === where.id)) throw Error("foreign key")
      state.songs = state.songs.filter(s => s.id !== where.id)
    },
  },
  favorite: { deleteMany: async ({ where }) => { state.favorites = state.favorites.filter(f => !matches(f, where)) } },
  playlistSong: { deleteMany: async ({ where }) => { state.playlistSongs = state.playlistSongs.filter(p => !matches(p, where)) } },
  songSubmission: { updateMany: async ({ where, data }) => state.proposals.filter(p => matches(p, where)).forEach(p => Object.assign(p, data)) },
}
const prisma = {
  user: { findUnique: async ({ where }) => { if (down) throw Error("secret-db-url"); return state.users.find(u => u.id === where.id) ?? null } },
  artist: tx.artist,
  song: { ...tx.song, count: async ({ where }) => state.songs.filter(s => matches(s, where)).length,
    findMany: async args => { listArgs = args; return state.songs.filter(s => matches(s, args.where)).slice(args.skip, args.skip + args.take).map(withArtist) } },
  $transaction: async (work, options) => {
    assert.equal(options.isolationLevel, "Serializable"); attempts++
    if (serialFailures-- > 0) throw new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "test" })
    const before = structuredClone(state)
    if (revokeOnWrite) state.users[0].role = "user"
    try { return await work(tx) } catch (error) { state = before; throw error }
  },
}
const originalLoad = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "@/lib/prisma") return { prisma }
  if (request === "next/cache") return { revalidatePath() { if (cacheFailure) throw Error("cache unavailable") } }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return originalLoad.call(this, request, parent, isMain)
}
let server, routes, item, legacy, artists
try {
  server = require("../lib/adminSongs/server.ts")
  routes = require("../app/api/admin/songs/route.ts")
  item = require("../app/api/admin/songs/[id]/route.ts")
  legacy = require("../app/api/admin/[id]/route.ts")
  artists = require("../app/api/admin/artists/route.ts")
} finally { Module._load = originalLoad }
const request = (data, method = "POST", headers = {}) => new Request("https://site.test/api/admin/songs", { method, headers: { "content-type": "application/json", origin: "https://site.test", ...headers }, body: JSON.stringify(data) })
const context = id => ({ params: Promise.resolve({ id }) })
const valid = () => ({ artistName: "Novi bend", category: "domace", songs: [{ title: "Nova pesma", lyrics: "  G       D\r\nOvo je stih pesme\n" }] })
const seeded = () => {
  state.artists.push({ id: "artist", name: "Bend", slug: "bend", category: "domace", bio: "Original bio", discography: [{ title: "Album", year: "2000" }], image: "/original.jpg", members: ["Singer"] })
  state.songs.push({ id: "target", artistId: "artist", title: "Moja pesma", slug: "legacy-song", category: "domace", lyrics: "Original lyrics", chords: "Original chords" })
}
beforeEach(() => {
  state = { users: [{ id: "admin", role: "admin", banned: false }, { id: "user", role: "user", banned: false }], artists: [], songs: [], reviews: [], favorites: [], playlistSongs: [], proposals: [], playlists: [{ id: "playlist" }], listening: [{ id: "listening" }] }
  session = { user: { id: "admin", role: "admin" } }; failCreate = ""; failDelete = false; down = false; serialFailures = 0; attempts = 0; cacheFailure = false
  failReview = false; revokeOnWrite = false
})
const nativeFetch = global.fetch
afterEach(() => { global.fetch = nativeFetch })

test("admin validation preserves all chord spacing/newlines and permits lyrics-only songs", () => {
  const result = validation.validateSongBatch(valid())
  assert.equal(result.songs[0].lyrics, "  G       D\nOvo je stih pesme\n")
  assert.equal(validation.validateSongBatch({ ...valid(), songs: [{ title: "Samo tekst", lyrics: "Samo tekst bez akorda" }] }).songs.length, 1)
})
test("blank titles/lyrics, invalid categories, controls, oversized batches and injected fields", () => {
  for (const patch of [{ category: "admin" }, { songs: [] }, { songs: Array(21).fill(valid().songs[0]) }, { songs: [{ title: "", lyrics: "Text" }] }, { songs: [{ title: "Title", lyrics: "\u0000" }] }]) assert.throws(() => validation.validateSongBatch({ ...valid(), ...patch }))
  const input = validation.validateSongBatch({ ...valid(), role: "admin", id: "forged" })
  assert.ok(!("role" in input)); assert.ok(!("id" in input))
})
test("duplicate titles within one batch are rejected case-insensitively", () => {
  assert.throws(() => validation.validateSongBatch({ ...valid(), songs: [{ title: "Same", lyrics: "text" }, { title: "same", lyrics: "text" }] }), /vise puta/)
})
test("anonymous, ordinary, banned and deleted users cannot mutate, including forged session role", async () => {
  for (const [user, expected] of [[null, 401], [{ id: "user", role: "admin" }, 403], [{ id: "missing", role: "admin" }, 403]]) {
    session = user ? { user } : null
    assert.equal((await routes.POST(request(valid()))).status, expected)
    assert.equal((await item.PATCH(request({}, "PATCH"), context("target"))).status, expected)
    assert.equal((await legacy.DELETE(request({ title: "X" }, "DELETE"), context("target"))).status, expected)
  }
  session = { user: { id: "admin" } }; state.users[0].banned = true
  assert.equal((await routes.POST(request(valid()))).status, 403)
  assert.equal(state.songs.length, 0)
})
test("cross-site, non-JSON and malformed writes are rejected without mutation", async () => {
  for (const headers of [{ origin: "https://evil.test" }, { "sec-fetch-site": "cross-site" }]) assert.equal((await routes.POST(request(valid(), "POST", headers))).status, 403)
  assert.equal((await routes.POST(request(valid(), "POST", { "content-type": "text/plain" }))).status, 415)
  assert.equal((await routes.POST(new Request("https://site.test/api/admin/songs", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status, 400)
  assert.equal((await routes.POST(request({ oversized: "x".repeat(600001) }))).status, 413)
})
test("batch commits every song, using diacritic-aware slugs and retaining text layout", async () => {
  const response = await routes.POST(request({ ...valid(), songs: [{ title: "Čudna noć", lyrics: "  G\nStih\n" }, { title: "Druga pesma", lyrics: "Text" }] }))
  assert.equal(response.status, 201); assert.equal((await response.json()).success, true)
  assert.equal(state.songs.length, 2); assert.equal(state.songs[0].slug, "cudna-noc"); assert.equal(state.songs[0].lyrics, "  G\nStih\n")
  assert.deepEqual(state.reviews.map(row => [row.songId, row.status, row.reviewedById]), state.songs.map(song => [song.id, "manually_corrected", "admin"]))
  assert.ok(state.reviews.every(row => row.updatedAt instanceof Date))
})

test("new admin songs receive only the manual mark; request fields cannot forge the reviewer or verified status", async () => {
  seeded(); state.reviews.push({ songId: "target", status: "needs_fix", reviewedById: "other-admin" })
  const previous = structuredClone(state.reviews)
  const input = valid(); input.reviewedById = "forged"; input.status = "verified"; input.songs[0].review = { status: "verified", reviewedById: "forged" }
  const response = await routes.POST(request(input))
  assert.equal(response.status, 201)
  assert.deepEqual(state.reviews.slice(0, 1), previous)
  assert.equal(state.reviews[1].status, "manually_corrected"); assert.equal(state.reviews[1].reviewedById, "admin")
})

test("failure saving the initial review rolls back songs and the new artist", async () => {
  failReview = true
  const response = await routes.POST(request(valid()))
  assert.equal(response.status, 503); assert.equal(state.songs.length, 0); assert.equal(state.artists.length, 0); assert.equal(state.reviews.length, 0)
  assert.doesNotMatch(JSON.stringify(await response.json()), /review-write-failed/)
})

test("an admin revoked after the route check cannot create a manually reviewed song", async () => {
  revokeOnWrite = true
  assert.equal((await routes.POST(request(valid()))).status, 403)
  assert.equal(state.songs.length, 0); assert.equal(state.artists.length, 0); assert.equal(state.reviews.length, 0)
})
test("a failure in the second song rolls back the first song and newly created artist", async () => {
  failCreate = "Druga"
  const response = await routes.POST(request({ ...valid(), songs: [...valid().songs, { title: "Druga", lyrics: "Text" }] }))
  assert.equal(response.status, 503); assert.equal(state.songs.length, 0); assert.equal(state.artists.length, 0)
  assert.equal(state.reviews.length, 0)
  assert.doesNotMatch(JSON.stringify(await response.json()), /secret-db/)
})
test("existing artist metadata is never overwritten by blank or injected song-form fields", async () => {
  seeded(); const original = structuredClone(state.artists[0])
  const response = await routes.POST(request({ ...valid(), artistId: "artist", artistName: "Bend", artistBio: "", artistDiscography: "" }))
  assert.equal(response.status, 201); assert.deepEqual(state.artists[0], original)
})
test("existing title conflicts, category mismatch and ambiguous artist names fail atomically", async () => {
  seeded()
  assert.equal((await routes.POST(request({ ...valid(), artistName: "Bend", songs: [{ title: "moja pesma", lyrics: "Text" }] }))).status, 409)
  assert.equal((await routes.POST(request({ ...valid(), artistId: "artist", category: "strane" }))).status, 409)
  state.artists.push({ ...state.artists[0], id: "other", slug: "other" })
  assert.equal((await routes.POST(request({ ...valid(), artistName: "Bend" }))).status, 409)
})
test("slug uniqueness is per artist; collisions get bounded suffixes, not duplicated URLs", async () => {
  seeded()
  state.songs.push({ id: "collision", artistId: "artist", title: "Old title", slug: "nova-pesma" })
  assert.equal((await routes.POST(request({ ...valid(), artistId: "artist" }))).status, 201)
  assert.equal(state.songs.at(-1).slug, "nova-pesma-2")
})
test("edits retain the original slug and do not alter artist metadata", async () => {
  seeded(); const original = structuredClone(state.artists)
  const response = await item.PATCH(request({ title: "Nov naslov", lyrics: "  Em\nNovi stih\n", chords: "kept", artistId: "artist", artistName: "Bend", category: "domace" }, "PATCH"), context("target"))
  assert.equal(response.status, 200); assert.equal(state.songs[0].slug, "legacy-song"); assert.equal(state.songs[0].lyrics, "  Em\nNovi stih\n"); assert.deepEqual(state.artists, original)
})
test("old POST edit endpoint is authenticated and routes to the same checked update", async () => {
  seeded(); session = null
  assert.equal((await item.POST(request({}), context("target"))).status, 401)
})
test("deletion removes only this song's favorite/list links, retaining artists, playlists, history and other songs", async () => {
  seeded(); state.songs.push({ ...state.songs[0], id: "other", title: "Other" })
  state.favorites = [{ songId: "target", userId: "user" }, { songId: "other", userId: "user" }]
  state.playlistSongs = [{ songId: "target", playlistId: "playlist" }, { songId: "other", playlistId: "playlist" }]
  state.proposals = [{ id: "proposal", status: "approved", publishedSongId: "target" }]
  const response = await item.DELETE(request({ title: "Moja pesma" }, "DELETE"), context("target"))
  assert.equal(response.status, 200); assert.equal(state.songs.length, 1); assert.equal(state.songs[0].id, "other")
  assert.deepEqual(state.favorites.map(f => f.songId), ["other"]); assert.deepEqual(state.playlistSongs.map(p => p.songId), ["other"])
  assert.equal(state.proposals[0].publishedSongId, null); assert.equal(state.proposals[0].status, "approved")
  assert.equal(state.artists.length, 1); assert.equal(state.playlists.length, 1); assert.equal(state.listening.length, 1)
})
test("stale title, missing confirmation/id and unknown song cannot delete", async () => {
  seeded()
  assert.equal((await item.DELETE(request({ title: "Old title" }, "DELETE"), context("target"))).status, 409)
  assert.equal((await item.DELETE(request({}, "DELETE"), context("target"))).status, 400)
  assert.equal((await item.DELETE(request({ title: "X" }, "DELETE"), context("../target"))).status, 400)
  assert.equal((await item.DELETE(request({ title: "X" }, "DELETE"), context("missing"))).status, 404)
  assert.equal(state.songs.length, 1)
})
test("failed final deletion rolls back removed references", async () => {
  seeded(); state.favorites.push({ songId: "target" }); state.playlistSongs.push({ songId: "target" }); failDelete = true
  assert.equal((await item.DELETE(request({ title: "Moja pesma" }, "DELETE"), context("target"))).status, 503)
  assert.equal(state.songs.length, 1); assert.equal(state.favorites.length, 1); assert.equal(state.playlistSongs.length, 1)
})

test("metadata-only saves preserve an untouched NULL chord field so reviews are not reset spuriously", async () => {
  seeded(); state.songs[0].chords = null
  const response = await item.PATCH(request({ artistId: "artist", artistName: "Bend", category: "domace", title: "Renamed", lyrics: "Original lyrics", chords: "" }, "PATCH"), context("target"))
  assert.equal(response.status, 200)
  assert.equal(state.songs[0].chords, null)
  assert.equal(state.songs[0].title, "Renamed")
})
test("serializable conflicts retry twice; an unavailable DB never looks like success", async () => {
  serialFailures = 2; assert.equal((await routes.POST(request(valid()))).status, 201); assert.equal(attempts, 3)
  down = true; assert.equal((await routes.POST(request(valid()))).status, 503)
})
test("cache errors after a committed save do not misreport failed creation", async () => {
  cacheFailure = true; assert.equal((await routes.POST(request(valid()))).status, 201); assert.equal(state.songs.length, 1)
})
test("combined filters are ANDed, literal wildcards escaped, invalid pages normalized", () => {
  const filters = query.adminSongFilters({ q: "A&B %", artist: "Name_", letter: "b", category: "domace", page: "-9", sort: "title" })
  const where = query.adminSongWhere(filters)
  assert.equal(where.AND.length, 4); assert.equal(filters.page, 1)
  assert.match(JSON.stringify(where), /\\\\%/); assert.match(JSON.stringify(where), /\\\\_/)
  assert.equal(new URL(query.adminSongHref(filters, 2), "https://site.test").searchParams.get("q"), "A&B %")
  assert.ok(query.adminPageNumbers(500, 100000).length <= 7)
})
test("list pages are clamped after deletion and database fetches stay bounded", async () => {
  seeded()
  const result = await server.listAdminSongs(query.adminSongFilters({ page: "99999" }))
  assert.equal(result.page, 1); assert.equal(listArgs.skip, 0); assert.equal(listArgs.take, 20)
  session = null; assert.equal((await routes.GET(new Request("https://site.test/api/admin/songs"))).status, 401)
})
test("artist autocomplete is authenticated, bounded, insensitive and escapes literal wildcards", async () => {
  seeded(); session = null
  assert.equal((await artists.GET(new Request("https://site.test/api/admin/artists?search=Be"))).status, 401)
  session = { user: { id: "admin" } }
  const response = await artists.GET(new Request("https://site.test/api/admin/artists?search=be"))
  assert.equal(response.status, 200); assert.equal((await response.json())[0].id, "artist")
  for (let i = 0; i < 20; i++) state.artists.push({ id: "extra-" + i, name: "Bend " + i })
  assert.equal((await (await artists.GET(new Request("https://site.test/api/admin/artists?search=be"))).json()).length, 12)
  assert.equal((await (await artists.GET(new Request("https://site.test/api/admin/artists?search=Be%25"))).json()).length, 0)
})

const { adminSongRequest } = require("../lib/adminSongs/client.ts")
test("client never treats old partial-success arrays, HTML or failed responses as saved", async () => {
  for (const response of [new Response(JSON.stringify([{ status: "ERROR" }]), { status: 201 }), new Response("<html>Error</html>", { status: 500 }), new Response(JSON.stringify({ error: "Conflict" }), { status: 409 })]) {
    global.fetch = async () => response
    await assert.rejects(adminSongRequest("/api/admin/songs", "POST", valid()))
  }
})
test("client sends exact delete title and propagates useful errors on network failure", async () => {
  global.fetch = async (url, options) => { assert.equal(options.method, "DELETE"); assert.deepEqual(JSON.parse(options.body), { title: "Exact" }); return new Response(JSON.stringify({ success: true })) }
  assert.equal((await adminSongRequest("/api/admin/songs/id", "DELETE", { title: "Exact" })).success, true)
  global.fetch = async () => { throw new TypeError("Failed to fetch") }
  await assert.rejects(adminSongRequest("/api/admin/songs", "POST", {}), /Veza je prekinuta/)
})

test("client deadline aborts the request and reports uncertain state instead of spinning forever", async () => {
  const nativeTimeout = global.setTimeout
  global.setTimeout = (callback, ms, ...args) => nativeTimeout(callback, ms === 20000 ? 1 : ms, ...args)
  let signal
  global.fetch = (url, options) => new Promise((resolve, reject) => {
    signal = options.signal
    signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true })
  })
  try { await assert.rejects(adminSongRequest("/api/admin/songs", "POST", {}), /Zahtev traje predugo/); assert.equal(signal.aborted, true) }
  finally { global.setTimeout = nativeTimeout }
})
