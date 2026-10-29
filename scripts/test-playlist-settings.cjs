/* eslint-disable @typescript-eslint/no-require-imports -- Isolated transaction/session fixtures. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, beforeEach, afterEach } = require("node:test"), assert = require("node:assert/strict"), Module = require("node:module"), path = require("node:path")
const { Prisma } = require("@prisma/client")
const model = require("../lib/playlists/settings.ts"), { playingRequest } = require("../lib/playlists/settingsClient.ts")
let state, session, down, failSetting, revoke, serialFailures, attempts
function readable(list, where) { return Boolean(list && (where.OR ? where.OR.some(rule => rule.isPublic === true && list.isPublic || rule.userId && rule.userId === list.userId) : !where.userId || where.userId === list.userId)) }
function expanded(row) {
  return row ? { ...row, song: state.songs.find(song => song.id === row.songId), playlist: state.playlists.find(list => list.id === row.playlistId), setting: state.settings.find(setting => setting.playlistSongId === row.id) || null } : null
}
const tx = {
  user: { findUnique: async ({ where }) => { if (down) throw Error("secret-database"); return state.users.find(user => user.id === where.id) || null } },
  song: { findUnique: async ({ where }) => state.songs.find(song => song.id === where.id) || null, update: async ({ where }) => { state.songs.find(song => song.id === where.id).popularity++; return {} } },
  playlist: {
    findFirst: async ({ where }) => { const list = state.playlists.find(list => list.id === where.id); return readable(list, where) ? { ...list, songs: state.entries.filter(row => row.playlistId === list.id).sort((a,b) => a.order-b.order).map(expanded) } : null },
    create: async ({ data }) => {
      const list = { id: "new-list", name: data.name, userId: data.userId, isPublic: false }; state.playlists.push(list)
      if (data.songs?.create) { const input = data.songs.create; const row = await tx.playlistSong.create({ data: { playlistId: list.id, songId: input.songId, order: 0 } }); if (input.setting) await tx.playlistSongSetting.create({ data: { playlistSongId: row.id, ...input.setting.create } }) }
      return list
    },
  },
  playlistSong: {
    findFirst: async ({ where, select }) => {
      let rows = state.entries.filter(row => (!where.playlistId || row.playlistId === where.playlistId) && (!where.songId || row.songId === where.songId) && (!where.playlist || readable(state.playlists.find(list => list.id === row.playlistId), where.playlist)))
      if (where.order) rows = rows.filter(row => row.order !== null).sort((a,b) => b.order-a.order)
      if (select?.order) return rows.length ? { order: rows[0].order } : null
      return expanded(rows[0])
    },
    create: async ({ data }) => { if (state.entries.some(row => row.playlistId === data.playlistId && row.songId === data.songId)) throw new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }); const row = { id: "entry-" + state.entries.length, ...data }; state.entries.push(row); return row },
  },
  playlistSongSetting: {
    create: async ({ data }) => { if (failSetting) throw Error("secret-setting-error"); if (state.settings.some(row => row.playlistSongId === data.playlistSongId)) throw new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" }); const row = { version: 1, updatedAt: new Date(), ...data }; state.settings.push(row); return row },
    updateMany: async ({ where, data }) => { if (failSetting) throw Error("secret-setting-error"); const row = state.settings.find(row => row.playlistSongId === where.playlistSongId && row.userId === where.userId && row.version === where.version); if (!row) return { count: 0 }; Object.assign(row, data); return { count: 1 } },
  },
}
const prisma = { ...tx, $transaction: async (work, options) => {
  assert.equal(options.isolationLevel, "Serializable"); attempts++
  if (serialFailures-- > 0) throw new Prisma.PrismaClientKnownRequestError("retry", { code: "P2034", clientVersion: "test" })
  const before = structuredClone(state)
  if (revoke) state.users[0].banned = true
  try { return await work(tx) } catch (error) { state = before; throw error }
} }
const nativeLoad = Module._load
Module._load = function(request, parent, main) {
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "@/lib/prisma") return { prisma }
  if (request === "next/cache") return { revalidatePath() {}, revalidateTag() {} }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return nativeLoad.call(this, request, parent, main)
}
let route, playlistRoute, pdfRoute
try { route = require("../app/api/playlist/[id]/songs/[songId]/settings/route.ts"); playlistRoute = require("../app/api/playlist/route.ts"); pdfRoute = require("../app/api/playlist/[id]/pdf/route.ts") } finally { Module._load = nativeLoad }
const context = (id = "list", songId = "song") => ({ params: Promise.resolve({ id, songId }) })
const request = (data, method = "PATCH", headers = {}) => new Request("https://site.test/api/playlist/list/songs/song/settings", { method, headers: { "content-type": "application/json", origin: "https://site.test", ...headers }, body: JSON.stringify(data) })
const input = (extra = {}) => ({ entryId: "entry", version: 0, transpose: -2, capo: 5, ...extra })
const get = (id, songId) => route.GET(new Request("https://site.test/api/playlist/list/songs/song/settings"), context(id,songId))
const patch = (data = input(), ctx = context()) => route.PATCH(request(data),ctx)
const nativeFetch = global.fetch
beforeEach(() => {
  state = { users: [{ id: "owner", banned: false }, { id: "other", banned: false }], playlists: [{ id: "list", userId: "owner", name: "Morski", isPublic: false }, { id: "second-list", userId: "owner", name: "Druga", isPublic: false }], entries: [{ id: "entry", playlistId: "list", songId: "song", order: 0 }, { id: "other-entry", playlistId: "second-list", songId: "song", order: 0 }], settings: [], songs: [{ id: "song", title: "Pesma", lyrics: "F#m D A E\nProbni stih.", artist: { name: "Bend" }, popularity: 0 }, { id: "new-song", title: "Nova", lyrics: "Am G C F\nNovi stih.", artist: { name: "Bend" }, popularity: 0 }], favorites: [{ userId: "owner", songId: "song", transpose: 7 }] }
  session = { user: { id: "owner" } }; down = failSetting = revoke = false; serialFailures = attempts = 0
})
afterEach(() => { global.fetch = nativeFetch })

test("only bounded integer keys, nullable source capo and valid versions are accepted", () => {
  assert.deepEqual(model.playingValues({ transpose: -11, capo: 12, role: "admin" }), { transpose: -11, capo: 12 })
  assert.deepEqual(model.playingValues({ transpose: 0, capo: null }), { transpose: 0, capo: null })
  for (const values of [{ transpose: "2", capo: 2 }, { transpose: 12, capo: 2 }, { transpose: 0, capo: -1 }, { transpose: 0, capo: 13 }, { transpose: .5, capo: 1 }, { transpose: 0 }]) assert.throws(() => model.playingValues(values))
  for (const values of [{ version: -1 }, { version: "0" }, { version: 2147483647 }, { entryId: "../entry" }]) assert.throws(() => model.playingUpdate(input(values)))
})
test("new rows default to original key/source capo, without inheriting favorites", async () => {
  const response = await get(), data = await response.json()
  assert.equal(response.status, 200); assert.deepEqual(data.setting, { entryId: "entry", version: 0, transpose: 0, capo: null }); assert.equal(data.editable, true)
  assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.equal(response.headers.get("vary"), "Cookie")
  assert.equal(state.settings.length, 0); assert.equal(state.favorites[0].transpose, 7)
})
test("owner saves and restores both values; originals, favorites and another list are untouched", async () => {
  const beforeSongs = structuredClone(state.songs), beforeFavorites = structuredClone(state.favorites)
  const response = await patch(), data = await response.json(); assert.equal(response.status, 200)
  assert.deepEqual(data.setting, { entryId: "entry", version: 1, transpose: -2, capo: 5 })
  assert.deepEqual((await (await get()).json()).setting, data.setting)
  assert.deepEqual((await (await get("second-list")).json()).setting, { entryId: "other-entry", version: 0, transpose: 0, capo: null })
  assert.deepEqual(state.songs, beforeSongs); assert.deepEqual(state.favorites, beforeFavorites)
})
test("capo zero is distinct from reset-to-source null", async () => {
  assert.equal((await patch(input({ capo: 0 }))).status, 200)
  assert.equal(state.settings[0].capo, 0)
  assert.equal((await patch(input({ version: 1, capo: null }))).status, 200)
  assert.equal(state.settings[0].capo, null); assert.equal(state.settings[0].version, 2)
})
test("stale versions and removed/re-added entries never overwrite another save", async () => {
  assert.equal((await patch()).status, 200)
  assert.equal((await patch(input({ transpose: 4 }))).status, 409); assert.equal(state.settings[0].transpose, -2)
  state.entries[0].id = "replacement"; state.settings = []
  assert.equal((await patch()).status, 409); assert.equal(state.settings.length, 0)
})
test("private playlists reject outsiders; public readers get only local default values and cannot write", async () => {
  await patch(); session = { user: { id: "other", role: "admin" } }
  assert.equal((await get()).status, 404); assert.equal((await patch()).status, 404)
  state.playlists[0].isPublic = true
  const data = await (await get()).json(); assert.equal(data.editable, false); assert.equal(data.setting.transpose, 0); assert.equal(data.setting.capo, null); assert.equal(data.setting.version, 0)
  assert.doesNotMatch(JSON.stringify(data), /owner|userId/); assert.equal((await patch()).status, 404)
  session = null; assert.equal((await patch()).status, 401); assert.equal((await get()).status, 200)
})
test("a changed parent owner cannot read or overwrite another account's pinned settings", async () => {
  await patch(); state.playlists[0].userId = "other"; session = { user: { id: "other" } }
  assert.equal((await get()).status, 403); assert.equal((await patch(input({ version: 1 }))).status, 403)
  assert.equal(state.settings[0].userId, "owner")
})
test("banned/deleted users and revocation after the outer authentication check cannot save", async () => {
  for (const id of ["missing", "other"]) { session = { user: { id } }; assert.ok([403,404].includes((await patch()).status)) }
  session = { user: { id: "owner" } }; state.users[0].banned = true; assert.equal((await patch()).status, 403)
  state.users[0].banned = false; revoke = true; assert.equal((await patch()).status, 403)
  assert.equal(state.settings.length, 0)
})
test("cross-origin, malformed, oversized and non-JSON writes are rejected", async () => {
  assert.equal((await route.PATCH(request(input(), "PATCH", { origin: "https://evil.test" }),context())).status, 403)
  assert.equal((await route.PATCH(request(input(), "PATCH", { "content-type": "text/plain" }),context())).status, 415)
  assert.equal((await patch(input({ extra: "x".repeat(200001) }))).status, 413)
  assert.equal(state.settings.length, 0)
})
test("unclear source capo blocks converted saves but permits original-source settings", async () => {
  state.songs[0].lyrics = "Capo 2 ili 3\nAm G C F\nStih"
  assert.equal((await patch()).status, 422)
  assert.equal((await patch(input({ capo: null }))).status, 200)
})
test("transient serialization failures retry, while DB errors never claim saved", async () => {
  serialFailures = 2; assert.equal((await patch()).status, 200); assert.equal(attempts, 3)
  failSetting = true
  const response = await patch(input({ version: 1, transpose: 3 })); assert.equal(response.status, 503); assert.equal(state.settings[0].transpose, -2)
  assert.doesNotMatch(JSON.stringify(await response.json()), /secret/)
})
test("adding to an existing playlist captures chosen key and capo atomically", async () => {
  const response = await playlistRoute.PUT(request({ playlistId: "list", songId: "new-song", settings: { transpose: 3, capo: 2, userId: "forged" } }, "PUT"))
  assert.equal(response.status, 200); const entry = state.entries.find(row => row.playlistId === "list" && row.songId === "new-song")
  assert.deepEqual(state.settings.map(row => [row.playlistSongId, row.userId, row.transpose, row.capo]), [[entry.id, "owner", 3, 2]])
  failSetting = true
  const before = structuredClone(state)
  assert.equal((await playlistRoute.PUT(request({ playlistId: "second-list", songId: "new-song", settings: { transpose: 1, capo: 3 } }, "PUT"))).status, 503)
  assert.deepEqual(state, before)
})
test("new playlist with a first song captures settings; failed capture leaves no partial list", async () => {
  failSetting = true
  const before = structuredClone(state)
  assert.equal((await playlistRoute.POST(request({ name: "Nova lista", category: "mix", songId: "new-song", settings: { transpose: 2, capo: 4 } }, "POST"))).status, 503)
  assert.deepEqual(state, before)
  failSetting = false
  const response = await playlistRoute.POST(request({ name: "Nova lista", category: "mix", songId: "new-song", settings: { transpose: 2, capo: 4 } }, "POST"))
  assert.equal(response.status, 200); assert.equal(state.settings[0].capo, 4); assert.equal(state.settings[0].transpose, 2)
})
test("owner playlist PDFs contain saved arrangements; public PDFs do not expose them", async () => {
  await patch()
  const pdf = () => pdfRoute.POST(request({ songIds: ["song"] }, "POST"), context())
  const owned = await (await pdf()).json(); assert.equal(owned.songs[0].transpose, -2); assert.equal(owned.songs[0].capo, 5)
  state.playlists[0].isPublic = true; session = { user: { id: "other" } }
  const shared = await (await pdf()).json(); assert.equal(shared.songs[0].transpose, 0); assert.equal(shared.songs[0].capo, undefined)
  assert.doesNotMatch(JSON.stringify(shared), /userId|version|entryId/)
})
test("saved playlist values survive client validation and generate a real capo-aware PDF", async () => {
  const fs = require("node:fs"), { PDFDocument } = require("pdf-lib"), { generateSongbookPdf } = require("../lib/songbook/pdf.ts"), { playlistPdfSongs } = require("../lib/playlists/client.ts")
  await patch()
  const data = await (await pdfRoute.POST(request({ songIds: ["song"] }, "POST"), context())).json()
  global.fetch = async () => new Response(JSON.stringify(data))
  const validated = await playlistPdfSongs("list", ["song"])
  assert.equal(validated.songs[0].transpose, -2); assert.equal(validated.songs[0].capo, 5)
  const fonts = { regular: fs.readFileSync(path.join(__dirname,"../public/fonts/songbook/DejaVuSansMono.ttf")), bold: fs.readFileSync(path.join(__dirname,"../public/fonts/songbook/DejaVuSansMono-Bold.ttf")) }
  const result = await generateSongbookPdf(validated.songs, { title: validated.name, fontSize: 11, book: true, contents: true, locale: "sr" }, fonts)
  assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 3)
  const out = path.join(__dirname,"../reports/playlist-settings"); fs.mkdirSync(out,{recursive:true}); fs.writeFileSync(path.join(out,"qa-playlist.pdf"),result.bytes)
  global.fetch = async () => new Response(JSON.stringify({ ...data, songs: [{ ...data.songs[0], capo: 13 }] }))
  await assert.rejects(playlistPdfSongs("list", ["song"]))
})
test("client rejects mismatched identities, versions, values, HTML and partial acknowledgments", async () => {
  const snapshot = { playlistId: "list", songId: "song", editable: true, setting: { ...input(), version: 1 } }
  for (const data of [{ ...snapshot, playlistId: "other" }, { ...snapshot, editable: false }, { ...snapshot, setting: { ...snapshot.setting, version: 0 } }, { ...snapshot, setting: { ...snapshot.setting, capo: 6 } }, { ok: true }]) {
    global.fetch = async () => new Response(JSON.stringify(data))
    await assert.rejects(playingRequest("list", "song", input()))
  }
  global.fetch = async () => new Response("<html>Error</html>", { status: 500 }); await assert.rejects(playingRequest("list", "song"))
  global.fetch = async () => new Response(JSON.stringify(snapshot)); assert.deepEqual(await playingRequest("list", "song", input()), snapshot)
})
test("client deadlines explain uncertain save state and release the request", async () => {
  const timeout = global.setTimeout
  global.setTimeout = (callback, ms, ...args) => timeout(callback, ms === 15000 ? 1 : ms, ...args)
  global.fetch = (_url, { signal }) => new Promise((_resolve,reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }))
  try { await assert.rejects(playingRequest("list", "song", input()), /mozda jesu sacuvana/) } finally { global.setTimeout = timeout }
})
