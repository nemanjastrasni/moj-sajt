/* eslint-disable @typescript-eslint/no-require-imports -- Node tests use CommonJS module-loader stubs. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const Module = require("node:module")
const path = require("node:path")
const fs = require("node:fs")
const { Prisma } = require("@prisma/client")
const validation = require("../lib/adminContent/validation.ts")
const paths = require("../lib/adminContent/paths.ts")
let state, session, down, failSongs, serialFailures, attempts, cacheFailure, revokeBeforeTransaction
const prisma = {
  user: {
    findUnique: async ({ where }) => { if (down) throw Error("postgres://private-credentials"); return state.users.find(row => row.id === where.id) ?? null },
    update: async ({ where, data }) => { const row = Object.assign(state.users.find(row => row.id === where.id), data); return { id: row.id, role: row.role } },
  },
  artist: {
    findUnique: async ({ where }) => structuredClone(state.artists.find(row => row.id === where.id) ?? null),
    update: async ({ where, data }) => ({ ...Object.assign(state.artists.find(row => row.id === where.id), data) }),
    create: async ({ data }) => { const row = { id: "new-artist", bioShort: null, ...data }; state.artists.push(row); return row },
  },
  song: { updateMany: async ({ where, data }) => { if (failSongs) throw Error("song update failed"); state.songs.filter(row => row.artistId === where.artistId).forEach(row => Object.assign(row, data)) } },
  $transaction: async (work, options) => {
    assert.equal(options.isolationLevel, "Serializable"); attempts++
    if (serialFailures-- > 0) throw new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "test" })
    if (revokeBeforeTransaction) state.users[0].role = "user"
    const before = structuredClone(state)
    try { return await work(prisma) } catch (error) { state = before; throw error }
  },
}
const original = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "@/lib/prisma") return { prisma }
  if (request === "next/cache") return { revalidatePath() { if (cacheFailure) throw Error("cache") } }
  if (request === "./AdminContentButtons" || request === "@/app/components/AdminContentButtons") return { __esModule: true, default: () => null }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, isMain)
}
let server, artistRoute, roleRoute, legacy, PageActions
try {
  server = require("../lib/adminContent/server.ts")
  artistRoute = require("../app/api/admin/artists/[id]/route.ts")
  roleRoute = require("../app/api/admin/users/[id]/role/route.ts")
  legacy = require("../app/api/admin/artists/route.ts")
  PageActions = require("../app/components/AdminPageActions.tsx").default
} finally { Module._load = original }
const req = (body, method = "PATCH", headers = {}) => new Request("https://site.test/api/admin/artists/artist", { method, headers: { origin: "https://site.test", "content-type": "application/json", ...headers }, body: JSON.stringify(body) })
const ctx = id => ({ params: Promise.resolve({ id }) })
const input = () => ({ name: "Bend", category: "domace", image: "/artist.jpg", bio: "Original bio", discography: JSON.stringify(state.artists[0].discography), version: server.artistContentVersion(state.artists[0]) })
const deletion = () => ({ name: state.artists[0].name, version: server.artistContentVersion(state.artists[0]) })
const role = (value = "admin", expected = "user") => ({ role: value, expectedRole: expected, confirmed: true })
beforeEach(() => {
  state = { users: [{ id: "admin", role: "admin", banned: false }, { id: "user", role: "user", banned: false }, { id: "other-admin", role: "admin", banned: false }], artists: [{ id: "artist", name: "Bend", slug: "bend", category: "domace", bio: "Original bio", bioShort: "Short bio", image: "/artist.jpg", discography: [{ title: "Album", year: "2000", kind: "studio", source: "keep extra metadata" }], members: ["Singer"] }], songs: [{ id: "song", artistId: "artist", category: "domace", title: "Pesma", lyrics: "G   D\nStih", slug: "pesma" }, { id: "other", artistId: "other", category: "domace" }], favorites: [{ songId: "song" }], playlists: [{ songId: "song" }] }
  session = { user: { id: "admin", role: "admin" } }; down = failSongs = cacheFailure = revokeBeforeTransaction = false; serialFailures = attempts = 0
})

test("artist edit preserves structured album metadata and supports line-based discographies", () => {
  assert.deepEqual(validation.validateArtistEdit(input()).discography, state.artists[0].discography)
  assert.deepEqual(validation.parseArtistDiscography("1974 - One\n1976 - Two\n"), ["1974 - One", "1976 - Two"])
  assert.deepEqual(validation.parseArtistDiscography(""), [])
  assert.equal(validation.validateArtistEdit({ ...input(), role: "admin", slug: "forged" }).slug, undefined)
})
test("malformed JSON, invalid album shapes and excessive input never silently replace albums", () => {
  for (const value of ['[{"title":"Album"}', '{"album":"not an array"}', '[{"title":""}]', '[{"title":"Album","year":"yesterday"}]', '[{"title":"Album","kind":"song"}]', "x".repeat(100001)]) assert.throws(() => validation.parseArtistDiscography(value))
  for (const patch of [{ image: "javascript:alert(1)" }, { image: "http://site.test/a.jpg" }, { name: "" }, { category: "unknown" }, { version: "old" }]) assert.throws(() => validation.validateArtistEdit({ ...input(), ...patch }))
})
test("version hashing is stable across PostgreSQL JSON key ordering but detects all editable changes", () => {
  const artist = state.artists[0], hash = server.artistContentVersion(artist)
  assert.equal(hash, server.artistContentVersion({ ...artist, discography: [{ source: "keep extra metadata", kind: "studio", year: "2000", title: "Album" }] }))
  for (const patch of [{ bio: "New" }, { name: "Other" }, { image: "/new.jpg" }, { category: "strane" }, { bioShort: "New" }, { discography: [] }]) assert.notEqual(hash, server.artistContentVersion({ ...artist, ...patch }))
})
test("public page controls render only for a current non-banned database admin, not forged JWT role", async () => {
  const props = { id: "song", name: "Song", editHref: "/admin/songs/song/edit", kind: "song" }
  for (const identity of [null, { id: "user", role: "admin" }, { id: "missing", role: "admin" }]) {
    session = identity ? { user: identity } : null
    assert.equal(await PageActions(props), null)
  }
  session = { user: { id: "admin", role: "user" } }; assert.ok(await PageActions(props))
  state.users[0].banned = true; assert.equal(await PageActions(props), null)
})
test("anonymous, regular, banned and deleted users cannot edit/delete bios or change roles by direct API", async () => {
  for (const identity of [null, { id: "user", role: "admin" }, { id: "missing", role: "admin" }, { id: "admin", role: "admin" }]) {
    session = identity ? { user: identity } : null
    state.users[0].banned = identity?.id === "admin"
    const before = structuredClone(state), body = input()
    for (const response of [await artistRoute.PATCH(req(body), ctx("artist")), await artistRoute.DELETE(req(deletion(), "DELETE"), ctx("artist")), await roleRoute.PATCH(req(role()), ctx("user")), await legacy.PATCH(req({ ...body, id: "artist" })), await legacy.POST(req({ ...body, slug: "new" }, "POST"))]) assert.ok([401, 403].includes(response.status))
    assert.deepEqual(state, before)
  }
})
test("cross-origin, invalid content type and malformed/oversized bodies cannot mutate", async () => {
  assert.equal((await artistRoute.PATCH(req(input(), "PATCH", { origin: "https://evil.test" }), ctx("artist"))).status, 403)
  assert.equal((await roleRoute.PATCH(req(role(), "PATCH", { "sec-fetch-site": "cross-site" }), ctx("user"))).status, 403)
  assert.equal((await artistRoute.PATCH(req(input(), "PATCH", { "content-type": "text/plain" }), ctx("artist"))).status, 415)
  assert.equal((await artistRoute.PATCH(new Request("https://site.test/api/admin/artists/artist", { method: "PATCH", headers: { "content-type": "application/json" }, body: "{" }), ctx("artist"))).status, 400)
  assert.equal((await artistRoute.PATCH(req({ huge: "x".repeat(600001) }), ctx("artist"))).status, 413)
})
test("artist edits retain slug, songs, album structure and unrelated metadata", async () => {
  const response = await artistRoute.PATCH(req({ ...input(), bio: "Edited bio", slug: "injected", members: ["forged"] }), ctx("artist"))
  assert.equal(response.status, 200); const data = await response.json()
  assert.equal(data.href, "/pesme/domace/bend"); assert.equal(data.bioHref, "/biografija/domace/bend")
  assert.equal(state.artists[0].slug, "bend"); assert.deepEqual(state.artists[0].members, ["Singer"])
  assert.equal(state.artists[0].bioShort, null); assert.equal(state.songs[0].lyrics, "G   D\nStih")
  assert.equal(state.artists[0].discography[0].source, "keep extra metadata")
})
test("unchanged biography retains short summary; category move updates only this artist's songs", async () => {
  const response = await artistRoute.PATCH(req({ ...input(), category: "strane" }), ctx("artist"))
  assert.equal(response.status, 200); assert.equal(state.artists[0].bioShort, "Short bio")
  assert.equal(state.songs[0].category, "strane"); assert.equal(state.songs[1].category, "domace")
  assert.equal((await response.json()).bioHref, "/biografija/strane/bend")
})
test("category move failure rolls back artist and songs atomically", async () => {
  failSongs = true; const before = structuredClone(state)
  assert.equal((await artistRoute.PATCH(req({ ...input(), category: "strane" }), ctx("artist"))).status, 503)
  assert.deepEqual(state, before)
})
test("deleting biography clears only bio and short summary, never songs, photo, albums or artist", async () => {
  const before = structuredClone(state)
  assert.equal((await artistRoute.DELETE(req(deletion(), "DELETE"), ctx("artist"))).status, 200)
  assert.deepEqual(state, { ...before, artists: [{ ...before.artists[0], bio: null, bioShort: null }] })
})
test("stale edit/delete and wrong typed name fail without overwriting newer work", async () => {
  const body = input(), remove = deletion()
  state.artists[0].bio = "Newer biography"; const before = structuredClone(state)
  assert.equal((await artistRoute.PATCH(req(body), ctx("artist"))).status, 409)
  assert.equal((await artistRoute.DELETE(req(remove, "DELETE"), ctx("artist"))).status, 409)
  assert.equal((await artistRoute.DELETE(req({ ...deletion(), name: "Wrong" }, "DELETE"), ctx("artist"))).status, 409)
  assert.deepEqual(state, before)
})
test("legacy artist PATCH cannot bypass version/role checks", async () => {
  const body = input()
  assert.equal((await legacy.PATCH(req({ ...body, id: "artist", version: "bad" }))).status, 400)
  assert.equal((await legacy.PATCH(req({ ...body, id: "artist", bio: "Changed" }))).status, 200)
  assert.equal(state.artists[0].bio, "Changed")
})
test("only admin changes the target role, leaving password/profile and everyone else intact", async () => {
  state.users[1].password = "original hash"; state.users[1].name = "User name"
  const before = structuredClone(state)
  const response = await roleRoute.PATCH(req({ ...role(), banned: true, password: "forged" }), ctx("user"))
  assert.equal(response.status, 200); assert.equal((await response.json()).user.role, "admin")
  assert.deepEqual(state, { ...before, users: before.users.map(user => user.id === "user" ? { ...user, role: "admin" } : user) })
  assert.equal((await roleRoute.PATCH(req(role("user", "admin")), ctx("user"))).status, 200)
})
test("self-demotion, banned target, stale role, unknown account and unconfirmed elevation fail", async () => {
  assert.equal((await roleRoute.PATCH(req(role("user", "admin")), ctx("admin"))).status, 400)
  assert.equal((await roleRoute.PATCH(req({ ...role(), confirmed: false }), ctx("user"))).status, 400)
  assert.equal((await roleRoute.PATCH(req(role("owner")), ctx("user"))).status, 400)
  assert.equal((await roleRoute.PATCH(req({ ...role(), role: ["admin"] }), ctx("user"))).status, 400)
  assert.equal((await roleRoute.PATCH(req(role("admin", "admin")), ctx("user"))).status, 409)
  assert.equal((await roleRoute.PATCH(req(role()), ctx("missing"))).status, 404)
  state.users[1].banned = true; assert.equal((await roleRoute.PATCH(req(role()), ctx("user"))).status, 409)
})
test("admin rights are rechecked inside the transaction when revoked after initial authorization", async () => {
  revokeBeforeTransaction = true
  assert.equal((await artistRoute.PATCH(req(input()), ctx("artist"))).status, 403)
  assert.equal(state.artists[0].bio, "Original bio")
  state.users[0].role = "admin"
  assert.equal((await roleRoute.PATCH(req(role()), ctx("user"))).status, 403)
  assert.equal(state.users[1].role, "user")
})
test("serialization retries are bounded; cache outage does not turn committed work into failure", async () => {
  serialFailures = 2; cacheFailure = true
  assert.equal((await artistRoute.DELETE(req(deletion(), "DELETE"), ctx("artist"))).status, 200); assert.equal(attempts, 3)
  serialFailures = 3; assert.equal((await roleRoute.PATCH(req(role()), ctx("user"))).status, 503); assert.equal(state.users[1].role, "user")
})
test("database failures are not successful empty edits and never expose connection secrets", async () => {
  down = true
  const response = await roleRoute.PATCH(req(role()), ctx("user"))
  assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(await response.json()), /postgres|credentials/)
})
test("return navigation is derived from canonical paths, not arbitrary callback URLs", () => {
  assert.equal(paths.songPageHref({ slug: "song/name", category: "strane" }, { category: "domace", slug: "artist/name" }), "/pesme/domace/artist%2Fname/song%2Fname")
  assert.equal(paths.artistPageHref({ category: "domace", slug: "bend" }, "bio"), "/biografija/domace/bend")
  assert.equal(paths.artistPageHref({ category: null, slug: "bend" }), "/pesme")
})
test("legacy artist server actions independently require a fresh admin, not only layout access", () => {
  for (const file of ["app/admin/artists/page.tsx", "app/admin/artists/new/page.tsx", "app/admin/artists/[id]/edit/merge/page.tsx"]) {
    const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8")
    for (const fragment of source.split('"use server"').slice(1)) assert.match(fragment.slice(0, 100), /await requireSongAdmin\(\)/)
  }
})
