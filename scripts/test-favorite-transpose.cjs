/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use isolated database/session fixtures. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, beforeEach, afterEach } = require("node:test")
const assert = require("node:assert/strict"), Module = require("node:module"), path = require("node:path")
let state, session, down, failPopularity, revoked, conflicts, attempts
const tx = {
  favoritePlaylist: { findUnique: async () => null },
  user: { findUnique: async ({ where }) => { if (down) throw Error("postgres://private"); return state.users.find(user => user.id === where.id) ?? null } },
  favorite: {
    findUnique: async ({ where }) => { if (down) throw Error("private"); const key = where.userId_songId; const row = state.favorites.find(row => key ? row.userId === key.userId && row.songId === key.songId : row.id === where.id); return row ? { id: row.id, transpose: row.transpose } : null },
    create: async ({ data }) => { const row = { ...data, id: "new-favorite" }; state.favorites.push(row); return { id: row.id, transpose: row.transpose } },
    delete: async ({ where }) => { state.favorites = state.favorites.filter(row => where.userId_songId ? !(row.userId === where.userId_songId.userId && row.songId === where.userId_songId.songId) : row.id !== where.id) },
    updateMany: async ({ where, data }) => {
      if (down) throw Error("private")
      if (revoked) state.users[0].banned = true
      const user = state.users.find(row => row.id === where.userId)
      const row = state.favorites.find(row => row.id === where.id && row.userId === where.userId && row.songId === where.songId && row.transpose === where.transpose)
      if (!user || user.banned || !row) return { count: 0 }
      Object.assign(row, data); return { count: 1 }
    },
  },
  song: {
    findUnique: async ({ where }) => state.songs.find(row => row.id === where.id) ?? null,
    update: async ({ where }) => { if (failPopularity) throw Error("private-popularity"); state.songs.find(row => row.id === where.id).popularity++ },
  },
}
const { Prisma } = require("@prisma/client")
const prisma = { ...tx, $transaction: async (work, options) => {
  assert.equal(options.isolationLevel, "Serializable"); attempts++
  if (conflicts-- > 0) throw new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "test" })
  const before = structuredClone(state)
  try { return await work(tx) } catch (cause) { state = before; throw cause }
} }
const original = Module._load
Module._load = function(request, parent, main) {
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "@/lib/prisma") return { prisma }
  if (request === "next/cache") return { revalidatePath() {} }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, main)
}
let route, check
try { route = require("../app/api/favorite/route.ts"); check = require("../app/api/favorite/check/route.ts") }
finally { Module._load = original }
const model = require("../lib/favorites/model.ts"), client = require("../lib/favorites/client.ts")
const request = (body, method = "PATCH", headers = {}) => new Request("https://site.test/api/favorite", { method, headers: { origin: "https://site.test", "content-type": "application/json", ...headers }, body: JSON.stringify(body) })
const patch = (data = {}) => route.PATCH(request({ songId: "song", favoriteId: "fav-one", expectedTranspose: 3, transpose: 5, ...data }))
const read = () => check.GET(new Request("https://site.test/api/favorite/check?songId=song"))
const nativeFetch = global.fetch
beforeEach(() => {
  state = { users: [{ id: "one", banned: false }, { id: "two", banned: false }], favorites: [{ id: "fav-one", userId: "one", songId: "song", transpose: 3 }, { id: "fav-two", userId: "two", songId: "song", transpose: -2 }], songs: [{ id: "song", lyrics: "G    D\nOriginalni stih", chords: null, popularity: 10 }, { id: "new-song", lyrics: "Am G\nStih", popularity: 0 }], reviews: [{ songId: "song", status: "manually_corrected" }] }
  session = { user: { id: "one" } }; down = failPopularity = revoked = false; conflicts = attempts = 0
})
afterEach(() => { global.fetch = nativeFetch })

