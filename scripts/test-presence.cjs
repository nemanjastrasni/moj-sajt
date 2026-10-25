/* eslint-disable @typescript-eslint/no-require-imports -- Existing CommonJS module-stub regression pattern. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node", jsx: "react-jsx" } })
const { test, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const Module = require("node:module")
const path = require("node:path")
const { NextResponse } = require("next/server")
const model = require("../lib/presence/model.ts")
const { SubmissionError } = require("../lib/submissions/validation.ts")
const now = Date.now(), visitor = "12345678-1234-4234-8234-123456789012"
const row = (id, user, age, country = "RS") => ({ visitor_id: id, user_id: user, last_seen: new Date(now - age), country_code: country })
let rows, session, admin, down, queries, writes, checks
const prisma = {
  $executeRaw: async (strings, ...values) => { if (down) throw Error("private-db-secret"); writes.push({ sql: strings.join("?"), values }); return 1 },
  $queryRaw: async query => {
    if (down) throw Error("private-db-secret")
    queries.push(query)
    return query.text.includes("COUNT(DISTINCT") ? [{ logged_in: 2, guests: 1 }] : rows
  },
}
const original = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "@/lib/prisma") return { prisma }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request === "@/lib/adminSongs/server") return {
    requireSongAdmin: async () => { checks++; if (!admin) throw new SubmissionError(session ? 403 : 401, "Denied"); return { id: "admin" } },
    adminSongFailure: error => NextResponse.json({ error: error instanceof SubmissionError ? error.message : "Unavailable" }, { status: error.status || 503 }),
  }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, isMain)
}
let server, route, adminRoute
try {
  server = require("../lib/presence/server.ts")
  route = require("../app/api/online/route.ts")
  adminRoute = require("../app/api/admin/online/route.ts")
} finally { Module._load = original }
beforeEach(() => { rows = [row(visitor, "u1", 10000), row("device2", "u1", 20000, "DE"), row("device3", "u2", 10000), row("guest", null, 30000), row("stale", null, 180000)]; session = null; admin = false; down = false; queries = []; writes = []; checks = 0 })

test("one user on two devices counts once, guests by browser, and totals always add up", () => {
  const result = model.presenceSnapshot(rows, now)
  assert.deepEqual(model.publicPresence(result), { total: 3, loggedIn: 2, guests: 1, checkedAt: new Date(now).toISOString() })
  assert.deepEqual(result.users.u1.countries, ["RS", "DE"])
  assert.equal(result.users.u1.lastSeen, new Date(now - 10000).toISOString())
  assert.ok(model.validSnapshot(result))
  assert.equal(Object.getPrototypeOf(result.users), Object.prototype, "Next server-to-client props require plain objects")
})
test("inactive rows, duplicates, malformed dates and expired countries do not remain online", () => {
  const result = model.presenceSnapshot([row("a", "u1", 180000), row("a", "u1", 200000), row("b", null, 700000), { ...row("bad", null, 0), last_seen: "invalid" }], now)
  assert.equal(result.total, 0)
  assert.equal(result.users.u1.online, false)
  assert.deepEqual(result.users.u1.countries, [])
  assert.deepEqual(result.visitors, [])
})
test("valid country codes have localized names; arbitrary locations and unknown codes are rejected", () => {
  assert.equal(model.countryCode(" rs "), "RS")
  assert.equal(model.countryName("RS"), "Srbija")
  assert.equal(model.countryName("RS", "en"), "Serbia")
  for (const country of [null, undefined, "XX", "ZZ", "EU", "<script>", "Serbia", "RS\nDE", "192.0.2.1"]) assert.equal(model.countryCode(country), null)
})
test("public projection includes no user IDs, countries, guest identifiers or private snapshot data", () => {
  const safe = model.publicPresence(model.presenceSnapshot(rows, now))
  assert.deepEqual(Object.keys(safe).sort(), ["checkedAt", "guests", "loggedIn", "total"])
  assert.doesNotMatch(JSON.stringify(safe), /RS|visitor_id|u1|country/)
  assert.equal(model.validCounts({ ...safe, total: 10 }), false)
  assert.equal(model.validSnapshot({ ...safe, users: {}, visitors: [] }), false)
})
test("public SQL deduplicates user accounts and uses the same active cutoff and user validity rules", async () => {
  const response = await route.GET()
  assert.equal(response.status, 200)
  const data = await response.json()
  assert.equal(data.total, data.loggedIn + data.guests)
  assert.deepEqual(Object.keys(data).sort(), ["checkedAt", "guests", "loggedIn", "total"])
  assert.match(queries[0].text, /COUNT\(DISTINCT user_id\)/)
  assert.match(queries[0].text, /NOT u.banned/)
  assert.ok(queries[0].values[0] instanceof Date)
  assert.match(response.headers.get("cache-control"), /no-store/)
})
test("admin endpoint rechecks current admin access and never queries presence for forbidden users", async () => {
  for (const identity of [null, { user: { id: "user", role: "admin" } }]) {
    session = identity
    const response = await adminRoute.GET()
    assert.equal(response.status, identity ? 403 : 401)
    assert.equal(queries.length, 0)
    assert.equal(writes.length, 0)
    assert.match(response.headers.get("cache-control"), /private/)
  }
  assert.equal(checks, 2)
})
test("admin snapshot masks visitor cookie values, includes countries and recent activity only", async () => {
  admin = true
  const response = await adminRoute.GET(), data = await response.json()
  assert.equal(response.status, 200)
  assert.equal(data.total, 3)
  assert.equal(data.users.u1.online, true)
  assert.deepEqual(data.users.u1.countries, ["RS", "DE"])
  assert.notEqual(data.visitors[0].id, "guest")
  assert.doesNotMatch(JSON.stringify(data), new RegExp(visitor))
  assert.equal(checks, 1)
})
test("heartbeat trusts the session identity, validates cookies and never stores IP or city", async () => {
  session = { user: { id: "u1" } }
  const previous = process.env.VERCEL; process.env.VERCEL = "1"
  try {
    const response = await route.POST(new Request("https://site.test/api/online", { method: "POST", headers: { origin: "https://site.test", cookie: `ga_visitor=${visitor}`, "x-vercel-ip-country": "RS", "x-vercel-ip-city": "Private City", "x-forwarded-for": "192.0.2.1" } }))
    assert.equal(response.status, 200)
    const insert = writes.find(write => write.sql.includes("INSERT"))
    assert.deepEqual(insert.values, [visitor, "u1", "RS"])
    assert.doesNotMatch(JSON.stringify(writes), /Private City|192\.0\.2\.1/)
    assert.match(response.headers.get("set-cookie"), /HttpOnly/)
    assert.match(response.headers.get("set-cookie"), /Secure/)
    assert.match(response.headers.get("set-cookie"), /Max-Age=1800/)
  } finally { if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous }
})
test("logout replaces the same visitor's user ID with null and untrusted local geo headers are ignored", async () => {
  const previous = process.env.VERCEL; delete process.env.VERCEL
  try {
    await route.POST(new Request("https://site.test/api/online", { method: "POST", headers: { cookie: `ga_visitor=${visitor}`, "x-vercel-ip-country": "RS" } }))
    assert.deepEqual(writes.find(write => write.sql.includes("INSERT")).values, [visitor, null, null])
  } finally { if (previous !== undefined) process.env.VERCEL = previous }
  assert.notEqual(server.visitorId("malicious-cookie"), "malicious-cookie")
})
test("cross-site writes are refused and service failures are unavailable, never fake zero counts", async () => {
  assert.equal((await route.POST(new Request("https://site.test/api/online", { method: "POST", headers: { origin: "https://evil.test" } }))).status, 403)
  assert.equal(writes.length, 0)
  down = true
  const response = await route.GET(), data = await response.json()
  assert.equal(response.status, 503)
  assert.equal(data.total, undefined)
  assert.doesNotMatch(JSON.stringify(data), /private-db-secret/)
})
