/* eslint-disable @typescript-eslint/no-require-imports -- Isolated public SEO behavior without live database access. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const Module = require("node:module"), path = require("node:path")
const React = require("react"), { renderToStaticMarkup } = require("react-dom/server")
let artistReads, songReads, artists, songs
const root = path.join(__dirname, ".."), cache = new Map()
const original = Module._load
Module._load = function(request, parent, main) {
  if (request === "@/lib/prisma") return { prisma: {
    artist: { findMany: async () => { artistReads++; return artists } },
    song: { findMany: async ({ where }) => { songReads++; return songs.filter(song => typeof where.category === "string" ? song.category === where.category : where.category.in.includes(song.category)) } },
  } }
  if (request === "next/navigation") return {
    notFound: () => { throw Object.assign(Error("not found"), { status: 404 }) },
    permanentRedirect: url => { throw Object.assign(Error("redirect"), { status: 308, url }) },
  }
  if (request === "react") return { ...React, cache: fn => (...args) => {
    let entries = cache.get(fn)
    if (!entries) { entries = new Map(); cache.set(fn, entries) }
    const key = JSON.stringify(args)
    if (!entries.has(key)) entries.set(key, fn(...args))
    return entries.get(key)
  } }
  if (request === "next/cache") return { unstable_cache: fn => fn }
  if (request === "@/lib/playlists/server") return { playlistViewerId: async () => null }
  if (request === "next/link") return { __esModule: true, default: ({ children, ...props }) => {
    delete props.prefetch
    return React.createElement("a", props, children)
  } }
  if (request.endsWith(".css")) return { __esModule: true, default: {} }
  if (request.includes("/components/") && !/\/(Breadcrumbs|StructuredData)(?:\.tsx)?$/.test(request)) return { __esModule: true, default: () => null }
  if (request.startsWith("@/")) request = path.join(root, request.slice(2))
  return original.call(this, request, parent, main)
}
let letter, bioLetter, bioCategory, chord, playlist, top, structured, Breadcrumbs, metadata, site, maps
try {
  letter = require("../app/pesme/[category]/slovo/[letter]/page.tsx")
  bioLetter = require("../app/biografija/[category]/slovo/[slovo]/page.tsx")
  bioCategory = require("../app/biografija/[category]/page.tsx")
  chord = require("../app/akordi/[root]/page.tsx")
  playlist = require("../app/plejliste/[id]/page.tsx")
  top = require("../app/top-50/[category]/page.tsx")
  structured = require("../lib/seo/structured-data.ts")
  Breadcrumbs = require("../app/components/Breadcrumbs.tsx").default
  metadata = require("../lib/seo/metadata.ts")
  site = require("../lib/seo/site.ts")
  maps = require("../lib/seo/sitemaps.ts")
} finally { Module._load = original }

beforeEach(() => {
  artistReads = 0; songReads = 0; cache.clear()
  artists = [{ id: "test", name: "Čuveni bend", slug: "cuveni-bend", category: "domace", image: null, bio: "Proverljiva probna biografija.", songs: [], performances: [] }]
  songs = Array.from({ length: 61 }, (_, index) => ({ id: String(index), title: "Pesma " + index, slug: "pesma-" + index, category: "domace", lyrics: "C G Am", chords: null, artist: { name: "Bend", slug: "bend" } }))
})
const props = (params, query) => ({ params: Promise.resolve(params), searchParams: Promise.resolve(query ?? {}) })
const notFound = error => error.status === 404

test("invalid categories and letters return 404 before touching the catalog", async () => {
  for (const value of ["%", "../../", "not-a-letter", "💥", ""]) {
    await assert.rejects(letter.generateMetadata(props({ category: "domace", letter: value })), notFound)
    await assert.rejects(bioLetter.default(props({ category: "domace", slovo: value })), notFound)
  }
  await assert.rejects(letter.default(props({ category: "fake", letter: "a" })), notFound)
  await assert.rejects(bioCategory.default(props({ category: "fake" })), notFound)
  await assert.rejects(bioCategory.generateMetadata(props({ category: "fake" })), notFound)
  await assert.rejects(top.default(props({ category: "fake" })), notFound)
  assert.equal(artistReads, 0); assert.equal(songReads, 0)
})

test("letter aliases redirect permanently to one encoded public address", async () => {
  for (const [value, expected] of [["Č", "%C4%8D"], ["LJ", "lj"], ["#", "num"], ["NUM", "num"]]) {
    await assert.rejects(letter.default(props({ category: "domace", letter: value })), error => error.status === 308 && error.url === "/pesme/domace/slovo/" + expected)
  }
  await assert.rejects(bioLetter.default(props({ category: "domace", slovo: "Č" })), error => error.status === 308 && error.url.endsWith("/%C4%8D"))
  assert.equal(artistReads, 0)
})

test("letter pages describe their actual category and suppress empty search results", async () => {
  const meta = await letter.generateMetadata(props({ category: "domace", letter: "%C4%8D" }))
  assert.match(meta.title, /Zabavne.*Č/)
  assert.equal(meta.alternates.canonical, site.SITE_URL + "/pesme/domace/slovo/%C4%8D")
  assert.equal(meta.robots, undefined)
  await letter.default(props({ category: "domace", letter: "č" }))
  assert.equal(artistReads, 1, "metadata and HTML must share the same request lookup")
  const empty = await letter.generateMetadata(props({ category: "domace", letter: "q" }))
  assert.deepEqual(empty.robots, { index: false, follow: true })
  const bio = await bioLetter.generateMetadata(props({ category: "domace", slovo: "q" }))
  assert.deepEqual(bio.robots, { index: false, follow: true })
})

test("chord routes support encoded sharps and reject unknown roots instead of empty 200 pages", async () => {
  const meta = await chord.generateMetadata(props({ root: "C%23" }))
  assert.equal(meta.alternates.canonical, site.SITE_URL + "/akordi/C%23")
  assert.match(meta.title, /^C# akordi/)
  await assert.rejects(chord.default(props({ root: "c#" })), error => error.status === 308 && error.url === "/akordi/C%23")
  for (const value of ["Z", "%", "../", "C%2523"]) await assert.rejects(chord.generateMetadata(props({ root: value })), notFound)
})

test("public playlist pagination has distinct canonical URLs without personal query context", async () => {
  const first = await playlist.generateMetadata(props({ id: "veoma-lako" }, { page: "1", playlist: "private", play: "1" }))
  const second = await playlist.generateMetadata(props({ id: "veoma-lako" }, { page: "2", category: "domace", playlist: "private" }))
  assert.equal(first.alternates.canonical, site.SITE_URL + "/plejliste/veoma-lako")
  assert.equal(second.alternates.canonical, site.SITE_URL + "/plejliste/veoma-lako?page=2&category=domace")
  assert.equal(second.openGraph.url, second.alternates.canonical)
  assert.match(second.title, /Strana 2/)
  const last = await playlist.generateMetadata(props({ id: "veoma-lako" }, { page: "999" }))
  assert.equal(last.alternates.canonical, site.SITE_URL + "/plejliste/veoma-lako?page=2")
  const empty = await playlist.generateMetadata(props({ id: "veoma-lako" }, { category: "strane" }))
  assert.deepEqual(empty.robots, { index: false, follow: true })
})

test("private playlist metadata never reads or exposes a user playlist name", async () => {
  const result = await playlist.generateMetadata(props({ id: "private-user-list" }))
  assert.deepEqual(result.robots, { index: false, follow: false })
  assert.equal(result.alternates, undefined)
  assert.equal(songReads, 0); assert.equal(artistReads, 0)
})

test("untrusted breadcrumb names round-trip as JSON without terminating the script", () => {
  const items = [{ name: "Početna", path: "/" }, { name: '</script><script>alert("x")</script>&\u2028\u2029', path: "/pesme" }]
  const html = renderToStaticMarkup(React.createElement(Breadcrumbs, { items }))
  assert.equal((html.match(/<script/g) ?? []).length, 1)
  const serialized = html.match(/<script[^>]*>(.*?)<\/script>/s)[1]
  const data = JSON.parse(serialized)
  assert.equal(data.itemListElement[1].name, items[1].name)
  assert.equal(data.itemListElement[1].position, 2)
  assert.equal(data.itemListElement[1].item, site.SITE_URL + "/pesme")
  assert.match(html, /aria-current="page"/)
  assert.doesNotMatch(serialized, /[<>&\u2028\u2029]/)
})

test("website identity uses the configured canonical origin without a fake search endpoint", () => {
  const data = structured.websiteData()
  assert.equal(data.url, site.SITE_URL + "/")
  assert.equal(data.name, site.SITE_NAME)
  assert.deepEqual(data.alternateName, ['GitarAkordi.com', 'gitarakordi.com'])
  assert.equal(data.image.url, site.SITE_URL + '/brand/gitarakordi-share.png')
  assert.equal(data.potentialAction, undefined)
})

test("social images use the actual artist photo and preserve the default fallback", () => {
  const artist = metadata.publicPageMetadata("Bend", "Biografija", "/biografija/domace/bend", { image: "/artist-photos/test.webp" })
  assert.equal(artist.openGraph.images[0].url, site.SITE_URL + "/artist-photos/test.webp")
  assert.equal(artist.openGraph.images[0].width, undefined, "do not invent the photo dimensions")
  assert.equal(artist.twitter.images[0], artist.openGraph.images[0].url)
  assert.ok(metadata.publicPageMetadata("Pesme", "Akordi", "/pesme").openGraph.images[0].width > 0)
  const fallback = metadata.publicPageMetadata("Pesme", "Akordi", "/pesme").openGraph.images[0]
  assert.equal(fallback.url, site.SITE_URL + '/brand/gitarakordi-share.png')
  assert.equal(fallback.width, 1200)
  assert.equal(fallback.height, 630)
})

test("the shared default card is a real public image with the advertised dimensions", async () => {
  const image = metadata.publicPageMetadata("Pesme", "Akordi", "/pesme").openGraph.images[0]
  const source = path.join(root, 'public', new URL(image.url).pathname)
  const actual = await require('sharp')(source).metadata()
  assert.equal(actual.format, 'png')
  assert.equal(actual.width, image.width)
  assert.equal(actual.height, image.height)
})

test("sitemap exposes chord roots and public catalog entry points without private recommendations", () => {
  assert.ok(maps.sitemapStaticPaths.includes("/akordi/C%23"))
  assert.ok(maps.sitemapStaticPaths.includes("/plejliste/4-akorda"))
  assert.ok(maps.sitemapStaticPaths.includes("/top-50/domace"))
  assert.ok(maps.sitemapStaticPaths.includes("/public-listening-playlists"))
  assert.equal(maps.sitemapStaticPaths.some(url => /pesme-koje-znam|top-user|profile|[?]/.test(url)), false)
})
