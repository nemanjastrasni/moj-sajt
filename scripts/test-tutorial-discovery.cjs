/* eslint-disable @typescript-eslint/no-require-imports -- Isolated YouTube/API fixtures; no real API or database. */
require("./lib/test-public-origin.cjs")
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, beforeEach, afterEach } = require("node:test"), assert = require("node:assert/strict"), path = require("node:path"), Module = require("node:module")
const { createTutorialDiscovery, tutorialCandidates, tutorialQuery } = require("../lib/tutorials/discovery.ts")
const { isTutorialCandidates, candidateSearchUrl } = require("../lib/tutorials/candidates.ts")
const originalFetch = global.fetch, originalKey = process.env.YOUTUBE_API_KEY
let session, user, song, calls, provider, reads
const video = (videoId = "AAAAAAAAAAA", title = "Probni bend - Probna pesma guitar tutorial", description = "") => ({ id: { videoId }, snippet: { title, description, channelTitle: "Učitelj &amp; gitara", liveBroadcastContent: "none" } })
const originalLoad = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "@/lib/prisma") return { prisma: {
    user: { findUnique: async () => user },
    song: { findUnique: async input => { reads.push(input); return song } },
  } }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return originalLoad.call(this, request, parent, isMain)
}
let route
try { route = require("../app/api/songs/[id]/tutorial/candidates/route.ts") } finally { Module._load = originalLoad }
beforeEach(() => {
  session = { user: { id: "admin", role: "admin" } }; user = { id: "admin", role: "admin", banned: false }
  song = { title: "Probna pesma", artist: { name: "Probni bend" } }; calls = []; reads = []
  process.env.YOUTUBE_API_KEY = "fixture-private-key"
  provider = async () => Response.json({ items: [video()] })
  global.fetch = async (url, options) => { calls.push({ url: new URL(url), options }); return provider(url, options) }
})
afterEach(() => { global.fetch = originalFetch; if (originalKey === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY = originalKey })
const context = { params: Promise.resolve({ id: "song" }) }
const request = (body = {}, headers = {}) => new Request("https://site.test/api/songs/song/tutorial/candidates", { method: "POST", body: JSON.stringify(body), headers: { origin: "https://site.test", "content-type": "application/json", ...headers } })

test("metadata candidates require the correct song, artist and guitar lesson, deduplicate and escape no HTML", () => {
  const candidates = tutorialCandidates({ items: [video(), video(), video("BBBBBBBBBBB", "Other band - Other song guitar lesson"), video("CCCCCCCCCCC", "Probni bend - Probna pesma Official Audio"), video("DDDDDDDDDDD", "Probni bend - Probna pesma piano tutorial"), video("EEEEEEEEEEE", "Probni bend - Probna pesma &quot;akordi&quot;"), video("bad", "Probni bend - Probna pesma akordi")] }, song.title, song.artist.name)
  assert.deepEqual(candidates.map(item => item.videoId), ["AAAAAAAAAAA", "EEEEEEEEEEE"])
  assert.equal(candidates[0].channel, "Učitelj & gitara"); assert.match(candidates[1].title, /"akordi"/)
  assert.equal(tutorialCandidates({ items: [video("ZZZZZZZZZZZ", "Djordje - Sreca guitar tutorial")] }, "Sreća", "Đorđe").length, 1)
  assert.throws(() => tutorialCandidates({ error: "private" }, song.title, song.artist.name))
})
test("query treats stored titles as text, and DTO/search links cannot inject external URLs", () => {
  const query = tutorialQuery('Song | "-bad"', "Artist")
  assert.ok(!/["|\-]/.test(query)); assert.match(candidateSearchUrl(query), /^https:\/\/www.youtube.com\/results\?search_query=/)
  const dto = { songId: "song", query, available: true, candidates: [{ videoId: "AAAAAAAAAAA", title: "Lesson", channel: "Teacher" }] }
  assert.equal(isTutorialCandidates(dto, "song"), true); assert.equal(isTutorialCandidates(dto, "other"), false)
  assert.equal(isTutorialCandidates({ ...dto, candidates: [{ ...dto.candidates[0], videoId: "https://evil.test" }] }, "song"), false)
})
test("without an API key discovery returns an actionable manual search and makes no request", async () => {
  delete process.env.YOUTUBE_API_KEY
  const value = await createTutorialDiscovery()(song.title, song.artist.name, "admin")
  assert.equal(value.available, false); assert.deepEqual(value.candidates, []); assert.match(value.query, /Probna pesma/); assert.equal(calls.length, 0)
})
test("single search uses bounded embeddable-video API query, caches and coalesces requests", async () => {
  const discover = createTutorialDiscovery()
  const [a, b] = await Promise.all([discover(song.title, song.artist.name, "admin"), discover(song.title, song.artist.name, "other")])
  assert.deepEqual(a, b); assert.equal(calls.length, 1)
  const { url, options } = calls[0]
  assert.equal(url.origin, "https://www.googleapis.com"); assert.equal(url.searchParams.get("type"), "video"); assert.equal(url.searchParams.get("videoEmbeddable"), "true"); assert.equal(url.searchParams.get("maxResults"), "8")
  assert.equal(options.cache, "no-store"); assert.equal(options.redirect, "error"); assert.ok(options.signal)
  assert.equal(JSON.stringify(a).includes("fixture-private-key"), false)
  await discover(song.title, song.artist.name, "admin"); assert.equal(calls.length, 1)
  await assert.rejects(discover("Another song", song.artist.name, "admin"), error => error.status === 429)
  await discover("Another song", song.artist.name, "other"); assert.equal(calls.length, 2)
})
test("expired metadata is refetched and cache key changes when a song is renamed", async () => {
  const discover = createTutorialDiscovery(), originalNow = Date.now
  let now = originalNow()
  Date.now = () => now
  try {
    await discover(song.title, song.artist.name, "admin")
    now += 61 * 60 * 1000
    await discover(song.title, song.artist.name, "admin"); assert.equal(calls.length, 2)
    now += 31000
    await discover("Renamed song", song.artist.name, "admin"); assert.equal(calls.length, 3)
  } finally { Date.now = originalNow }
})
test("upstream errors, huge bodies and malformed JSON are sanitized and never cached as successes", async () => {
  for (const failure of [() => Response.json({ error: "fixture-private-key" }, { status: 403 }), () => new Response("not JSON"), () => new Response("x".repeat(100001)), () => Response.json({ items: null }), () => { throw Error("fixture-private-key") }]) {
    provider = failure
    const discover = createTutorialDiscovery()
    await assert.rejects(discover(song.title, song.artist.name, "admin"), error => error.status === 503 && !error.message.includes("private-key"))
    provider = async () => Response.json({ items: [video()] })
    assert.equal((await discover(song.title, song.artist.name, "other")).candidates.length, 1)
  }
})
test("provider timeout aborts the request and returns a useful sanitized error", async () => {
  const originalTimer = global.setTimeout
  global.setTimeout = (fn, ms, ...args) => originalTimer(fn, ms === 8000 ? 5 : ms, ...args)
  provider = (_url, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(Error("secret timeout"))))
  try { await assert.rejects(createTutorialDiscovery()(song.title, song.artist.name, "admin"), error => error.status === 503 && !error.message.includes("secret")) }
  finally { global.setTimeout = originalTimer }
})
test("anonymous, ordinary, banned and deleted actors fail before song reads or quota use", async () => {
  for (const scenario of [() => { session = null }, () => { user.role = "user" }, () => { user.banned = true }, () => { user = null }]) {
    session = { user: { id: "admin", role: "admin" } }; user = { id: "admin", role: "admin", banned: false }; scenario()
    const response = await route.POST(request(), context)
    assert.ok([401, 403].includes(response.status)); assert.equal(response.headers.get("cache-control"), "private, no-store")
  }
  assert.equal(calls.length, 0); assert.equal(reads.length, 0)
})
test("cross-origin, arbitrary queries, wrong types and oversized input fail before reads or external search", async () => {
  assert.equal((await route.POST(request({}, { origin: "https://evil.test" }), context)).status, 403)
  assert.equal((await route.POST(request({}, { "content-type": "text/plain" }), context)).status, 415)
  for (const input of [[], null, { query: "arbitrary" }, { preview: "true" }, { payload: "x".repeat(2000) }]) assert.ok([400, 413].includes((await route.POST(request(input), context)).status))
  assert.equal((await route.POST(request(), { params: Promise.resolve({ id: "../song" }) })).status, 400)
  assert.equal(calls.length, 0); assert.equal(reads.length, 0)
})
test("preview returns a manual search without quota; fresh authorization still applies on cached results", async () => {
  let response = await route.POST(request({ preview: true }), context)
  assert.equal(response.status, 200); assert.equal(calls.length, 0); assert.match((await response.json()).query, /Probni bend Probna pesma/)
  assert.deepEqual(reads[0].select, { title: true, artist: { select: { name: true } } })
  response = await route.POST(request(), context)
  assert.equal(response.status, 200); assert.equal(calls.length, 1)
  const data = await response.json(); assert.equal(isTutorialCandidates(data, "song"), true); assert.equal(data.candidates.length, 1)
  user.role = "user"
  assert.equal((await route.POST(request(), context)).status, 403); assert.equal(calls.length, 1)
  user.role = "admin"; song = null
  assert.equal((await route.POST(request(), context)).status, 404); assert.equal(calls.length, 1)
})
