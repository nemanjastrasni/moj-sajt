require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "CommonJS", moduleResolution: "Node" },
})

const { test, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const path = require("node:path")
const Module = require("node:module")
const bcrypt = require("bcrypt")
const root = path.resolve(__dirname, "..")
const { validateSignup, normalizeEmail, getPasswordError, MAX_AVATAR_BYTES } = require("../lib/auth/validation.ts")
const { safeCallbackUrl, authErrorMessage, withAuthTimeout } = require("../lib/auth/navigation.ts")
const { readLimitedJson } = require("../lib/auth/request.ts")
const { getGoogleCredentials } = require("../lib/auth/google.ts")

let state
const calls = []
const prisma = {
  user: {
    async findUnique(args) { calls.push(["findUser", args]); if (state.failure) throw state.failure; return state.user },
    async create(args) { calls.push(["createUser", args]); if (state.createFailure) throw state.createFailure; return { id: "new-user" } },
    async updateMany(args) { calls.push(["updateUsers", args]); return { count: state.count } },
  },
  account: {
    async findUnique(args) { calls.push(["findAccount", args]); return state.linked },
    async findFirst() { return state.otherAccount },
    async create(args) { calls.push(["createAccount", args]); return { id: "account", ...args.data } },
  },
  async $transaction(callback) { return callback(prisma) },
}
const originalLoad = Module._load
Module._load = function(request, parent, isMain) {
  if (request === "@/lib/prisma") return { prisma }
  if (request === "next-auth") return { getServerSession: async () => state.session }
  if (request.startsWith("@/")) request = path.join(root, request.slice(2))
  return originalLoad.call(this, request, parent, isMain)
}
let authOptions, signup, debugUsers, ban
try {
  authOptions = require("../lib/auth.ts").authOptions
  signup = require("../app/api/signup/route.ts").POST
  debugUsers = require("../app/api/debug/users/route.ts").GET
  ban = require("../app/api/admin/users/ban/route.ts").POST
} finally {
  Module._load = originalLoad
}
const authorize = authOptions.providers.find(provider => provider.id === "credentials").options.authorize
const baseUser = { id: "user-1", email: "test@example.com", name: "Test", image: null, role: "user", banned: false }
const baseSignup = { name: " Test ", email: " TEST@EXAMPLE.COM ", password: "valid-password" }
const passwordHash = bcrypt.hashSync(baseSignup.password, 4)
const googleAccount = { provider: "google", providerAccountId: "google-sub", type: "oauth" }
function googleSignIn(profile = {}, account = googleAccount) {
  return authOptions.callbacks.signIn({
    user: { id: "google-sub", email: "test@gmail.com", name: "Test" }, account,
    profile: { sub: "google-sub", email: "test@gmail.com", email_verified: true, ...profile },
  })
}
function request(body, headers = {}) {
  return new Request("https://site.test/api/signup", {
    method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
  })
}
beforeEach(() => {
  calls.length = 0
  state = { user: null, linked: null, otherAccount: null, session: null, count: 1 }
})

test("signup normalizes email and preserves optional profile values", () => {
  const result = validateSignup({ ...baseSignup, city: " Nis ", country: " Srbija ", birthYear: "1990", image: "/avatars/page.png", role: "admin" })
  assert.equal(result.error, undefined)
  assert.deepEqual(result.data, {
    name: "Test", email: "test@example.com", password: "valid-password", city: "Nis", country: "Srbija", birthYear: 1990, image: "/avatars/page.png",
  })
  assert.equal(normalizeEmail({}), "")
})

test("signup rejects malformed types, invalid dates and oversized fields", () => {
  for (const invalid of [null, [], 1, { ...baseSignup, name: [] }, { ...baseSignup, email: {} }, { ...baseSignup, password: {} }, { ...baseSignup, password: "short" }, { ...baseSignup, name: "a".repeat(81) }, { ...baseSignup, city: [] }, { ...baseSignup, birthYear: true }, { ...baseSignup, birthYear: "1800" }, { ...baseSignup, birthYear: 2000.5 }]) {
    assert.equal(typeof validateSignup(invalid).error, "string")
  }
})

test("password validation prevents bcrypt byte truncation including Unicode", () => {
  assert.equal(getPasswordError("a".repeat(72)), null)
  assert.ok(getPasswordError("a".repeat(73)))
  assert.ok(getPasswordError("\u00e9".repeat(37)))
})

test("signup accepts only safe bounded avatar sources", () => {
  assert.equal(validateSignup({ ...baseSignup, image: "data:image/png;base64,YWJj" }).error, undefined)
  for (const image of ["https://remote.test/avatar.png", "javascript:alert(1)", "/avatars/../secret", "data:image/svg+xml;base64,YWJj", "data:image/png;base64,!invalid", "data:image/png;base64," + Buffer.alloc(MAX_AVATAR_BYTES + 1).toString("base64")]) {
    assert.ok(validateSignup({ ...baseSignup, image }).error)
  }
})

test("request parser rejects malformed and oversized actual request bodies", async () => {
  assert.deepEqual(await readLimitedJson(request({ name: "Test" }), 100), { name: "Test" })
  await assert.rejects(readLimitedJson(request({ name: "a".repeat(100) }, { "content-length": "1" }), 30), error => error.status === 413)
  await assert.rejects(readLimitedJson(request({}, { "content-length": "9999" }), 30), error => error.status === 413)
  await assert.rejects(readLimitedJson(new Request("https://site.test", { method: "POST", body: "{" }), 100), error => error.status === 400)
  await assert.rejects(readLimitedJson(new Request("https://site.test", { method: "POST" }), 100), error => error.status === 400)
})

test("callbacks retain same-origin destinations and prevent auth redirect loops", () => {
  const origin = "https://site.test"
  assert.equal(safeCallbackUrl("/pesme/domace?x=1#ref", origin), "/pesme/domace?x=1#ref")
  assert.equal(safeCallbackUrl(origin + "/favorite", origin), "/favorite")
  for (const url of ["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "/login", "/signup?x=1", "/signin", "/api/auth/callback/google", "https://user:pass@site.test/favorite"]) {
    assert.equal(safeCallbackUrl(url, origin), "/", url)
  }
  assert.ok(!authErrorMessage("<script>error</script>").includes("<script>"))
})

test("auth timeout releases stuck requests and preserves successful results", async () => {
  assert.equal(await withAuthTimeout(Promise.resolve("ok"), 100), "ok")
  await assert.rejects(withAuthTimeout(new Promise(() => {}), 5), /AUTH_TIMEOUT/)
  await assert.rejects(withAuthTimeout(Promise.reject(new Error("offline")), 100), /offline/)
})

test("Google configuration needs both values, supports legacy secret and trims values", () => {
  const keys = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_SECRET"]
  const saved = keys.map(key => process.env[key])
  try {
    keys.forEach(key => delete process.env[key])
    assert.equal(getGoogleCredentials(), null)
    process.env.GOOGLE_SECRET = " legacy "
    assert.equal(getGoogleCredentials(), null)
    process.env.GOOGLE_CLIENT_ID = " test-id "
    assert.deepEqual(getGoogleCredentials(), { clientId: "test-id", clientSecret: "legacy" })
    process.env.GOOGLE_CLIENT_SECRET = " preferred "
    assert.equal(getGoogleCredentials().clientSecret, "preferred")
    process.env.GOOGLE_CLIENT_SECRET = " "
    assert.equal(getGoogleCredentials().clientSecret, "legacy")
  } finally {
    keys.forEach((key, i) => saved[i] === undefined ? delete process.env[key] : process.env[key] = saved[i])
  }
})

test("credentials normalize email, compare the real hash and return no password", async () => {
  state.user = { ...baseUser, password: passwordHash }
  const result = await authorize({ email: " TEST@EXAMPLE.COM ", password: baseSignup.password })
  assert.equal(result.id, baseUser.id)
  assert.equal(result.password, undefined)
  assert.deepEqual(calls[0][1].where, { email: "test@example.com" })
  assert.equal(await authorize({ email: baseUser.email, password: "wrong-password" }), null)
})

test("credentials reject banned, nonexistent and Google-only accounts", async () => {
  for (const user of [null, { ...baseUser, password: null }, { ...baseUser, password: passwordHash, banned: true }]) {
    state.user = user
    assert.equal(await authorize({ email: baseUser.email, password: baseSignup.password }), null)
  }
  assert.equal(await authorize({ email: {}, password: "test" }), null)
  assert.equal(await authorize({ email: baseUser.email, password: "" }), null)
  assert.ok(calls.every(([name]) => name !== "createUser"))
})

test("auth database failures never expose internal exception text", async () => {
  state.failure = new Error("private-database-connection-detail")
  await assert.rejects(authorize({ email: baseUser.email, password: baseSignup.password }), error => error.message === "ServiceUnavailable")
  await assert.rejects(googleSignIn(), error => error.message === "ServiceUnavailable")
})

test("Google refuses unverified profiles, unsupported providers and bans", async () => {
  assert.equal(await googleSignIn({ email_verified: false }), false)
  assert.equal(await googleSignIn({}, { ...googleAccount, provider: "facebook" }), false)
  assert.equal(calls.length, 0)
  state.linked = { user: { ...baseUser, banned: true } }
  assert.equal(await googleSignIn(), false)
  state.linked = null
  state.user = { ...baseUser, banned: true }
  assert.equal(await googleSignIn(), false)
})

test("Google reuses stable linked identity without matching by a changed email", async () => {
  state.linked = { user: baseUser }
  assert.equal(await googleSignIn({ email: "changed@gmail.com" }), true)
  assert.equal(calls.filter(([name]) => name === "findUser").length, 0)
})

test("Google delegates new users and password account linking to the installed adapter", async () => {
  assert.equal(typeof authOptions.adapter.linkAccount, "function")
  assert.equal(await googleSignIn(), true)
  state.user = { ...baseUser, password: passwordHash, emailVerified: null }
  assert.equal(await googleSignIn(), true)
  assert.ok(!calls.some(([name]) => ["createAccount", "createUser"].includes(name)))
  assert.equal(authOptions.debug, false)
})

test("legacy Google-only Gmail accounts migrate without changing user or password", async () => {
  state.user = { ...baseUser, password: null, emailVerified: null }
  assert.equal(await googleSignIn(), true)
  const create = calls.find(([name]) => name === "createAccount")[1]
  assert.equal(create.data.userId, baseUser.id)
  assert.equal(create.data.providerAccountId, "google-sub")
  assert.ok(!calls.some(([name]) => name === "createUser"))
  state.otherAccount = { id: "other-google-identity" }
  assert.equal(await googleSignIn(), false)
})

test("legacy migration does not silently trust non-Google mailbox authority", async () => {
  state.user = { ...baseUser, password: null }
  assert.equal(await googleSignIn({ email: "test@example.com" }), false)
  assert.ok(!calls.some(([name]) => name === "createAccount"))
})

test("JWT refreshes role and profile from DB and rejects bans and deleted users", async () => {
  state.user = { ...baseUser, role: "user" }
  const token = await authOptions.callbacks.jwt({ token: { id: baseUser.id, role: "admin" } })
  assert.equal(token.role, "user")
  assert.equal(token.sub, baseUser.id)
  assert.equal(calls.filter(([name]) => name === "findUser").length, 1)
  const session = await authOptions.callbacks.session({ session: { user: {}, expires: "later" }, token })
  assert.equal(session.user.id, baseUser.id)
  assert.equal(calls.filter(([name]) => name === "findUser").length, 1)
  state.user = { ...baseUser, banned: true }
  await assert.rejects(authOptions.callbacks.jwt({ token }), /Session no longer valid/)
  state.user = null
  await assert.rejects(authOptions.callbacks.jwt({ token }), /Session no longer valid/)
})

test("Google verification never marks a different local email as verified", async () => {
  await authOptions.events.signIn({ user: baseUser, account: googleAccount, profile: { email: "other@gmail.com" } })
  assert.equal(calls.length, 0)
  await authOptions.events.signIn({ user: baseUser, account: googleAccount, profile: { email: baseUser.email } })
  assert.equal(calls[0][0], "updateUsers")
})

test("signup API returns only success, stores optional fields, ignores admin injection", async () => {
  const response = await signup(request({ ...baseSignup, city: "Nis", country: "Srbija", birthYear: "1990", role: "admin", emailVerified: new Date() }))
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), { ok: true })
  const created = calls.find(([name]) => name === "createUser")[1]
  assert.equal(created.data.city, "Nis")
  assert.equal(created.data.birthYear, 1990)
  assert.equal(created.data.role, undefined)
  assert.equal(created.data.emailVerified, undefined)
  assert.equal(await bcrypt.compare(baseSignup.password, created.data.password), true)
  assert.deepEqual(created.select, { id: true })
})

