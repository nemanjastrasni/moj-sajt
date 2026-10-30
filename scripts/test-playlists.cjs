/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS module-loader stubs. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test, beforeEach, afterEach } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const Module = require("node:module")
const { Prisma } = require("@prisma/client")
let state, session, down, failDelete, serialFailures, attempts, cacheFailure, pdfArgs
const missing = () => new Prisma.PrismaClientKnownRequestError("missing", { code: "P2025", clientVersion: "test" })
function matches(row, where = {}) {
  return Boolean(row) && Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some(condition => matches(row, condition))
    if (key === "playlist") return matches(state.playlists.find(p => p.id === row.playlistId), value)
    if (key === "playlistId_songId") return row.playlistId === value.playlistId && row.songId === value.songId
    if (value && typeof value === "object") return "not" in value ? row[key] !== value.not : false
    return row[key] === value
  })
}
function sorted(rows, orderBy) {
  if (!orderBy) return rows
  return rows.slice().sort((a, b) => {
    if (!Array.isArray(orderBy)) return (b.order ?? -1) - (a.order ?? -1)
    return (a.order ?? Infinity) - (b.order ?? Infinity) || a.id.localeCompare(b.id)
  })
}
const tx = {
  favoritePlaylist: { findUnique: async () => null },
  playlist: {
    findFirst: async args => {
      if (down) throw Error("postgres://secret-db")
      const row = state.playlists.find(row => matches(row, args.where))
      if (!row) return null
      if (args.select?.songs) {
        pdfArgs = args
        return { ...row, songs: sorted(state.items.filter(item => item.playlistId === row.id), args.select.songs.orderBy).slice(0, args.select.songs.take ?? Infinity).map(item => {
          const song = state.songs.find(song => song.id === item.songId)
          return { ...item, song: args.select.songs.select.song.select.lyrics ? song : { title: song.title, slug: song.slug, category: song.category, artist: song.artist } }
        }) }
      }
      return { ...row }
    },
    findMany: async ({ where }) => state.playlists.filter(row => matches(row, where)).map(row => ({ ...row, songs: state.items.filter(item => item.playlistId === row.id) })),
    create: async ({ data }) => {
      const { songs, ...fields } = data, row = { ...fields, id: "new-" + state.playlists.length }
      state.playlists.push(row)
      if (songs) await tx.playlistSong.create({ data: { ...songs.create, playlistId: row.id } })
      return { ...row }
    },
    update: async ({ where, data }) => {
      const row = state.playlists.find(row => matches(row, where)); if (!row) throw missing()
      return { ...Object.assign(row, data) }
    },
    delete: async ({ where }) => { if (failDelete) throw Error("secret-delete"); state.playlists = state.playlists.filter(row => !matches(row, where)) },
  },
  playlistSong: {
    findFirst: async ({ where, orderBy }) => sorted(state.items.filter(row => matches(row, where)), orderBy)[0] ?? null,
    findUnique: async ({ where }) => state.items.find(row => matches(row, where)) ?? null,
    findMany: async ({ where, orderBy }) => sorted(state.items.filter(row => matches(row, where)), orderBy).map(row => ({ ...row })),
    create: async ({ data }) => {
      if (state.items.some(row => row.playlistId === data.playlistId && row.songId === data.songId)) throw new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" })
      const row = { ...data, id: "new-item-" + state.items.length }; state.items.push(row); return row
    },
    update: async ({ where, data }) => { const row = state.items.find(row => matches(row, where)); if (!row) throw missing(); return Object.assign(row, data) },
    delete: async ({ where }) => { if (!state.items.some(row => matches(row, where))) throw missing(); state.items = state.items.filter(row => !matches(row, where)) },
    deleteMany: async ({ where }) => { state.items = state.items.filter(row => !matches(row, where)) },
  },
  song: {
    findUnique: async ({ where }) => state.songs.find(song => song.id === where.id) ?? null,
    update: async ({ where }) => { state.songs.find(song => song.id === where.id).popularity++ },
  },
}
const prisma = { ...tx, user: { findUnique: async ({ where }) => { if (down) throw Error("secret-db"); return state.users.find(user => user.id === where.id) ?? null } },
  $transaction: async (work, options) => {
    assert.equal(options.isolationLevel, "Serializable"); attempts++
    if (serialFailures-- > 0) throw new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "test" })
    const before = structuredClone(state)
    try { return await work(tx) } catch (error) { state = before; throw error }
  },
}
const original = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "@/lib/prisma") return { prisma }
  if (request === "next/cache") return { revalidatePath() { if (cacheFailure) throw Error("cache") } }
  if (request === "next/navigation") return { notFound() { throw Error("NEXT_NOT_FOUND") } }
  if (request === "@/app/components/PlaylistClient") return { __esModule: true, default: () => null }
  if (request === "@/app/components/PlaylistCatalog") return { __esModule: true, default: () => null }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, isMain)
}
let route, reorder, legacy, pdf, server, page
try {
  route = require("../app/api/playlist/route.ts")
  reorder = require("../app/api/playlist/reorder/route.ts")
  legacy = require("../app/api/remove-song/route.ts")
  pdf = require("../app/api/playlist/[id]/pdf/route.ts")
  server = require("../lib/playlists/server.ts")
  page = require("../app/plejliste/[id]/page.tsx")
} finally { Module._load = original }
const validation = require("../lib/playlists/validation.ts")
const { playlistRequest, playlistPdfSongs, readPlaylistChoices } = require("../lib/playlists/client.ts")
const req = (data, method = "POST", headers = {}) => new Request("https://site.test/api/playlist", { method, headers: { "content-type": "application/json", origin: "https://site.test", ...headers }, body: JSON.stringify(data) })
const context = id => ({ params: Promise.resolve({ id }) })
const order = [{ id: "i-b", order: 0 }, { id: "i-a", order: 1 }]
const expectedOrder = () => state.items.filter(item => item.playlistId === "p").map(({ id, order }) => ({ id, order }))
const mutators = [() => route.PATCH(req({ playlistId: "p", isPublic: true }, "PATCH")), () => route.PUT(req({ playlistId: "p", songId: "c" }, "PUT")), () => route.DELETE(req({ playlistId: "p", songId: "a" }, "DELETE")), () => route.DELETE(req({ playlistId: "p" }, "DELETE")), () => reorder.POST(req({ playlistId: "p", items: order, expectedOrder: expectedOrder() })), () => reorder.PATCH(req({ playlistId: "p", songId: "a", direction: "down" }, "PATCH")), () => legacy.POST(req({ playlistSongId: "i-a" }))]
beforeEach(() => {
  state = { users: [{ id: "one", role: "user", banned: false }, { id: "two", role: "admin", banned: false }], playlists: [{ id: "p", name: "Morski", userId: "one", isPublic: false, category: "domace" }, { id: "other", name: "Other", userId: "two", isPublic: true }], items: [{ id: "i-a", playlistId: "p", songId: "a", order: 0 }, { id: "i-b", playlistId: "p", songId: "b", order: 1 }, { id: "i-other", playlistId: "other", songId: "c", order: 0 }], songs: ["a", "b", "c"].map(id => ({ id, title: "Pesma " + id, slug: id, category: "domace", lyrics: "G       D\nStih pesme " + id, artist: { name: "Bend", slug: "bend" }, popularity: 0 })) }
  session = { user: { id: "one" } }; down = failDelete = cacheFailure = false; serialFailures = attempts = 0; pdfArgs = null
})
const nativeFetch = global.fetch
afterEach(() => { global.fetch = nativeFetch })

