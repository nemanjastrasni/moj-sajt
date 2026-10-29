/* eslint-disable @typescript-eslint/no-require-imports -- Isolated navigation fixtures, no live writes. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test } = require("node:test"), assert = require("node:assert/strict"), Module = require("node:module"), path = require("node:path")
const { isPlaylistNavigation } = require("../lib/playlists/navigation.ts")
const { SubmissionError } = require("../lib/submissions/validation.ts")
let list, query, viewer
const original = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "@/lib/prisma") return { prisma: { playlist: { findFirst: async input => { query = input; return list && (list.isPublic || list.userId === viewer) ? list : null } } } }
  if (request === "./server") return { playlistOrder: [{ order: "asc" }, { id: "asc" }], readablePlaylistWhere: (id, userId) => { viewer = userId; return { id, OR: [{ isPublic: true }, ...(userId ? [{ userId }] : [])] } } }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, isMain)
}
let navigation
try { navigation = require("../lib/playlists/navigationServer.ts").playlistNavigation } finally { Module._load = original }
const song = (id, category = "narodne") => ({ songId: id, song: { title: id, slug: id, artist: { slug: "aca-i-marija", category } } })
test("private browsing checks current ownership and returns only titles and canonical context links", async () => {
  list = { id: "list", name: "Repertoar", isPublic: false, userId: "owner", songs: [song("first"), song("second", "domace")] }
  for (const actor of [null, "other"]) await assert.rejects(() => navigation("list", actor, "first"), error => error instanceof SubmissionError && error.status === 404)
  const data = await navigation("list", "owner", "first")
  assert.equal(isPlaylistNavigation(data, "list", "first"), true)
  assert.equal(data.songs[1].href, "/pesme/domace/aca-i-marija/second?playlist=%2Fplejliste%2Flist")
  assert.equal(data.userId, undefined)
  assert.equal(data.songs[0].lyrics, undefined)
  assert.equal(query.select.songs.take, 2001)
  assert.ok(query.select.songs.orderBy)
})
test("public visitors can browse, removed songs and oversized lists fail explicitly", async () => {
  list = { id: "list", name: "Javno", isPublic: true, userId: "owner", songs: [song("first")] }
  assert.equal((await navigation("list", null, "first")).songs.length, 1)
  await assert.rejects(() => navigation("list", null, "removed"), error => error.status === 404)
  list.songs = Array.from({ length: 2001 }, (_, index) => song("s" + index))
  await assert.rejects(() => navigation("list", null, "s0"), error => error.status === 413)
})
test("checked client data rejects external URLs, repeated IDs and mismatched contexts", () => {
  const data = { id: "list", name: "List", current: "one", songs: [{ id: "one", title: "One", href: "/pesme/domace/bend/one?playlist=%2Fplejliste%2Flist" }] }
  assert.equal(isPlaylistNavigation(data, "list", "one"), true)
  for (const href of ["https://evil.test", "//evil.test", "/admin", "javascript:alert(1)"]) assert.equal(isPlaylistNavigation({ ...data, songs: [{ ...data.songs[0], href }] }, "list", "one"), false)
  assert.equal(isPlaylistNavigation({ ...data, songs: [...data.songs, ...data.songs] }, "list", "one"), false)
  assert.equal(isPlaylistNavigation(data, "other", "one"), false)
  assert.equal(isPlaylistNavigation({ ...data, songs: [{ ...data.songs[0], href: data.songs[0].href.replace("%2Flist", "%2Fother") }] }, "list", "one"), false)
  assert.equal(isPlaylistNavigation(data, "list", "removed"), false)
})
