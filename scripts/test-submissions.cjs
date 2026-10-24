require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const Module = require("node:module")
const path = require("node:path")
const { Prisma } = require("@prisma/client")
const { validateSubmission, validateReview, submissionExample } = require("../lib/submissions/validation.ts")
const valid = { category: "domace", artistName: "Novi bend", title: "Nova pesma", lyrics: submissionExample }
let state, session, serialFailures, databaseFailure, attempts
function matches(record, where) {
  return Object.entries(where).every(([key, value]) => key === "OR" ? value.some(filter => matches(record, filter))
    : value && typeof value === "object" && "gte" in value ? record[key] >= value.gte : record[key] === value)
}
const tx = {
  songSubmission: {
    count: async ({ where }) => state.proposals.filter(item => matches(item, where)).length,
    findFirst: async ({ where }) => state.proposals.find(item => matches(item, where)) ?? null,
    findUnique: async ({ where }) => state.proposals.find(item => item.id === where.id) ?? null,
    create: async ({ data }) => { const record = { ...data, id: "proposal-" + state.proposals.length, status: "pending", createdAt: new Date() }; state.proposals.push(record); return { id: record.id } },
    update: async ({ where, data }) => Object.assign(state.proposals.find(item => item.id === where.id), data),
  },
  artist: {
    findFirst: async ({ where }) => state.artists.find(item => matches(item, where)) ?? null,
    create: async ({ data }) => { const record = { ...data, id: "artist-" + state.artists.length }; state.artists.push(record); return record },
  },
  song: {
    findFirst: async ({ where }) => state.songs.find(item => matches(item, where)) ?? null,
    create: async ({ data }) => { const record = { ...data, id: "song-" + state.songs.length }; state.songs.push(record); return record },
  },
}
const prisma = {
  user: { findUnique: async ({ where }) => { if (databaseFailure) throw new Error("secret-db-url"); return state.users.find(item => item.id === where.id) ?? null } },
  $transaction: async (work, options) => {
    attempts++
    assert.equal(options.isolationLevel, "Serializable")
    if (serialFailures-- > 0) throw new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "test" })
    const snapshot = structuredClone(state)
    try { return await work(tx) } catch (error) { state = snapshot; throw error }
  },
}
const originalLoad = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "@/lib/prisma") return { prisma }
  if (request === "next/cache") return { revalidatePath() {} }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return originalLoad.call(this, request, parent, isMain)
}
let POST, PATCH, server
try {
  server = require("../lib/submissions/server.ts")
  POST = require("../app/api/song-submissions/route.ts").POST
  PATCH = require("../app/api/admin/song-submissions/[id]/route.ts").PATCH
} finally { Module._load = originalLoad }
beforeEach(() => {
  state = { users: [{ id: "user", role: "user", banned: false }, { id: "admin", role: "admin", banned: false }], proposals: [], songs: [], artists: [] }
  session = { user: { id: "user", role: "user" } }; serialFailures = 0; databaseFailure = false; attempts = 0
})
const request = (data, method = "POST", headers = {}) => new Request("https://site.test/api/song-submissions", { method, headers: { "content-type": "application/json", origin: "https://site.test", ...headers }, body: JSON.stringify(data) })
const review = (data, id = "proposal-0") => PATCH(request(data, "PATCH"), { params: Promise.resolve({ id }) })
async function pending() { return server.createSubmission("user", valid) }