test("transpose validation rejects coercion, fractions and oversized values", () => {
  for (const value of [null, "3", NaN, Infinity, -12, 12, 1.5, undefined]) assert.throws(() => model.favoriteTranspose(value))
  for (const value of [-11, 0, 11]) assert.equal(model.favoriteTranspose(value), value)
  assert.equal(model.isFavoriteSetting({ id: "fav", transpose: 3 }), true)
  assert.equal(model.isFavoriteSetting({ id: "fav", transpose: "3" }), false)
})
test("only an explicit Favorites entry requests personal restoration; URLs never carry personal transpose", () => {
  const href = model.favoriteSongHref({ category: "strane", slug: "song #1", artist: { slug: "bend" } })
  assert.equal(href, "/pesme/strane/bend/song%20%231?from=favorites")
  assert.equal(model.isFavoriteView({ from: "favorites" }, null), true)
  for (const query of [{}, { from: ["favorites"] }, { from: "Favorites" }, { transpose: "5" }]) assert.equal(model.isFavoriteView(query, null), false)
  assert.equal(model.isFavoriteView({ from: "favorites" }, "/plejliste/p"), false)
})
test("unauthenticated, banned and deleted users cannot write favorites", async () => {
  for (const setup of [() => { session = null }, () => { session = { user: { id: "one" } }; state.users[0].banned = true }, () => { state.users = [] }]) {
    setup(); const before = structuredClone(state)
    for (const [method, body] of [["PATCH", { songId: "song", favoriteId: "fav-one", expectedTranspose: 3, transpose: 5 }], ["PUT", { songId: "new-song" }], ["POST", { songId: "song" }], ["DELETE", { songId: "song" }]]) assert.ok([401,403].includes((await route[method](request(body, method))).status))
    assert.deepEqual(state, before)
  }
})
test("favorite reads are private, fresh and scoped to the session user without logging identities", async () => {
  const response = await read()
  assert.deepEqual(await response.json(), { isFav: true, favorite: { id: "fav-one", transpose: 3 } })
  assert.equal(response.headers.get("cache-control"), "private, no-store")
  assert.equal(response.headers.get("vary"), "Cookie")
  session = { user: { id: "two" } }; assert.equal((await (await read()).json()).favorite.transpose, -2)
  session = null; assert.deepEqual(await (await read()).json(), { isFav: false, favorite: null })
})
test("saving changes only this user's favorite, never original lyrics, chords, reviews or another user's key", async () => {
  const songs = structuredClone(state.songs), reviews = structuredClone(state.reviews)
  assert.equal((await patch({ userId: "two", lyrics: "forged" })).status, 200)
  assert.equal(state.favorites[0].transpose, 5); assert.equal(state.favorites[1].transpose, -2)
  assert.deepEqual(state.songs, songs); assert.deepEqual(state.reviews, reviews)
  assert.equal((await patch({ favoriteId: "fav-two" })).status, 409)
})
test("stale tabs and removed/recreated favorites cannot overwrite a newer saved key", async () => {
  assert.equal((await patch()).status, 200)
  assert.equal((await patch({ transpose: 2 })).status, 409)
  assert.equal(state.favorites[0].transpose, 5)
  state.favorites[0].id = "recreated"
  assert.equal((await patch({ expectedTranspose: 5 })).status, 409)
  state.favorites = state.favorites.filter(row => row.userId !== "one")
  assert.equal((await patch()).status, 404)
})
test("zero is an explicit saved reset, but reading a direct page never resets a favorite", async () => {
  await read(); assert.equal(state.favorites[0].transpose, 3)
  assert.equal((await patch({ transpose: 0 })).status, 200)
  assert.equal(state.favorites[0].transpose, 0)
})
test("idempotent add keeps an existing saved key; new favorites remember the displayed key atomically", async () => {
  assert.equal((await route.PUT(request({ songId: "song", transpose: 9 }, "PUT"))).status, 200)
  assert.equal(state.favorites[0].transpose, 3); assert.equal(state.songs[0].popularity, 10)
  const response = await route.PUT(request({ songId: "new-song", transpose: -3, userId: "two" }, "PUT"))
  assert.equal(response.status, 200); assert.equal((await response.json()).favorite.transpose, -3)
  assert.equal(state.favorites.find(row => row.songId === "new-song").userId, "one")
  assert.equal(state.songs[1].popularity, 1)
})
test("add failure rolls back the favorite; deletion is guarded and does not remove the song", async () => {
  failPopularity = true
  assert.equal((await route.PUT(request({ songId: "new-song", transpose: 2 }, "PUT"))).status, 503)
  assert.equal(state.favorites.length, 2)
  assert.equal((await route.DELETE(request({ songId: "song", favoriteId: "stale" }, "DELETE"))).status, 409)
  assert.equal((await route.DELETE(request({ songId: "song", favoriteId: "fav-one" }, "DELETE"))).status, 200)
  assert.equal(state.favorites.length, 1); assert.equal(state.songs.length, 2)
  assert.equal((await route.DELETE(request({ songId: "song", favoriteId: "fav-one" }, "DELETE"))).status, 200)
})
test("cross-site, malformed, oversized and invalid requests fail without changing the saved key", async () => {
  assert.equal((await route.PATCH(request({ songId: "song" }, "PATCH", { origin: "https://evil.test" }))).status, 403)
  assert.equal((await route.PUT(request({ songId: "song" }, "PUT", { "content-type": "text/plain" }))).status, 415)
  assert.equal((await route.POST(new Request("https://site.test/api/favorite", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status, 400)
  for (const value of [-12, "3", null, 1.5]) assert.equal((await patch({ transpose: value })).status, 400)
  assert.equal((await route.PUT(request({ songId: "new-song", transpose: null }, "PUT"))).status, 400)
  assert.equal((await route.PUT(request({ songId: "x".repeat(200001) }, "PUT"))).status, 413)
  assert.equal(state.favorites[0].transpose, 3)
})
test("revoked rights and database failures never look saved or leak secrets", async () => {
  revoked = true; assert.notEqual((await patch()).status, 200); assert.equal(state.favorites[0].transpose, 3)
  down = true; const response = await read(); assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(await response.json()), /private|postgres/)
})
test("bounded retries preserve the legacy toggle without silently making duplicate favorites", async () => {
  conflicts = 2
  assert.equal((await route.POST(request({ songId: "song" }, "POST"))).status, 200)
  assert.equal(attempts, 3); assert.equal(state.favorites.some(row => row.userId === "one" && row.songId === "song"), false)
})
test("client rejects fake successes and preserves status codes for conflicts; GET carries no personal key", async () => {
  for (const data of [{}, { isFav: true, favorite: null }, { isFav: true, favorite: { id: "f", transpose: 12 } }]) {
    global.fetch = async () => new Response(JSON.stringify(data))
    await assert.rejects(client.favoriteRequest("PATCH", {}))
  }
  global.fetch = async () => new Response(JSON.stringify({ error: "Conflict" }), { status: 409 })
  await assert.rejects(client.favoriteRequest("PATCH", {}), cause => cause.status === 409)
  global.fetch = async (url, options) => { assert.equal(url, "/api/favorite/check?songId=song"); assert.equal(options.body, undefined); assert.equal(options.cache, "no-store"); return new Response(JSON.stringify({ isFav: false, favorite: null })) }
  assert.deepEqual(await client.favoriteRequest("GET", "song"), { isFav: false, favorite: null })
})
