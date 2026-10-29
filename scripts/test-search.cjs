require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "CommonJS", moduleResolution: "Node" },
})
const { test, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const Module = require("node:module")
const { prepareSongQuery, songSearchWhere, exactSongWhere, rankSearchResults, songSearchHref, SEARCH_LIMIT, foldSearchText } = require("../lib/songSearch.ts")
const { loadSongSearch } = require("../lib/songSearchClient.ts")
const { slugify } = require("../lib/until/slug.ts")

const artist = (name, slug = slugify(name)) => ({ name, slug })
const song = (id, title, by, popularity = 1) => ({ id, title, slug: slugify(title), category: "domace", artist: artist(by), popularity })
const fixtures = [
  song("zemlja", "Zemlja", "Ekatarina Velika"),
  song("slovenska", "Slovenska", "\u0110or\u0111e Bala\u0161evi\u0107", 10),
  song("ruza", "Ru\u017eo moja", "Zdravko \u010coli\u0107", 9),
  { ...song("wish", "Wish You Were Here", "Pink Floyd", 4), category: "strane" },
  { ...song("zeljko", "Probna pesma", "\u017deljko Joksimovi\u0107"), slug: "old-import-1", artist: artist("\u017deljko Joksimovi\u0107", "old-import-artist") },
  ...Array.from({ length: 50 }, (_, i) => song("partial-" + i, "Neka druga zemlja " + i, "Drugi izvodjac", 1000 - i)),
]

function stringMatch(value, filter) {
  if (typeof filter === "string") return value === filter
  const normalize = text => filter.mode === "insensitive" ? text.toLowerCase() : text
  if (filter.equals !== undefined) return normalize(value) === normalize(filter.mode === "insensitive" ? filter.equals.replace(/\\([\\%_])/g, "$1") : filter.equals)
  if (filter.contains !== undefined) return normalize(value).includes(normalize(filter.contains.replace(/\\([\\%_])/g, "$1")))
  throw new Error("Unexpected filter")
}
function matches(record, where) {
  if (where.AND && ![].concat(where.AND).every(condition => matches(record, condition))) return false
  if (where.OR && !where.OR.some(condition => matches(record, condition))) return false
  if (where.id?.notIn?.includes(record.id)) return false
  for (const field of ["title", "slug"]) if (where[field] && !stringMatch(record[field], where[field])) return false
  if (where.artist && !Object.entries(where.artist).every(([field, filter]) => stringMatch(record.artist[field], filter))) return false
  return true
}
let failDatabase = false
const calls = []
const prisma = { song: { async findMany(args) {
  calls.push(args)
  if (failDatabase) throw new Error("private-database-error")
  return fixtures.filter(record => matches(record, args.where))
    .sort((a, b) => b.popularity - a.popularity || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
    .slice(0, args.take)
} } }
let normalizedSearchQuery
const originalLoad = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "@/lib/prisma") return { prisma }
  if (request === "@/lib/songSearchServer") return { normalizedSongSearch: async search => {
    calls.push({ query: normalizedSearchQuery(search) })
    if (failDatabase) throw Error("private-database-error")
    const found = fixtures.filter(record => search.terms.every(term => [record.title, record.artist.name].some(text => foldSearchText(text).includes(foldSearchText(term))) || [record.slug, record.artist.slug].some(slug => slugify(term) && slug.toLowerCase().includes(slugify(term)))))
    return rankSearchResults(found, search.query).map(result => fixtures.find(record => record.id === result.id))
  } }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return originalLoad.call(this, request, parent, isMain)
}
let GET
try { normalizedSearchQuery = require("../lib/songSearchServer.ts").normalizedSearchQuery; GET = require("../app/api/search/route.ts").GET }
finally { Module._load = originalLoad }
beforeEach(() => { calls.length = 0; failDatabase = false })
const request = query => new Request("https://site.test/api/search?" + new URLSearchParams({ q: query }))