test("playlist validation rejects invalid names, boolean coercion, duplicate/injected reorder IDs", () => {
  assert.equal(validation.playlistName("  More  "), "More")
  assert.deepEqual(validation.playlistUpdate({ isPublic: false, userId: "two", isAdmin: true }), { isPublic: false })
  for (const value of [null, "", "x".repeat(121), "Bad\nName"]) assert.throws(() => validation.playlistName(value))
  for (const value of ["true", 1, null]) assert.throws(() => validation.playlistUpdate({ isPublic: value }))
  for (const value of [[{ id: "x", order: 1 }], [{ id: "x", order: 0 }, { id: "x", order: 1 }], [{ id: "../x", order: 0 }]]) assert.throws(() => validation.playlistReorder(value))
})
test("every mutation rejects anonymous, banned and deleted accounts without writes", async () => {
  for (const setup of [() => { session = null }, () => { session = { user: { id: "one" } }; state.users[0].banned = true }, () => { state.users = [] }]) {
    setup(); const before = structuredClone(state)
    for (const mutate of mutators) assert.ok([401, 403].includes((await mutate()).status))
    assert.deepEqual(state, before)
  }
})
test("non-owner including an admin cannot edit, reorder, remove or delete another user's playlist", async () => {
  session = { user: { id: "two", role: "admin" } }; state.playlists[0].isPublic = true
  const before = structuredClone(state)
  for (const mutate of mutators) assert.equal((await mutate()).status, 404)
  assert.deepEqual(state, before)
})
test("cross-origin, malformed, non-object and oversized mutations fail closed", async () => {
  assert.equal((await route.PATCH(req({ playlistId: "p", isPublic: true }, "PATCH", { origin: "https://evil.test" }))).status, 403)
  for (const value of [null, [], "wrong"]) assert.equal((await route.POST(req(value))).status, 400)
  assert.equal((await route.POST(req({ name: "x" }, "POST", { "content-type": "text/plain" }))).status, 415)
  assert.equal((await route.POST(req({ name: "x".repeat(200001) }))).status, 413)
  assert.equal((await route.POST(new Request("https://site.test/api/playlist", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status, 400)
})
test("new playlists are private and creating with an invalid song never leaves an empty orphan", async () => {
  const response = await route.POST(req({ name: " Novi book ", category: "Zabavne", songId: "c", userId: "two", isPublic: true }))
  assert.equal(response.status, 200); const row = await response.json()
  assert.equal(row.userId, "one"); assert.equal(row.isPublic, false); assert.equal(row.category, "domace"); assert.equal(row.name, "Novi book")
  assert.ok(state.items.some(item => item.playlistId === row.id && item.songId === "c"))
  const before = structuredClone(state)
  assert.equal((await route.POST(req({ name: "Missing", songId: "gone" }))).status, 404); assert.deepEqual(state, before)
})
test("only the owner can persist public/private and rename; no injected fields are stored", async () => {
  const response = await route.PATCH(req({ playlistId: "p", isPublic: true, name: "More", userId: "two", isAdmin: true }, "PATCH"))
  assert.equal(response.status, 200); assert.equal(state.playlists[0].isPublic, true); assert.equal(state.playlists[0].userId, "one"); assert.equal(state.playlists[0].isAdmin, undefined)
  assert.equal((await route.PATCH(req({ playlistId: "p", isPublic: false }, "PATCH"))).status, 200); assert.equal(state.playlists[0].isPublic, false)
})
test("private playlists and their lyrics cannot be read/exported by anonymous or other users", async () => {
  for (const id of [null, "two"]) {
    session = id ? { user: { id } } : null
    assert.equal(await server.playlistViewerId(), id)
    const response = await pdf.POST(req({ songIds: ["a", "b"] }), context("p"))
    assert.equal(response.status, 404); assert.equal((await response.json()).songs, undefined)
    assert.equal(await tx.playlist.findFirst({ where: server.readablePlaylistWhere("p", id) }), null)
  }
})
test("public playlists export for visitors, but becoming private immediately revokes further exports", async () => {
  state.playlists[0].isPublic = true; session = null
  assert.equal((await pdf.POST(req({ songIds: ["a", "b"] }), context("p"))).status, 200)
  session = { user: { id: "one" } }; await route.PATCH(req({ playlistId: "p", isPublic: false }, "PATCH"))
  session = null; assert.equal((await pdf.POST(req({ songIds: ["a", "b"] }), context("p"))).status, 404)
})
test("PDF contains all canonical songs in persisted order, ignoring forged lyrics and favorites", async () => {
  state.items[0].order = 1; state.items[1].order = 0
  const response = await pdf.POST(req({ songIds: ["b", "a"], lyrics: "forged", userId: "two" }), context("p"))
  assert.equal(response.status, 200); const data = await response.json()
  assert.equal(data.name, "Morski"); assert.deepEqual(data.songs.map(song => song.id), ["b", "a"]); assert.equal(data.songs[0].lyrics, state.songs[1].lyrics); assert.equal(data.songs[0].transpose, 0)
  assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.equal(response.headers.get("vary"), "Cookie")
  assert.equal(pdfArgs.select.songs.take, 101)
})
test("null/tied order has deterministic ID fallback and stale PDF selection never silently omits songs", async () => {
  state.items[0].order = state.items[1].order = null
  assert.equal((await pdf.POST(req({ songIds: ["a", "b"] }), context("p"))).status, 200)
  for (const ids of [["a"], ["b", "a"], ["a", "a"]]) assert.equal((await pdf.POST(req({ songIds: ids }), context("p"))).status, 409)
})
test("empty/oversized PDF playlists and lyrics fail without partial files", async () => {
  assert.equal((await pdf.POST(req({ songIds: [] }), context("p"))).status, 400)
  state.songs[0].lyrics = ""
  assert.equal((await pdf.POST(req({ songIds: ["a", "b"] }), context("p"))).status, 413)
  assert.equal((await pdf.POST(req({ songIds: Array(101).fill("a") }), context("p"))).status, 400)
})
test("owner reorder is atomic and rejects foreign, missing and duplicate rows", async () => {
  assert.equal((await reorder.POST(req({ playlistId: "p", items: order, expectedOrder: expectedOrder() }))).status, 200)
  assert.equal(state.items[0].order, 1); assert.equal(state.items[1].order, 0)
  const before = structuredClone(state)
  for (const items of [[{ id: "i-other", order: 0 }, { id: "i-a", order: 1 }], [{ id: "i-a", order: 0 }], [{ id: "i-a", order: 0 }, { id: "i-a", order: 1 }]]) assert.ok([400, 409].includes((await reorder.POST(req({ playlistId: "p", items, expectedOrder: expectedOrder() }))).status))
  assert.deepEqual(state, before)
})
test("legacy up/down reorder normalizes null/tied positions and preserves other playlists", async () => {
  state.items[0].order = state.items[1].order = null
  assert.equal((await reorder.PATCH(req({ playlistId: "p", songId: "a", direction: "down" }, "PATCH"))).status, 200)
  assert.equal(state.items[0].order, 1); assert.equal(state.items[1].order, 0); assert.equal(state.items[2].order, 0)
})

test("stale reorder from another tab is rejected even when the song membership is unchanged", async () => {
  const snapshot = expectedOrder()
  assert.equal((await reorder.POST(req({ playlistId: "p", items: order, expectedOrder: snapshot }))).status, 200)
  const saved = structuredClone(state)
  assert.equal((await reorder.POST(req({ playlistId: "p", items: [{ id: "i-a", order: 0 }, { id: "i-b", order: 1 }], expectedOrder: snapshot }))).status, 409)
  assert.deepEqual(state, saved)
  assert.equal((await reorder.POST(req({ playlistId: "p", items: order }))).status, 409)
})

test("reorder accepts the exact legacy null/tied snapshot and permits another reorder after saving", async () => {
  state.items[0].order = state.items[1].order = null
  assert.equal((await reorder.POST(req({ playlistId: "p", items: order, expectedOrder: expectedOrder() }))).status, 200)
  assert.equal((await reorder.POST(req({ playlistId: "p", items: [{ id: "i-a", order: 0 }, { id: "i-b", order: 1 }], expectedOrder: expectedOrder() }))).status, 200)
  assert.throws(() => validation.playlistExpectedOrder([{ id: "x", order: -1 }]))
  assert.throws(() => validation.playlistExpectedOrder([{ id: "x", order: null }, { id: "x", order: 0 }]))
})
test("add and remove operate only on the selected playlist; duplicate add is not success", async () => {
  assert.equal((await route.PUT(req({ playlistId: "p", songId: "c" }, "PUT"))).status, 200)
  assert.equal((await route.PUT(req({ playlistId: "p", songId: "c" }, "PUT"))).status, 409)
  assert.equal((await route.DELETE(req({ playlistId: "p", songId: "c" }, "DELETE"))).status, 200)
  assert.ok(state.items.some(item => item.playlistId === "other" && item.songId === "c"))
  assert.equal(state.songs.length, 3)
})
test("whole playlist deletion rolls back all links on failure, never deletes actual songs", async () => {
  failDelete = true; const before = structuredClone(state)
  assert.equal((await route.DELETE(req({ playlistId: "p" }, "DELETE"))).status, 503); assert.deepEqual(state, before)
  failDelete = false; assert.equal((await route.DELETE(req({ playlistId: "p" }, "DELETE"))).status, 200)
  assert.equal(state.songs.length, 3); assert.equal(state.playlists.length, 1); assert.equal(state.items.length, 1)
})
test("GET returns only own playlists and is read-only, including when none exist", async () => {
  const before = structuredClone(state)
  const response = await route.GET(), data = await response.json()
  assert.equal(response.status, 200); assert.ok(data.every(row => row.userId === "one"))
  assert.deepEqual(state, before)
  state.playlists = state.playlists.filter(row => row.userId !== "one")
  assert.deepEqual(await (await route.GET()).json(), [])
  assert.equal(state.playlists.length, 1)
})
test("serial conflicts retry at most twice and cache failure cannot misreport a committed visibility change", async () => {
  serialFailures = 2; cacheFailure = true
  assert.equal((await route.PATCH(req({ playlistId: "p", isPublic: true }, "PATCH"))).status, 200); assert.equal(attempts, 3); assert.equal(state.playlists[0].isPublic, true)
  serialFailures = 3; assert.equal((await route.PATCH(req({ playlistId: "p", isPublic: false }, "PATCH"))).status, 503); assert.equal(state.playlists[0].isPublic, true)
})
test("database failure never leaks URLs or succeeds with an empty playlist", async () => {
  down = true
  const response = await pdf.POST(req({ songIds: ["a", "b"] }), context("p"))
  assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(await response.json()), /secret|postgres/)
})
test("banned/deleted viewers cannot use their old session to export a private playlist", async () => {
  state.users[0].banned = true
  assert.equal((await pdf.POST(req({ songIds: ["a", "b"] }), context("p"))).status, 404)
  state.users = []; assert.equal(await server.playlistViewerId(), null)
})
test("server-rendered playlist page uses the same access rules, ordered metadata and owner-only controls", async () => {
  const owner = await page.default(context("p"))
  assert.equal(owner.props.canEdit, true); assert.equal(owner.props.initialPublic, false)
  assert.deepEqual(owner.props.initialSongs.map(item => item.songId), ["a", "b"])
  assert.equal(owner.props.initialSongs[0].song.lyrics, undefined)
  for (const id of [null, "two"]) {
    session = id ? { user: { id } } : null
    await assert.rejects(page.default(context("p")), /NEXT_NOT_FOUND/)
  }
  state.playlists[0].isPublic = true; session = null
  const visitor = await page.default(context("p"))
  assert.equal(visitor.props.canEdit, false); assert.equal(visitor.props.initialPublic, true)
})
test("personal playlist pages are noindex without changing generated playlist metadata", async () => {
  assert.deepEqual(await page.generateMetadata(context("p")), { robots: { index: false, follow: false } })
  assert.deepEqual(await page.generateMetadata(context("4-akorda")), {})
})
test("client rejects HTML, errors, reordered/incomplete PDF contents and validates successful operations", async () => {
  global.fetch = async () => new Response("<html>Error</html>", { status: 500 })
  await assert.rejects(playlistRequest("/api/playlist", "PATCH", {}))
  global.fetch = async () => new Response(JSON.stringify({ error: "Denied" }), { status: 403 })
  await assert.rejects(playlistPdfSongs("p", ["a", "b"]), /Denied/)
  global.fetch = async () => new Response(JSON.stringify({ name: "Book", songs: [{ id: "b", title: "B", artist: "Bend", lyrics: "G\nText", transpose: 0 }] }))
  await assert.rejects(playlistPdfSongs("p", ["a"]), /Spisak/)
  global.fetch = async (url, options) => { assert.equal(options.method, "PATCH"); return new Response(JSON.stringify({ ok: true })) }
  assert.deepEqual(await playlistRequest("/api/playlist", "PATCH", {}), { ok: true })
})

test("playlist picker validates fresh responses and treats an empty list as a valid empty state", async () => {
  global.fetch = async (_, options) => { assert.equal(options.method, "GET"); assert.equal(options.body, undefined); return new Response("[]") }
  assert.deepEqual(await readPlaylistChoices(), [])
  for (const data of [{ error: "bad" }, [null], [{ id: "p", name: "P", isPublic: false, songs: [null] }]]) {
    global.fetch = async () => new Response(JSON.stringify(data))
    await assert.rejects(readPlaylistChoices(), /Spisak/)
  }
})
