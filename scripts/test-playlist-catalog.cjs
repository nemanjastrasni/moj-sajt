/* eslint-disable @typescript-eslint/no-require-imports -- Node tests isolate server reads with fixtures. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test } = require("node:test")
const assert = require("node:assert/strict")
const Module = require("node:module"), path = require("node:path")
const { renderToStaticMarkup } = require("react-dom/server")
const React = require("react")
let rows = [], selection, sessionId = "owner", skillLevel = "beginner"
const original = Module._load
Module._load = function(request, parent, main) {
  if (request === "@/lib/prisma") return { prisma: {
    song: { findMany: async args => { selection = args; return rows.filter(row => typeof args.where.category === "string" ? row.category === args.where.category : args.where.category.in.includes(row.category)) } },
    user: { findUnique: async () => ({ skillLevel }) },
  } }
  if (request === "@/lib/playlists/server") return { playlistViewerId: async () => sessionId }
  if (request === "next/cache") return { unstable_cache: fn => fn }
  if (request === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) }
  if (request.endsWith("UiText")) return { __esModule: true, default: ({ text, values = {} }) => text.replace(/\{(\w+)\}/g, (_, key) => values[key]), CategoryLabel: ({ value }) => value, useI18n: () => ({ t: value => value, locale: "sr" }) }
  if (request.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, main)
}
let Catalog, ForSkill
try { Catalog = require("../app/components/PlaylistCatalog.tsx").default; ForSkill = require("../app/plejliste/pesme-koje-znam/page.tsx").default }
finally { Module._load = original }
const fixture = (id, lyrics = "C G Am", category = "domace") => ({ id, title: id, slug: id, category, lyrics, chords: null, difficulty: "beginner", artist: { name: "Band", slug: "band" } })
test("real catalog paginates filtered songs, retains back context and never includes lyrics in its HTML", async () => {
  rows = Array.from({ length: 61 }, (_, index) => fixture("song-" + index)); rows.push(fixture("hard", "E(#9) A7"))
  const html = renderToStaticMarkup(await Catalog({ slug: "veoma-lako", page: "2" }))
  assert.ok(html.includes("song-50")); assert.ok(!html.includes("song-49")); assert.ok(!html.includes("E(#9)"))
  assert.ok(html.includes("page%3D2")); assert.ok(html.includes("61"))
  assert.equal(selection.select.lyrics, true)
})
test("an empty valid filter stays empty and category filtering does not leak another category", async () => {
  rows = [fixture("folk", "C G", "narodne"), fixture("foreign", "E(#9)", "strane")]
  const empty = renderToStaticMarkup(await Catalog({ slug: "veoma-lako", category: "strane" }))
  assert.ok(empty.includes("Nema pesama u ovom izboru.")); assert.ok(!empty.includes("folk")); assert.ok(!empty.includes("foreign"))
  const foreign = renderToStaticMarkup(await Catalog({ slug: "strane" }))
  assert.ok(foreign.includes("foreign")); assert.ok(!foreign.includes("folk"))
})
test("songs I can play uses the current account skill instead of the old hardcoded beginner field", async () => {
  rows = [fixture("simple"), fixture("barre", "F#m Bm E"), fixture("altered", "E(#9) A7")]
  sessionId = "owner"; skillLevel = "beginner"
  const beginner = renderToStaticMarkup(await ForSkill({}))
  assert.ok(beginner.includes("simple")); assert.ok(!beginner.includes("barre")); assert.ok(!beginner.includes("altered"))
  skillLevel = "advanced"
  const advanced = renderToStaticMarkup(await ForSkill({}))
  assert.ok(advanced.includes("barre")); assert.ok(advanced.includes("altered"))
  sessionId = null
  assert.equal(renderToStaticMarkup(await ForSkill({})), "<p>Nisi ulogovan</p>")
})