test("validation preserves column spacing and normalizes line endings, ignoring injected fields", () => {
  const result = validateSubmission({ ...valid, lyrics: "\n  G       D\r\nPrvi stih neke pesme", status: "approved", userId: "admin" })
  assert.equal(result.lyrics, "  G       D\nPrvi stih neke pesme")
  assert.deepEqual(Object.keys(result).sort(), ["artistName", "category", "lyrics", "title"])
})
test("advanced, slash, flat and lowercase chord forms are accepted", () => {
  for (const chords of ["E(#9) E(b9) Am A7", "E7/B D7/F# Cb6", "am d e7", "B----Em--"]) assert.doesNotThrow(() => validateSubmission({ ...valid, lyrics: chords + "\nOvo je prvi stih moje pesme" }))
})
test("invalid categories, blank names, control characters and missing chords are rejected", () => {
  for (const value of [{ category: "admin" }, { artistName: "" }, { title: "x\nName" }, { lyrics: "Samo tekst bez akorda iznad stiha" }, { lyrics: "G D Em C" }]) assert.throws(() => validateSubmission({ ...valid, ...value }))
})
test("links, HTML, oversized lyrics and long single lines are rejected", () => {
  for (const lyrics of [valid.lyrics + "\nhttps://example.com", valid.lyrics + "<script>alert(1)</script>", "x".repeat(40001), "G\n" + "x".repeat(501)]) assert.throws(() => validateSubmission({ ...valid, lyrics }))
})
test("rejection requires note but does not require valid musical input", () => {
  assert.throws(() => validateReview({ action: "reject", reviewNote: "" }))
  assert.equal(validateReview({ action: "reject", reviewNote: "Nedostaje refren" }).input, null)
  assert.throws(() => validateReview({ ...valid, action: "approve", reviewNote: "x".repeat(1001) }))
})
test("anonymous users cannot submit", async () => { session = null; assert.equal((await POST(request(valid))).status, 401); assert.equal(state.proposals.length, 0) })
test("banned or deleted accounts cannot submit", async () => {
  state.users[0].banned = true; assert.equal((await POST(request(valid))).status, 403)
  state.users = []; assert.equal((await POST(request(valid))).status, 403)
})
test("cross-origin and non-JSON writes are blocked", async () => {
  assert.equal((await POST(request(valid, "POST", { origin: "https://evil.test" }))).status, 403)
  assert.equal((await POST(request(valid, "POST", { "sec-fetch-site": "cross-site" }))).status, 403)
  assert.equal((await POST(request(valid, "POST", { "content-type": "text/plain" }))).status, 415)
})
test("malformed and oversized requests return safe errors", async () => {
  assert.equal((await POST(new Request("https://site.test/api/song-submissions", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).status, 400)
  assert.equal((await POST(request({ ...valid, lyrics: "x".repeat(200001) }))).status, 413)
})
test("a valid submission stays pending and never creates a public song", async () => {
  assert.equal((await POST(request({ ...valid, userId: "admin", status: "approved" }))).status, 201)
  assert.equal(state.proposals[0].userId, "user"); assert.equal(state.proposals[0].status, "pending")
  assert.equal(state.songs.length, 0); assert.equal(state.artists.length, 0)
})
test("duplicate pending submission returns conflict", async () => { await pending(); assert.equal((await POST(request(valid))).status, 409) })
test("five-per-24-hours limit is persisted and all statuses count", async () => {
  for (let i = 0; i < 5; i++) await server.createSubmission("user", { ...valid, title: "Pesma " + i })
  state.proposals[0].status = "rejected"
  assert.equal((await POST(request(valid))).status, 429)
  state.proposals[0].createdAt = new Date(Date.now() - 86400001)
  assert.equal((await POST(request(valid))).status, 201)
})
test("ordinary user cannot approve, including forged session role", async () => {
  await pending(); session.user.role = "admin"
  assert.equal((await review({ ...valid, action: "approve", reviewNote: "" })).status, 403)
  assert.equal(state.songs.length, 0)
})
test("administrator can correct and approve exactly once", async () => {
  await pending(); session = { user: { id: "admin" } }
  const response = await review({ ...valid, title: "Ispravljena pesma", action: "approve", reviewNote: "Ispravljen refren" })
  assert.equal(response.status, 200); assert.equal((await response.json()).href, "/pesme/domace/novi-bend/ispravljena-pesma")
  assert.equal(state.songs.length, 1); assert.equal(state.songs[0].title, "Ispravljena pesma")
  assert.equal(state.proposals[0].status, "approved"); assert.equal(state.proposals[0].reviewerId, "admin")
  assert.equal((await review({ ...valid, action: "approve", reviewNote: "" })).status, 409)
  assert.equal(state.songs.length, 1)
})
test("rejection is private and stores explanation", async () => {
  await pending(); session = { user: { id: "admin" } }
  assert.equal((await review({ action: "reject", reviewNote: "Proveri akorde" })).status, 200)
  assert.equal(state.proposals[0].reviewNote, "Proveri akorde"); assert.equal(state.proposals[0].status, "rejected")
  assert.equal(state.songs.length, 0); assert.equal(state.artists.length, 0)
})
test("existing artist is reused without modifying metadata", async () => {
  state.artists.push({ id: "existing", name: valid.artistName, slug: "novi-bend", category: "domace", bio: "Original" })
  await pending(); session = { user: { id: "admin" } }
  assert.equal((await review({ ...valid, action: "approve", reviewNote: "" })).status, 200)
  assert.equal(state.artists.length, 1); assert.equal(state.artists[0].bio, "Original"); assert.equal(state.songs[0].artistId, "existing")
})
test("category mismatch, duplicate song and unknown proposal cannot publish", async () => {
  state.artists.push({ id: "existing", name: valid.artistName, slug: "novi-bend", category: "strane" })
  await pending(); session = { user: { id: "admin" } }
  const data = { ...valid, action: "approve", reviewNote: "" }
  assert.equal((await review(data)).status, 409)
  state.artists[0].category = "domace"
  state.songs.push({ id: "existing-song", title: valid.title, slug: "legacy-slug", artistId: "existing" })
  assert.equal((await review(data)).status, 409)
  assert.equal((await review(data, "missing")).status, 404)
  assert.equal(state.proposals[0].status, "pending")
})
test("serialization conflicts retry twice, then report unavailable without leaking internals", async () => {
  serialFailures = 2; assert.equal((await POST(request(valid))).status, 201); assert.equal(attempts, 3)
  serialFailures = 3
  const response = await POST(request({ ...valid, title: "Druga pesma" }))
  assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(await response.json()), /conflict|P2034/)
})
test("database outage is not mistaken for successful submission", async () => {
  databaseFailure = true
  const response = await POST(request(valid))
  assert.equal(response.status, 503); assert.doesNotMatch(JSON.stringify(await response.json()), /secret-db-url/)
})
