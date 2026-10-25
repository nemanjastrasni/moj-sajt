/* eslint-disable @typescript-eslint/no-require-imports -- Existing CommonJS module-loader test pattern. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const Module = require("node:module")
const path = require("node:path")
const { playlistSongHref } = require("../lib/navigation/parent.ts")
const song = { id: "song", title: "Pesma", slug: "pesma", category: "domace", lyrics: "G\nStih", chords: null, artist: { name: "Bend", slug: "bend", category: "domace" } }
const marker = () => null, SongClient = () => null
const original = Module._load
let reads = 0, updates = 0
Module._load = function(request, parent, isMain) {
  if (request === "@/lib/prisma") return { prisma: { song: { findFirst: async () => { reads++; return song }, update: async () => { updates++; return song } } } }
  if (request === "next/navigation") return { notFound: () => { throw Error("not found") } }
  if (request === "../../../../components/SongClient") return { __esModule: true, default: SongClient }
  if (request === "@/app/components/AdminPageActions") return { __esModule: true, default: () => null }
  if (request === "@/app/components/BackNavigation") return { BackNavigationTarget: marker }
  if (request === "@/lib/songReview/server") return { songReviewVersion: () => "version" }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, isMain)
}
let SongPage
try { SongPage = require("../app/pesme/[category]/[artist]/[slug]/page.tsx").default }
finally { Module._load = original }
const context = playlist => ({ params: Promise.resolve({ category: "domace", artist: "bend", slug: "pesma" }), searchParams: Promise.resolve(playlist === undefined ? {} : { playlist }) })

test("real song server page binds validated playlist context to this exact song pathname", async () => {
  const url = new URL(playlistSongHref(song, "/plejliste/first"), "https://site.test")
  const tree = await SongPage(context(url.searchParams.get("playlist")))
  const target = tree.props.children.find(child => child?.type === marker)
  assert.deepEqual(target.props, { pathname: "/pesme/domace/bend/pesma", href: "/plejliste/first" })
  assert.equal(tree.props.children.find(child => child?.type === SongClient).props.song.lyrics, song.lyrics)
})

test("artist/direct visits and forged or repeated query values do not acquire a playlist target", async () => {
  for (const value of [undefined, "/admin", "https://evil.test", ["/plejliste/a", "/plejliste/b"]]) {
    const tree = await SongPage(context(value))
    assert.equal(tree.props.children.some(child => child?.type === marker), false)
  }
})

test("separate list links for the same song retain independent server-rendered targets", async () => {
  for (const id of ["first", "second", "first"]) {
    const tree = await SongPage(context("/plejliste/" + id))
    assert.equal(tree.props.children.find(child => child?.type === marker).props.href, "/plejliste/" + id)
  }
  assert.equal(reads, updates, "navigation adds no queries and leaves existing visit-counter behavior unchanged")
})

test("Favorites explicitly restore the personal view and return there, while catalog/playlist visits stay original", async () => {
  const props = query => ({ params: Promise.resolve({ category: "domace", artist: "bend", slug: "pesma" }), searchParams: Promise.resolve(query) })
  const favorite = await SongPage(props({ from: "favorites" }))
  assert.equal(favorite.props.children.find(child => child?.type === marker).props.href, "/favorite")
  assert.equal(favorite.props.children.find(child => child?.type === SongClient).props.fromFavorites, true)
  for (const query of [{}, { from: ["favorites"] }, { from: "Favorites" }, { from: "favorites", playlist: "/plejliste/first" }]) {
    const tree = await SongPage(props(query))
    assert.equal(tree.props.children.find(child => child?.type === SongClient).props.fromFavorites, false)
  }
})
