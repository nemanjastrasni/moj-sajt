/* eslint-disable @typescript-eslint/no-require-imports -- Standalone diagnostic regression tests. */
const { test } = require("node:test")
const assert = require("node:assert/strict")
const { inspectGoogleAuth, siteOrigin } = require("./check-google-auth.cjs")
const site = "https://moj-sajt-rho.vercel.app"
const response = body => Response.json(body)
const providers = callbackUrl => response({ google: { signinUrl: site + "/api/auth/signin/google", callbackUrl } })

test("diagnostic accepts only known site origins and explicit local development origins", () => {
  assert.equal(siteOrigin(site + "/"), site)
  assert.equal(siteOrigin("http://localhost:3000"), "http://localhost:3000")
  for (const url of ["http://moj-sajt-rho.vercel.app", "https://evil.test", "https://user:pass@moj-sajt-rho.vercel.app", site + "/login", site + "?secret=x", "http://169.254.169.254", site + ":444"]) assert.throws(() => siteOrigin(url))
})

test("provider-only check does not start OAuth or contact external destinations", async () => {
  const calls = []
  const result = await inspectGoogleAuth(site, { request: async (url, options) => { calls.push(url); assert.equal(options.redirect, "manual"); return providers(site + "/api/auth/callback/google") } })
  assert.equal(calls.length, 1)
  assert.equal(result.state, "provider-callback-matches-site")
  assert.equal(result.googleCloudAllowlistChecked, false)
  assert.equal(result.accountLoginTested, false)
})

test("protected deployment and missing provider are explicit, not successful checks", async () => {
  assert.equal((await inspectGoogleAuth(site, { request: async () => new Response(null, { status: 302, headers: { location: "https://vercel.com/sso-api?nonce=private" } }) })).state, "deployment-redirect-or-protection")
  assert.equal((await inspectGoogleAuth(site, { request: async () => response({ credentials: {} }) })).state, "google-not-configured")
})

test("wrong callback origins, paths, credentials and query values fail before POST", async () => {
  for (const callbackUrl of ["http://localhost:3000/api/auth/callback/google", site + "/login", site + "/api/auth/callback/google?token=secret", "https://user@moj-sajt-rho.vercel.app/api/auth/callback/google"]) {
    const result = await inspectGoogleAuth(site, { startOAuth: true, request: async (url, options) => { assert.equal(options.method, undefined); return providers(callbackUrl) } })
    assert.equal(result.state, "callback-origin-or-path-mismatch")
  }
})

test("optional OAuth initiation keeps CSRF/PKCE/state private and stops before Google's login", async () => {
  const calls = []
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  authorization.search = new URLSearchParams({ redirect_uri: site + "/api/auth/callback/google", state: "PRIVATE_STATE", client_id: "PRIVATE_CLIENT_ID", code_challenge: "PRIVATE_CHALLENGE", code_challenge_method: "S256", scope: "openid email profile" }).toString()
  const result = await inspectGoogleAuth(site, { startOAuth: true, request: async (url, options) => {
    calls.push(url)
    if (calls.length === 1) return providers(site + "/api/auth/callback/google")
    if (calls.length === 2) return new Response(JSON.stringify({ csrfToken: "PRIVATE_CSRF" }), { headers: { "set-cookie": "next-auth.csrf-token=PRIVATE_COOKIE; HttpOnly; Secure" } })
    assert.equal(options.method, "POST")
    assert.equal(options.body.get("csrfToken"), "PRIVATE_CSRF")
    assert.match(options.headers.cookie, /PRIVATE_COOKIE/)
    assert.equal(options.headers.origin, site)
    return response({ url: authorization.href })
  } })
  assert.equal(calls.length, 3)
  assert.ok(calls.every(url => url.startsWith(site + "/api/auth/")))
  assert.equal(result.state, "authorization-request-matches-site")
  assert.equal(result.hasState, true)
  assert.equal(result.pkceS256, true)
  assert.equal(result.basicScopesOnly, true)
  assert.equal(result.forcesConsent, false)
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_/)
})
