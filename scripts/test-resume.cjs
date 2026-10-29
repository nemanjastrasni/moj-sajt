/* eslint-disable @typescript-eslint/no-require-imports -- Read-only API and browser-storage fixtures. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, beforeEach, afterEach } = require("node:test")
const assert = require("node:assert/strict"), Module = require("node:module"), path = require("node:path")
const recent = require("../lib/performance/recent.ts")
let state, session, down, reads
const prisma = {
  user: { findUnique: async ({ where }) => { if (down) throw Error("secret-database-url"); return state.users.find(user => user.id === where.id) ?? null } },
  song: { findUnique: async args => { reads.push(args); return state.songs.find(song => song.id === args.where.id) ?? null } },
  playlistSong: { findFirst: async args => {
    reads.push(args)
    const { where } = args, playlist = state.playlists.find(list => list.id === where.playlistId)
    assert.equal(where.playlist.id, where.playlistId)
    if (!playlist || !where.playlist.OR.some(rule => rule.isPublic === true && playlist.isPublic || rule.userId && rule.userId === playlist.userId)) return null
    const link = state.links.find(link => link.playlistId === where.playlistId && link.songId === where.songId)
    const song = link && state.songs.find(song => song.id === link.songId)
    return song ? { playlist: { name: playlist.name }, song: { title: song.title, artist: { name: song.artist.name } } } : null
  } },
}
const load = Module._load
Module._load = function(request, parent, main) {
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "@/lib/prisma") return { prisma }
  if (request === "next/cache") return { revalidatePath() {} }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return load.call(this, request, parent, main)
}
let route
try { route = require("../app/api/performance/resume/route.ts") } finally { Module._load = load }
const get = (query = "kind=playlist&playlistId=list&songId=song") => route.GET(new Request("https://site.test/api/performance/resume?" + query))
let storage
beforeEach(() => {
  state = { users: [{ id: "owner", role: "user", banned: false }, { id: "other", role: "user", banned: false }], playlists: [{ id: "list", userId: "owner", isPublic: false, name: "Morski" }], links: [{ playlistId: "list", songId: "song" }], songs: [{ id: "song", title: "Moja pesma", slug: "moja-pesma", category: "domace", artist: { name: "Probni bend", slug: "probni-bend", category: "domace" } }] }
  session = { user: { id: "owner" } }; down = false; reads = []; storage = new Map()
  global.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  global.window = new EventTarget()
})
afterEach(() => { delete global.localStorage; delete global.window })

test("recent playback is strictly validated, bounded, versioned and expires after 90 days", () => {
  const now = Date.now(), valid = { kind: "song", songId: "song", version: 1, at: now }
  assert.deepEqual(recent.parseRecentPlayback(JSON.stringify(valid), now), valid)
  for (const value of [{ ...valid, version: 2 }, { ...valid, at: now - 91 * 86400000 }, { ...valid, at: now + 3600000 }, { ...valid, at: "123" }, { ...valid, songId: "../bad" }, { ...valid, kind: "playlist" }, [], null]) assert.equal(recent.parseRecentPlayback(JSON.stringify(value), now), null)
  for (const raw of ["{", "x".repeat(1025), null]) assert.equal(recent.parseRecentPlayback(raw, now), null)
})
test("storage is isolated per account and stores only IDs and a timestamp", () => {
  recent.rememberPlayback("owner", { kind: "playlist", playlistId: "list", songId: "song", title: "private title", lyrics: "private lyrics" })
  const raw = recent.readRecentPlayback("owner")
  assert.ok(raw); assert.doesNotMatch(raw, /private|title|lyrics/)
  assert.equal(recent.readRecentPlayback("other"), null)
  assert.equal(recent.parseRecentPlayback(raw).playlistId, "list")
  recent.rememberPlayback("other", { kind: "song", songId: "second" })
  recent.forgetPlayback("owner"); assert.equal(recent.readRecentPlayback("owner"), null)
  assert.ok(recent.readRecentPlayback("other"))
})
test("blocked browser storage, invalid IDs and malformed writes are harmless", () => {
  recent.rememberPlayback("owner", { kind: "song", songId: "../escape" })
  recent.rememberPlayback("owner/bad", { kind: "song", songId: "song" })
  assert.equal(storage.size, 0)
  global.localStorage = { getItem() { throw Error("blocked") }, setItem() { throw Error("blocked") }, removeItem() { throw Error("blocked") } }
  assert.equal(recent.readRecentPlayback("owner"), null)
  assert.doesNotThrow(() => recent.rememberPlayback("owner", { kind: "song", songId: "song" }))
  assert.doesNotThrow(() => recent.forgetPlayback("owner"))
})
test("same-tab storage updates notify subscribers only after an explicit remembered session", () => {
  let calls = 0; window.addEventListener(recent.PLAYBACK_EVENT, () => calls++)
  recent.readRecentPlayback("owner"); assert.equal(calls, 0)
  recent.rememberPlayback("owner", { kind: "song", songId: "song" }); assert.equal(calls, 1)
  recent.forgetPlayback("owner"); assert.equal(calls, 2)
})
test("anonymous, banned, deleted and forged session roles cannot resolve private repertoire", async () => {
  for (const identity of [null, "missing"]) { session = identity ? { user: { id: identity, role: "admin" } } : null; assert.equal((await get()).status, identity ? 403 : 401) }
  session = { user: { id: "owner" } }; state.users[0].banned = true; assert.equal((await get()).status, 403)
  assert.equal(reads.length, 0)
})
test("a private playlist can only be resumed by its owner, with current metadata", async () => {
  session = { user: { id: "other", role: "admin" } }
  const forbidden = await get(); assert.equal(forbidden.status, 404); assert.doesNotMatch(JSON.stringify(await forbidden.json()), /Morski|Moja pesma/)
  session = { user: { id: "owner" } }
  state.playlists[0].name = "Preimenovana lista"
  const response = await get(), item = await response.json()
  assert.equal(response.status, 200); assert.equal(item.playlistName, "Preimenovana lista")
  assert.equal(item.href, "/plejliste/list/sviranje?song=song")
  assert.equal(recent.isResumeItem(item, { kind: "playlist", playlistId: "list", songId: "song" }), true)
  assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.equal(response.headers.get("vary"), "Cookie")
})
test("a public playlist remains readable to another signed-in user, never to an anonymous resume request", async () => {
  state.playlists[0].isPublic = true; session = { user: { id: "other" } }
  assert.equal((await get()).status, 200)
  session = null; assert.equal((await get()).status, 401)
})
test("deleted lists and removed songs yield no stale continuation link", async () => {
  state.links = []; assert.equal((await get()).status, 404)
  state.playlists = []; assert.equal((await get()).status, 404)
  state.songs = []; assert.equal((await get("kind=song&songId=song")).status, 404)
})
test("standalone resume uses canonical song location and explicitly opens performance with personal key restoration", async () => {
  const response = await get("kind=song&songId=song&href=https://evil.test")
  const item = await response.json()
  assert.equal(item.href, "/pesme/domace/probni-bend/moja-pesma?from=favorites&play=1")
  assert.equal(recent.isResumeItem(item, { kind: "song", songId: "song" }), true)
  assert.equal(reads[0].select.lyrics, undefined); assert.equal(reads[0].select.artist.select.email, undefined)
  assert.doesNotMatch(JSON.stringify(item), /userId|owner|email|lyrics/)
})
test("invalid targets and service failures are explicit and never expose database details", async () => {
  for (const query of ["kind=other&songId=song", "kind=playlist&songId=song", "kind=song&songId=..%2Fbad"]) assert.equal((await get(query)).status, 400)
  down = true; const response = await get(); assert.equal(response.status, 503)
  assert.doesNotMatch(JSON.stringify(await response.json()), /secret-database/)
  assert.equal(response.headers.get("cache-control"), "private, no-store")
})
test("client identity and internal destination validation rejects forged continuations", () => {
  const target = { kind: "song", songId: "song" }, item = { ...target, title: "Title", artist: "Artist", href: "/pesme/domace/bend/song?from=favorites&play=1" }
  assert.equal(recent.isResumeItem(item, target), true)
  for (const patch of [{ songId: "other" }, { kind: "playlist", playlistId: "list" }, { title: "" }, { artist: null }, { href: "https://evil.test" }, { href: "//evil.test/path" }, { href: "/pesme/one/two/three?from=favorites&play=1#bad" }, { href: "javascript:alert(1)" }]) assert.equal(recent.isResumeItem({ ...item, ...patch }, target), false)
  const playlist = { kind: "playlist", playlistId: "list", songId: "song" }
  assert.equal(recent.isResumeItem({ ...playlist, title: "Title", artist: "Artist", playlistName: "List", href: "/plejliste/other/sviranje?song=song" }, playlist), false)
})
