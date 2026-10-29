/* eslint-disable @typescript-eslint/no-require-imports -- Isolated API and client fixtures, no live writes. */
require("ts-node").register({ transpileOnly: true, compilerOptions: { module: "CommonJS", moduleResolution: "Node" } })
const { test, beforeEach } = require("node:test"), assert = require("node:assert/strict"), path = require("node:path"), Module = require("node:module")
const { tutorialInput, isTutorialSnapshot } = require("../lib/tutorials/model.ts"), { tutorialRequest } = require("../lib/tutorials/client.ts")
let users, session, saved, songExists, fail, revoke, failWrite, locks
const pick = (row, select) => row ? Object.fromEntries(Object.keys(select).map(key => [key, row[key]])) : null
const prisma = {
  user: { findUnique: async ({ where }) => { if (fail) throw Error("private-connection-secret"); return users.find(user => user.id === where.id) ?? null } },
  song: { findUnique: async () => { if (fail) throw Error("private-connection-secret"); return songExists ? { id: "song" } : null } },
  songTutorial: {
    findUnique: async ({ select }) => pick(saved, select),
    upsert: async ({ create, update, select }) => { if (failWrite) throw Error("write failure"); saved = saved ? { ...saved, ...update } : { ...create }; return pick(saved, select) },
    delete: async () => { if (failWrite) throw Error("write failure"); saved = null },
  },
  $queryRaw: async query => { locks.push(query); return songExists ? [{ id: "song" }] : [] },
  $transaction: async work => { const before = structuredClone(saved); if (revoke) users[0].role = "user"; try { return await work(prisma) } catch (error) { saved = before; throw error } },
}
const original = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "@/lib/prisma") return { prisma }
  if (request === "@/lib/auth") return { authOptions: {} }
  if (request === "next-auth") return { getServerSession: async () => session }
  if (request.startsWith("@/")) request = path.join(__dirname, "..", request.slice(2))
  return original.call(this, request, parent, isMain)
}
let route
try { route = require("../app/api/songs/[id]/tutorial/route.ts") } finally { Module._load = original }
beforeEach(() => { users = [{ id: "admin", role: "admin", banned: false }, { id: "user", role: "user", banned: false }]; session = { user: { id: "admin", role: "admin" } }; saved = null; songExists = true; fail = revoke = failWrite = false; locks = [] })
const context = { params: Promise.resolve({ id: "song" }) }
const request = (method = "PUT", body = {}, headers = {}) => new Request("https://site.test/api/songs/song/tutorial", { method, ...(method === "GET" ? {} : { body: JSON.stringify(body) }), headers: { "content-type": "application/json", origin: "https://site.test", ...headers } })
const payload = (expectedVersion = null, url = "https://www.youtube.com/shorts/AAAAAAAAAAA") => ({ expectedVersion, url, title: "  Lekcija  ", actorId: "forged" })

