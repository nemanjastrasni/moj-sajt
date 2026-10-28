/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CommonJS API/client tests. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const Module = require("node:module"), path = require("node:path")
const React = require("react"), { renderToStaticMarkup } = require("react-dom/server"), cheerio = require("cheerio")
const { Prisma } = require("@prisma/client")
const model = require("../lib/songReports/model.ts")
const client = require("../lib/songReports/client.ts")
let state, session, down, attempts, serialFailures, revokeBeforeTx, loseUpdate, cacheFailure, listArgs
const match = (row, where) => Object.entries(where || {}).every(([key, value]) => key === "createdAt" ? row.createdAt >= value.gte : value instanceof Date ? row[key].getTime() === value.getTime() : row[key] === value)
const prisma = {
  user: { findUnique: async ({ where }) => { if (down) throw Error("postgres://private-credentials"); return structuredClone(state.users.find(user => user.id === where.id) ?? null) } },
  song: { findUnique: async ({ where }) => structuredClone(state.songs.find(song => song.id === where.id) ?? null) },
  songReport: {
    count: async ({ where }) => { if (down) throw Error("private failure"); return state.reports.filter(row => match(row, where)).length },
    findFirst: async ({ where }) => structuredClone(state.reports.find(row => match(row, where)) ?? null),
    findUnique: async ({ where }) => structuredClone(state.reports.find(row => row.id === where.id) ?? null),
    create: async ({ data }) => {
      if (state.reports.some(row => row.userId === data.userId && row.songId === data.songId && row.kind === data.kind && row.status === "pending")) throw new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "test" })
      const row = { id: "report-" + (state.reports.length + 1), status: "pending", createdAt: new Date(), updatedAt: new Date(), reviewedAt: null, reviewNote: null, reviewerId: null, ...data }
      state.reports.push(row); return { id: row.id, status: row.status }
    },
    updateMany: async ({ where, data }) => {
      if (loseUpdate) return { count: 0 }
      const row = state.reports.find(item => match(item, where))
      if (!row) return { count: 0 }
      Object.assign(row, data); return { count: 1 }
    },
    findMany: async args => {
      listArgs = args
      return state.reports.filter(row => match(row, args.where)).sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)).slice(args.skip, args.skip + args.take).map(row => ({ ...structuredClone(row),
        user: state.users.find(user => user.id === row.userId) ? { name: state.users.find(user => user.id === row.userId).name } : null,
        song: structuredClone(state.songs.find(song => song.id === row.songId) ?? null),
      }))
    },
  },
  $transaction: async (work, options) => {
    assert.equal(options.isolationLevel, "Serializable"); attempts++
    if (serialFailures-- > 0) throw new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "test" })
    if (revokeBeforeTx) { state.users.find(user => user.id === session.user.id).banned = true }
    const before = structuredClone(state)
    try { return await work(prisma) } catch (error) { state = before; throw error }
  },
}
const load = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "next-auth/react") return { useSession: () => ({ data: session, status: session ? "authenticated" : "unauthenticated" }) }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "@/lib/prisma") return { prisma }
  if (request === "next/navigation") return { useRouter: () => ({ push() {}, refresh() {} }), usePathname: () => "/pesme/domace/band/song" }
  if (request === "next/link") return { __esModule: true, default: props => { const dom = { ...props }; delete dom.prefetch; return React.createElement("a", dom) } }
  if (request === "next/cache") return { revalidatePath() { if (cacheFailure) throw Error("cache failure") } }
  if (request.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return load.call(this, request, parent, isMain)
}
let server, createRoute, listRoute, reviewRoute, ReportButton, AdminReports
try {
  server = require("../lib/songReports/server.ts")
  createRoute = require("../app/api/song-reports/route.ts")
  listRoute = require("../app/api/admin/song-reports/route.ts")
  reviewRoute = require("../app/api/admin/song-reports/[id]/route.ts")
  ReportButton = require("../app/components/SongReportButton.tsx").default
  AdminReports = require("../app/components/AdminSongReports.tsx").default
} finally { Module._load = load }
beforeEach(() => {
  state = { users: [{ id: "user", role: "user", name: "Reporter", banned: false, email: "private@example.com" }, { id: "admin", role: "admin", name: "Admin", banned: false }],
    songs: [{ id: "song", title: "Original Song", slug: "original-song", category: "domace", lyrics: "G     D\nOriginal verse", chords: null, artist: { name: "Original Band", slug: "original-band", category: "domace" } }],
    reports: [], reviews: [{ songId: "song", status: "verified" }], favorites: [{ songId: "song", transpose: 2 }], playlistSongs: [{ songId: "song" }] }
  session = { user: { id: "user", role: "user" } }; down = revokeBeforeTx = loseUpdate = cacheFailure = false; attempts = serialFailures = 0; listArgs = null
})
const input = () => ({ songId: "song", kind: "layout", description: "Second verse, second line", songVersion: require("node:crypto").createHash("sha256").update(JSON.stringify([state.songs[0].lyrics, state.songs[0].chords])).digest("hex"), transpose: 2 })
const req = (data, method = "POST", headers = {}) => new Request("https://site.test/api/song-reports", { method, headers: { origin: "https://site.test", "content-type": "application/json", ...headers }, body: JSON.stringify(data) })
const ctx = id => ({ params: Promise.resolve({ id }) })
const admin = () => { session = { user: { id: "admin", role: "user" } } }
async function create() { const response = await createRoute.POST(req(input())); assert.equal(response.status, 201); return state.reports.at(-1) }
const review = (row, status = "resolved", note = "Fixed placement") => ({ status, note, version: server.reportVersion(row) })