test("signup API rejects invalid inputs before querying the DB", async () => {
  const response = await signup(request({ ...baseSignup, password: ["bad"] }))
  assert.equal(response.status, 400)
  assert.equal(calls.length, 0)
})

test("signup API handles duplicates including races and hides database details", async () => {
  state.user = baseUser
  assert.equal((await signup(request(baseSignup))).status, 409)
  state.user = null
  state.createFailure = { code: "P2002" }
  assert.equal((await signup(request(baseSignup))).status, 409)
  state.createFailure = null
  state.failure = new Error("private-database-connection-detail")
  const response = await signup(request(baseSignup))
  assert.equal(response.status, 503)
  assert.ok(!(await response.text()).includes("private-database"))
})

test("public debug users endpoint is disabled without touching the database", async () => {
  const response = await debugUsers()
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { error: "Not found" })
  assert.equal(calls.length, 0)
})

test("ban API requires admin and rejects cross-origin and self-ban requests", async () => {
  assert.equal((await ban(request({ userId: "target" }))).status, 403)
  state.session = { user: { id: "admin", role: "user" } }
  assert.equal((await ban(request({ userId: "target" }))).status, 403)
  state.session.user.role = "admin"
  assert.equal((await ban(request({ userId: "target" }, { origin: "https://evil.test" }))).status, 403)
  assert.equal((await ban(request({ userId: "admin" }))).status, 400)
  assert.equal(calls.length, 0)
})

test("ban API supports the existing HTML form and JSON clients", async () => {
  state.session = { user: { id: "admin", role: "admin" } }
  const response = await ban(new Request("https://site.test/api/admin/users/ban", {
    method: "POST", headers: { origin: "https://site.test" }, body: new URLSearchParams({ userId: "target" }),
  }))
  assert.equal(response.status, 303)
  assert.equal(response.headers.get("location"), "https://site.test/admin/korisnici")
  assert.deepEqual(calls[0][1], { where: { id: "target" }, data: { banned: true } })
  assert.deepEqual(await (await ban(request({ userId: "target" }))).json(), { ok: true })
})