test("tutorial input only accepts exact safe YouTube videos/Shorts and opaque revisions", () => {
  assert.deepEqual(tutorialInput(payload()), { expectedVersion: null, videoId: "AAAAAAAAAAA", title: "Lekcija" })
  for (const url of ["javascript:alert(1)", "http://youtube.com/watch?v=AAAAAAAAAAA", "https://youtube.com.evil.test/watch?v=AAAAAAAAAAA", "https://www.youtube.com/playlist?list=PLaaaaaaaaaaa", "https://youtu.be/bad"]) assert.throws(() => tutorialInput(payload(null, url)))
  assert.throws(() => tutorialInput({ ...payload(), expectedVersion: "old" }))
  assert.throws(() => tutorialInput({ ...payload(), title: "x".repeat(121) }))
  assert.throws(() => tutorialInput({ ...payload(), title: "line\nbreak" }))
})
test("anonymous, ordinary, banned, deleted and forged-role actors cannot mutate tutorials", async () => {
  for (const actor of [null, { id: "user", role: "admin" }, { id: "missing", role: "admin" }, { id: "admin", role: "admin", banned: true }]) {
    session = actor ? { user: actor } : null
    users[0].banned = Boolean(actor?.banned)
    for (const method of ["PUT", "DELETE"]) {
      const response = await route[method](request(method, payload()), context)
      assert.ok([401, 403].includes(response.status)); assert.equal(saved, null)
    }
  }
})
test("cross-site, non-JSON, invalid IDs and invalid payloads fail before writes", async () => {
  assert.equal((await route.PUT(request("PUT", payload(), { origin: "https://evil.test" }), context)).status, 403)
  assert.equal((await route.PUT(request("PUT", payload(), { "sec-fetch-site": "cross-site" }), context)).status, 403)
  assert.equal((await route.PUT(request("PUT", payload(), { "content-type": "text/plain" }), context)).status, 415)
  assert.equal((await route.PUT(request("PUT", payload()), { params: Promise.resolve({ id: "../song" }) })).status, 400)
  assert.equal((await route.PUT(request("PUT", payload(null, "https://evil.test")), context)).status, 400)
  assert.equal(saved, null)
})
test("current admins can add/edit/remove only the tutorial, with fresh rights and row serialization", async () => {
  let response = await route.PUT(request("PUT", payload()), context)
  assert.equal(response.status, 200)
  const added = await response.json()
  assert.equal(isTutorialSnapshot(added, "song"), true)
  assert.equal(saved.updatedById, "admin"); assert.equal(added.tutorial.updatedById, undefined)
  assert.match(locks[0].text, /FOR UPDATE/)
  response = await route.PUT(request("PUT", { ...payload(added.tutorial.version, "https://youtu.be/BBBBBBBBBBB"), title: "Druga lekcija" }), context)
  assert.equal(response.status, 200)
  const edited = await response.json()
  assert.equal(edited.tutorial.videoId, "BBBBBBBBBBB"); assert.notEqual(edited.tutorial.version, added.tutorial.version)
  assert.equal((await route.DELETE(request("DELETE", { expectedVersion: edited.tutorial.version }), context)).status, 200)
  assert.equal(saved, null); assert.equal(songExists, true)
  await route.PUT(request("PUT", payload()), context)
  assert.notEqual(saved.version, added.tutorial.version, "delete/recreate cannot reuse the stale revision")
})
test("public reads expose only the video DTO; current database admin status controls editability", async () => {
  await route.PUT(request("PUT", payload()), context)
  for (const actor of [null, { id: "user", role: "admin" }]) {
    session = actor ? { user: actor } : null
    const response = await route.GET(request("GET"), context), data = await response.json()
    assert.equal(data.editable, false); assert.deepEqual(Object.keys(data.tutorial).sort(), ["title", "version", "videoId"])
    assert.equal(response.headers.get("cache-control"), "private, no-store"); assert.equal(response.headers.get("vary"), "Cookie")
  }
})
test("stale saves/deletes do not overwrite another edit, while deleted songs stay missing", async () => {
  await route.PUT(request("PUT", payload()), context)
  const before = structuredClone(saved)
  assert.equal((await route.PUT(request("PUT", payload()), context)).status, 409)
  assert.equal((await route.DELETE(request("DELETE", { expectedVersion: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }), context)).status, 409)
  assert.deepEqual(saved, before)
  songExists = false
  assert.equal((await route.PUT(request("PUT", payload(before.version)), context)).status, 404)
  assert.equal((await route.GET(request("GET"), context)).status, 404)
})
test("revoked rights and transactional failures cannot become successful saves", async () => {
  revoke = true
  assert.equal((await route.PUT(request("PUT", payload()), context)).status, 403); assert.equal(saved, null)
  users[0].role = "admin"; revoke = false; failWrite = true
  assert.equal((await route.PUT(request("PUT", payload()), context)).status, 503); assert.equal(saved, null)
  failWrite = false; fail = true
  const response = await route.GET(request("GET"), context)
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes("private-connection"))
})
test("client rejects malformed snapshots, wrong save confirmations, uncertain results and timeouts", async () => {
  const fetch = global.fetch, timer = global.setTimeout
  const valid = { songId: "song", editable: true, tutorial: { videoId: "AAAAAAAAAAA", title: "Lekcija", version: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" } }
  try {
    global.fetch = async () => Response.json(valid)
    assert.equal((await tutorialRequest("song", "PUT", payload())).tutorial.videoId, "AAAAAAAAAAA")
    global.fetch = async () => Response.json({ ...valid, tutorial: { ...valid.tutorial, videoId: "BBBBBBBBBBB" } })
    await assert.rejects(tutorialRequest("song", "PUT", payload()), /Odgovor nije/)
    global.fetch = async () => Response.json(valid)
    await assert.rejects(tutorialRequest("song", "DELETE", { expectedVersion: valid.tutorial.version }), /Odgovor nije/)
    global.fetch = async () => Response.json({ ...valid, songId: "other" })
    await assert.rejects(tutorialRequest("song"), /Odgovor nije/)
    global.setTimeout = (fn, ms, ...args) => timer(fn, ms === 15000 ? 5 : ms, ...args)
    global.fetch = (_url, options) => new Promise((_, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))))
    await assert.rejects(tutorialRequest("song"), /traje predugo/)
  } finally { global.fetch = fetch; global.setTimeout = timer }
})