test("four explicit error categories, bounded plain text and transpose validate without trusting injected fields", () => {
  assert.deepEqual(model.reportKinds, ["wrong_chord", "layout", "lyrics", "duplicate"])
  for (const kind of model.reportKinds) assert.equal(model.validateReport({ ...input(), kind }).kind, kind)
  const parsed = model.validateReport({ ...input(), description: "  Some text\r\non two lines  ", userId: "admin", status: "resolved", title: "Forged" })
  assert.equal(parsed.description, "Some text\non two lines"); assert.deepEqual(Object.keys(parsed).sort(), ["description", "kind", "songId", "songVersion", "transpose"])
  assert.equal(model.validateReport({ ...input(), description: "😀".repeat(10) }).description.length, 20)
  for (const patch of [{ kind: "__proto__" }, { songId: "../song" }, { description: "short" }, { description: "a".repeat(2001) }, { description: "bad\u0000content here" }, { songVersion: "old" }, { transpose: "2" }, { transpose: 12 }, { transpose: -12 }]) assert.throws(() => model.validateReport({ ...input(), ...patch }))
  for (const bad of [null, [], true]) assert.throws(() => model.validateReport(bad))
})

test("moderation needs a known state, exact version and a dismissal reason", () => {
  assert.throws(() => model.validateReportReview({ status: "dismissed", note: "", version: "a".repeat(64) }))
  for (const status of model.reportStatuses) assert.equal(model.validateReportReview({ status, note: "Reviewed", version: "a".repeat(64), role: "admin" }).status, status)
  for (const patch of [{ status: "approved" }, { version: "old" }, { note: "a".repeat(1001) }, { note: "bad\u0001note" }]) assert.throws(() => model.validateReportReview({ status: "resolved", version: "a".repeat(64), note: "", ...patch }))
})

test("anonymous, banned and deleted accounts cannot report; fresh account state is authoritative", async () => {
  for (const actor of [null, "missing", "user"]) {
    session = actor ? { user: { id: actor, role: "admin" } } : null; state.users[0].banned = actor === "user"
    assert.ok([401, 403].includes((await createRoute.POST(req(input()))).status))
    assert.equal(state.reports.length, 0)
  }
})