test("query cleanup handles whitespace and rejects empty, punctuation-only or oversized queries", () => {
  assert.deepEqual(prepareSongQuery("  wish   you\twere here ").terms, ["wish", "you", "were", "here"])
  for (const query of [null, "", " a ", " %_ ", "---"]) assert.equal(prepareSongQuery(query), null)
  assert.throws(() => prepareSongQuery("a".repeat(121)))
  assert.throws(() => prepareSongQuery("one two three four five six seven"))
  assert.equal(prepareSongQuery("\u043f\u0435\u0441\u043c\u0430").query, "\u043f\u0435\u0441\u043c\u0430")
})

test("search is case-insensitive and matches words anywhere, not just the start", () => {
  const where = songSearchWhere(prepareSongQuery("MOJA"))
  assert.equal(matches(fixtures.find(s => s.id === "ruza"), where), true)
  assert.equal(matches(fixtures[0], where), false)
})

test("all terms must match, including combinations of artist and song in either order", () => {
  for (const query of ["ekatarina zemlja", "zemlja VELIKA"]) {
    const found = fixtures.filter(s => matches(s, songSearchWhere(prepareSongQuery(query))))
    assert.deepEqual(found.map(s => s.id), ["zemlja"])
  }
  const where = songSearchWhere(prepareSongQuery("Pink Floyd wish"))
  assert.equal(matches(fixtures.find(s => s.id === "wish"), where), true)
})

test("accented names and names without accents find canonical ASCII slugs", () => {
  for (const query of ["djordje balasevic", "\u0110or\u0111e Bala\u0161evi\u0107", "balasevic slov", "Bala\u0161evi\u0107 SLOV"]) {
    assert.equal(matches(fixtures.find(s => s.id === "slovenska"), songSearchWhere(prepareSongQuery(query))), true)
  }
  assert.equal(matches(fixtures.find(s => s.id === "ruza"), exactSongWhere(prepareSongQuery("Ruzo moja"))), true)
})

test("LIKE wildcards and backslashes are escaped in contains filters", () => {
  const where = songSearchWhere(prepareSongQuery("a_%\\b"))
  assert.equal(where.AND[0].OR[0].title.contains, "a\\_\\%\\\\b")
  assert.equal(where.AND[0].OR[0].title.mode, "insensitive")
  assert.equal(exactSongWhere(prepareSongQuery("100%" )).OR[0].title.equals, "100\\%")
})

test("ranking prefers exact titles, removes duplicate ids and returns only public fields", () => {
  const result = rankSearchResults([...fixtures, fixtures[0]], "zemlja")
  assert.equal(result[0].id, "zemlja")
  assert.equal(result.length, SEARCH_LIMIT)
  assert.equal(new Set(result.map(s => s.id)).size, result.length)
  assert.equal(result[0].popularity, undefined)
})

test("song URLs encode each path segment without allowing extra route segments", () => {
  assert.equal(songSearchHref({ category: "domace", artist: { slug: "ac/dc" }, slug: "a#b?c" }), "/pesme/domace/ac%2Fdc/a%23b%3Fc")
})

test("API skips database for short queries and rejects excessive input", async () => {
  assert.deepEqual(await (await GET(request("a"))).json(), [])
  assert.deepEqual(await (await GET(request("%%"))).json(), [])
  assert.equal((await GET(request("a".repeat(121)))).status, 400)
  assert.equal(calls.length, 0)
})

test("API retains exact title even behind 50 more popular partial matches", async () => {
  const response = await GET(request("ZEMLJA"))
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data[0].id, "zemlja")
  assert.equal(data.length, SEARCH_LIMIT)
  assert.equal(calls.length, 1)
  assert.ok(calls.every(call => !/lyrics|password|email/i.test(call.query.text)))
  assert.equal(response.headers.get("cache-control"), "no-store")
})