test("cross-origin, non-JSON, malformed and oversized request bodies cannot write", async () => {
  assert.equal((await createRoute.POST(req(input(), "POST", { origin: "https://evil.test" }))).status, 403)
  assert.equal((await createRoute.POST(req(input(), "POST", { "sec-fetch-site": "cross-site" }))).status, 403)
  assert.equal((await createRoute.POST(req(input(), "POST", { "content-type": "text/plain" }))).status, 415)
  assert.equal((await createRoute.POST(new Request("https://site.test/api/song-reports", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status, 400)
  assert.equal((await createRoute.POST(req(input(), "POST", { "content-length": "17000" }))).status, 413)
  assert.equal((await createRoute.POST(req({ ...input(), description: "x".repeat(17000) }))).status, 413)
  assert.equal(state.reports.length, 0)
})

test("report snapshots use real song identity and record original content version and displayed key", async () => {
  const before = structuredClone(state)
  const response = await createRoute.POST(req({ ...input(), userId: "admin", songTitle: "Forged", artistName: "Forged", status: "resolved", reviewNote: "Forged" }))
  assert.equal(response.status, 201); assert.equal(response.headers.get("cache-control"), "no-store")
  const row = state.reports[0]
  assert.equal(row.songTitle, "Original Song"); assert.equal(row.artistName, "Original Band"); assert.equal(row.userId, "user"); assert.equal(row.status, "pending"); assert.equal(row.transpose, 2); assert.equal(row.songVersion, input().songVersion)
  assert.deepEqual({ ...state, reports: [] }, before)
})

test("a missing song or a stale open-page version is rejected without a report or review changes", async () => {
  const before = structuredClone(state)
  assert.equal((await createRoute.POST(req({ ...input(), songId: "missing" }))).status, 404)
  assert.equal((await createRoute.POST(req({ ...input(), songVersion: "a".repeat(64) }))).status, 409)
  assert.deepEqual(state, before)
})

test("duplicate pending reports are blocked per user/song/kind but different types can be reported", async () => {
  await create()
  assert.equal((await createRoute.POST(req(input()))).status, 409)
  assert.equal((await createRoute.POST(req({ ...input(), kind: "wrong_chord" }))).status, 201)
  assert.equal(state.reports.length, 2)
})

test("ten-per-24-hours limit includes already resolved/dismissed reports", async () => {
  for (let i = 0; i < 10; i++) state.reports.push({ id: "old-" + i, userId: "user", createdAt: new Date(), status: i % 2 ? "resolved" : "dismissed" })
  assert.equal((await createRoute.POST(req(input()))).status, 429)
  state.reports[0].createdAt = new Date(Date.now() - 86400001)
  assert.equal((await createRoute.POST(req(input()))).status, 201)
})

test("ban after initial authorization is rechecked inside creation transaction", async () => {
  revokeBeforeTx = true
  assert.equal((await createRoute.POST(req(input()))).status, 403)
  assert.equal(state.reports.length, 0)
})

test("reports and their private content can only be listed by a fresh non-banned admin", async () => {
  await create()
  for (const actor of [null, "user", "missing"]) {
    session = actor ? { user: { id: actor, role: "admin" } } : null
    const response = await listRoute.GET(new Request("https://site.test/api/admin/song-reports"))
    assert.ok([401, 403].includes(response.status)); assert.ok(!(await response.text()).includes("Second verse"))
  }
  admin(); state.users[1].banned = true
  assert.equal((await listRoute.GET(new Request("https://site.test/api/admin/song-reports"))).status, 403)
})

test("admin list is bounded, filters and clamps pages, and omits email/content/hash/account identifiers", async () => {
  await create(); admin()
  const response = await listRoute.GET(new Request("https://site.test/api/admin/song-reports?status=pending&kind=layout&page=9999"))
  assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store")
  const data = await response.json()
  assert.equal(data.page, 1); assert.equal(data.items.length, 1); assert.equal(listArgs.take, 20); assert.deepEqual(listArgs.where, { status: "pending", kind: "layout" })
  assert.deepEqual(listArgs.select.user.select, { name: true })
  const row = data.items[0]
  assert.equal(row.songHref, "/pesme/domace/original-band/original-song"); assert.equal(row.editHref, "/admin/songs/song/edit?from=song"); assert.equal(row.songChanged, false)
  for (const key of ["userId", "email", "songVersion", "lyrics", "chords", "reviewerId"]) assert.equal(row[key], undefined)
  assert.equal(data.items[0].reporter, "Reporter")
})

test("changed and deleted songs are distinguished, while report snapshots remain readable", async () => {
  await create(); admin(); state.songs[0].lyrics += " changed"
  let list = await server.listSongReports(model.reportFilters({}))
  assert.equal(list.items[0].songChanged, true)
  state.songs = []; state.users = state.users.filter(user => user.id !== "user")
  list = await server.listSongReports(model.reportFilters({}))
  assert.equal(list.items[0].songHref, null); assert.equal(list.items[0].title, "Original Song"); assert.equal(list.items[0].reporterDeleted, true)
})

test("regular users, forged admin roles and revoked accounts cannot moderate", async () => {
  const row = await create()
  assert.equal((await reviewRoute.PATCH(req(review(row), "PATCH"), ctx(row.id))).status, 403)
  session.user.role = "admin"
  assert.equal((await reviewRoute.PATCH(req(review(row), "PATCH"), ctx(row.id))).status, 403)
  admin(); revokeBeforeTx = true
  assert.equal((await reviewRoute.PATCH(req(review(row), "PATCH"), ctx(row.id))).status, 403)
  assert.equal(state.reports[0].status, "pending")
})

test("admin resolves and reopens only the report, never marking or editing the song", async () => {
  const row = await create(), before = structuredClone({ songs: state.songs, reviews: state.reviews, favorites: state.favorites, playlistSongs: state.playlistSongs }); admin()
  assert.equal((await reviewRoute.PATCH(req(review(row), "PATCH"), ctx(row.id))).status, 200)
  assert.equal(state.reports[0].status, "resolved"); assert.equal(state.reports[0].reviewerId, "admin"); assert.ok(state.reports[0].reviewedAt instanceof Date)
  assert.equal((await reviewRoute.PATCH(req(review(state.reports[0], "pending", "Recheck"), "PATCH"), ctx(row.id))).status, 200)
  assert.equal(state.reports[0].reviewedAt, null)
  assert.deepEqual({ songs: state.songs, reviews: state.reviews, favorites: state.favorites, playlistSongs: state.playlistSongs }, before)
})

test("stale moderation versions, missing reports and lost CAS updates fail safely", async () => {
  const row = await create(); admin()
  const old = review(row)
  assert.equal((await reviewRoute.PATCH(req(old, "PATCH"), ctx(row.id))).status, 200)
  assert.equal((await reviewRoute.PATCH(req(old, "PATCH"), ctx(row.id))).status, 409)
  assert.equal((await reviewRoute.PATCH(req(old, "PATCH"), ctx("missing"))).status, 404)
  loseUpdate = true
  assert.equal((await reviewRoute.PATCH(req(review(state.reports[0], "dismissed", "Not reproduced"), "PATCH"), ctx(row.id))).status, 409)
  assert.equal(state.reports[0].status, "resolved")
})

test("serialization retries are bounded and cache errors cannot turn a saved report into failure", async () => {
  serialFailures = 2; cacheFailure = true
  assert.equal((await createRoute.POST(req(input()))).status, 201); assert.equal(attempts, 3)
  state.reports = []; attempts = 0; serialFailures = 3
  assert.equal((await createRoute.POST(req(input()))).status, 503); assert.equal(attempts, 3); assert.equal(state.reports.length, 0)
})

test("database outages never leak secrets or masquerade as an empty successful list", async () => {
  down = true
  const response = await createRoute.POST(req(input()))
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /postgres|private-credentials/)
  admin(); const list = await listRoute.GET(new Request("https://site.test/api/admin/song-reports"))
  assert.equal(list.status, 503)
})

test("invalid query filters normalize predictably without array/prototype coercion", () => {
  assert.deepEqual(model.reportFilters({ status: ["resolved"], kind: "__proto__", page: "Infinity" }), { status: "pending", kind: "", page: 1 })
  assert.deepEqual(model.reportFilters({ status: "dismissed", kind: "duplicate", page: "99999" }), { status: "dismissed", kind: "duplicate", page: 10000 })
})

test("client rejects partial/HTML/wrong-shaped successes and preserves useful 409/401 errors", async () => {
  const originalFetch = global.fetch
  try {
    for (const value of [null, {}, { id: "report", status: "resolved" }, { id: "../bad", status: "pending" }]) {
      global.fetch = async () => Response.json(value)
      await assert.rejects(client.reportRequest("/api/song-reports", "POST", input()), /Odgovor prijave/)
    }
    global.fetch = async () => new Response("<html>fail</html>")
    await assert.rejects(client.reportRequest("/api/song-reports", "POST", input()), /Odgovor prijave/)
    for (const status of [401, 409]) {
      global.fetch = async () => Response.json({ error: "Safe error" }, { status })
      await assert.rejects(client.reportRequest("/api/song-reports", "POST", input()), error => error instanceof client.ReportRequestError && error.status === status && error.message === "Safe error")
    }
    global.fetch = async (_, options) => { assert.equal(options.credentials, "same-origin"); assert.deepEqual(JSON.parse(options.body), input()); return Response.json({ id: "report", status: "pending" }) }
    assert.deepEqual(await client.reportRequest("/api/song-reports", "POST", input()), { id: "report", status: "pending" })
  } finally { global.fetch = originalFetch }
})

test("client cancellation and bounded timeout do not claim an uncertain write succeeded", async () => {
  const originalFetch = global.fetch, originalTimeout = global.setTimeout
  try {
    global.fetch = async (_, { signal }) => new Promise((_, reject) => { if (signal.aborted) reject(new DOMException("Aborted", "AbortError")); else signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true }) })
    const controller = new AbortController(); controller.abort()
    await assert.rejects(client.reportRequest("/api/song-reports", "POST", input(), controller.signal), error => error.name === "AbortError")
    global.setTimeout = (callback, ms) => { assert.equal(ms, 15000); return originalTimeout(callback, 1) }
    await assert.rejects(client.reportRequest("/api/song-reports", "POST", input()), /mozda sacuvana/)
  } finally { global.fetch = originalFetch; global.setTimeout = originalTimeout }
})

test("report button is available to guests and members; admin descriptions are escaped", async () => {
  const props = { songId: "song", songVersion: input().songVersion, title: "Song", artist: "Band", transpose: 2 }
  for (const actor of [null, { user: { id: "user" } }]) {
    session = actor
    const $ = cheerio.load(renderToStaticMarkup(React.createElement(ReportButton, props)))
    assert.equal($("button").text(), "Prijavi gresku"); assert.equal($("button").attr("aria-haspopup"), "dialog")
  }
  session = { user: { id: "user", role: "user" } }; await create(); admin()
  state.reports[0].description = "<script>unsafe()</script>"; state.users[0].name = "<b>Reporter</b>"
  const data = await server.listSongReports(model.reportFilters({}))
  const $ = cheerio.load(renderToStaticMarkup(React.createElement(AdminReports, { data, filters: model.reportFilters({}) })))
  assert.equal($("script, b").length, 0); assert.ok($(".description").text().includes("<script>unsafe()</script>")); assert.ok($(".meta").text().includes("<b>Reporter</b>"))
})