test("API matches artist plus title and distinguishes no matches from DB failure", async () => {
  assert.deepEqual((await (await GET(request("Velika zemlja"))).json()).map(s => s.id), ["zemlja"])
  assert.deepEqual(await (await GET(request("nonexistent-title"))).json(), [])
  failDatabase = true
  const response = await GET(request("zemlja"))
  assert.equal(response.status, 503)
  assert.ok(!(await response.text()).includes("private-database"))
})

test("normalized matching is independent of import slugs and supports Serbian case/accents", async () => {
  for (const query of ["Zeljko", "\u017deljko", "ZELJKO"]) assert.deepEqual((await (await GET(request(query))).json()).map(song => song.id), ["zeljko"])
  for (const [first, second] of [["Djordje", "\u0110or\u0111e"], ["Ceca", "\u0106e\u010da"], ["Saban", "\u0160aban"], ["Ruzo", "Ru\u017eo"]]) assert.equal(foldSearchText(first), foldSearchText(second))
})

test("normalized SQL binds hostile inputs, escapes LIKE metacharacters and never fetches lyric bodies", () => {
  const input = "ab%_' OR 1=1 --", query = normalizedSearchQuery(prepareSongQuery(input))
  assert.equal(query.text.includes(input), false)
  assert.ok(query.values.some(value => typeof value === "string" && value.includes("\\%\\_")))
  assert.match(query.text, /normalize\(lower\(/)
  assert.doesNotMatch(query.text, /lyrics|password|email/i)
  assert.match(query.text, /LIMIT \$\d+/)
  assert.equal(query.values.at(-1), SEARCH_LIMIT)
})

test("client encodes special query characters and uses abortable fetch", async () => {
  const saved = global.fetch
  try {
    global.fetch = async (url, options) => {
      assert.equal(new URL(url, "https://site.test").searchParams.get("q"), "A&B # +")
      assert.ok(options.signal instanceof AbortSignal)
      return Response.json([])
    }
    assert.deepEqual(await loadSongSearch("A&B # +", new AbortController().signal), [])
  } finally { global.fetch = saved }
})

test("client handles service errors, offline errors and malformed responses", async () => {
  const saved = global.fetch
  try {
    global.fetch = async () => Response.json({ error: "private" }, { status: 503 })
    await assert.rejects(loadSongSearch("zemlja", new AbortController().signal), /Pretraga trenutno nije dostupna/)
    global.fetch = async () => { throw new TypeError("Failed to fetch") }
    await assert.rejects(loadSongSearch("zemlja", new AbortController().signal), /Proveri vezu/)
    global.fetch = async () => Response.json({ wrong: true })
    await assert.rejects(loadSongSearch("zemlja", new AbortController().signal), /Pretraga trenutno nije dostupna/)
    global.fetch = async () => Response.json([null, { id: "broken" }])
    await assert.rejects(loadSongSearch("zemlja", new AbortController().signal), /Pretraga trenutno nije dostupna/)
  } finally { global.fetch = saved }
})

test("client times out an unresponsive request instead of loading forever", async () => {
  const savedFetch = global.fetch
  const savedTimer = global.setTimeout
  try {
    global.setTimeout = (callback, delay, ...args) => savedTimer(callback, delay === 10000 ? 5 : delay, ...args)
    global.fetch = (_url, options) => new Promise((_, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
    })
    await assert.rejects(loadSongSearch("zemlja", new AbortController().signal), /traje predugo/)
  } finally { global.fetch = savedFetch; global.setTimeout = savedTimer }
})

test("client cancellation propagates without showing an error for a replaced query", async () => {
  const saved = global.fetch
  const controller = new AbortController()
  try {
    global.fetch = (_url, options) => new Promise((_, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
    })
    const pending = loadSongSearch("old query", controller.signal)
    controller.abort()
    await assert.rejects(pending, error => error.name === "AbortError")
    await assert.rejects(loadSongSearch("new query", controller.signal), error => error.name === "AbortError")
  } finally { global.fetch = saved }
})
