/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS public-endpoint diagnostic. */
const { parseArgs } = require("node:util")
const DEFAULT_SITE = "https://moj-sajt-rho.vercel.app"
function siteOrigin(value) {
  const url = new URL(value)
  const local = ["localhost", "127.0.0.1"].includes(url.hostname)
  const allowed = local || ["moj-sajt-rho.vercel.app", "moj-sajt-git-main-nemanjastrasnis-projects.vercel.app"].includes(url.hostname)
  if (!allowed || url.username || url.password || url.search || url.hash || url.pathname !== "/" || (!local && (url.protocol !== "https:" || url.port)) || (local && !["http:", "https:"].includes(url.protocol))) throw Error("Unsupported site origin")
  return url.origin
}
const failed = code => Object.assign(new Error(code), { code })
async function json(response) {
  if (!response.ok) throw failed("HTTP_" + response.status)
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > 256000) throw failed("RESPONSE_TOO_LARGE")
  try { return JSON.parse(Buffer.from(bytes).toString("utf8")) } catch { throw failed("INVALID_JSON") }
}
function callback(value, origin) {
  try {
    const url = new URL(value)
    return url.origin === origin && url.pathname === "/api/auth/callback/google" && !url.search && !url.hash && !url.username && !url.password
  } catch { return false }
}
async function inspectGoogleAuth(value, { request = fetch, startOAuth = false } = {}) {
  const site = siteOrigin(value)
  const options = { redirect: "manual", signal: AbortSignal.timeout(20000) }
  const result = { site, expectedCallbackUrl: site + "/api/auth/callback/google", googleCloudAllowlistChecked: false, accountLoginTested: false }
  const providers = await request(site + "/api/auth/providers", options)
  if ([301, 302, 303, 307, 308].includes(providers.status)) return { ...result, state: "deployment-redirect-or-protection", status: providers.status }
  const google = (await json(providers)).google
  if (!google) return { ...result, state: "google-not-configured" }
  if (!callback(google.callbackUrl, site) || google.signinUrl !== site + "/api/auth/signin/google") return { ...result, state: "callback-origin-or-path-mismatch" }
  result.callbackUrl = google.callbackUrl
  if (!startOAuth) return { ...result, state: "provider-callback-matches-site" }
  const csrfResponse = await request(site + "/api/auth/csrf", options)
  const csrf = await json(csrfResponse)
  if (typeof csrf.csrfToken !== "string" || !csrf.csrfToken || csrf.csrfToken.length > 4096) throw failed("INVALID_CSRF_RESPONSE")
  const cookies = csrfResponse.headers.getSetCookie().map(cookie => cookie.split(";")[0]).join("; ")
  if (!cookies || cookies.length > 16000) throw failed("INVALID_CSRF_COOKIE")
  const response = await request(google.signinUrl, { ...options, signal: AbortSignal.timeout(20000), method: "POST", headers: { cookie: cookies, origin: site, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl: site + "/", json: "true" }) })
  const data = await json(response)
  let authorization
  try { authorization = new URL(data.url) } catch { throw failed("INVALID_AUTHORIZATION_RESPONSE") }
  if (authorization.protocol !== "https:" || authorization.hostname !== "accounts.google.com" || authorization.username || authorization.password || authorization.port) return { ...result, state: "google-authorization-not-started" }
  const query = authorization.searchParams
  const verified = callback(query.get("redirect_uri"), site)
  return { ...result, state: verified ? "authorization-request-matches-site" : "authorization-callback-mismatch", authorizationHost: authorization.hostname,
    callbackMatchesAuthorization: verified, hasState: Boolean(query.get("state")), pkceS256: query.get("code_challenge_method") === "S256" && Boolean(query.get("code_challenge")),
    basicScopesOnly: query.get("scope")?.split(/\s+/).sort().join(" ") === "email openid profile", forcesConsent: (query.get("prompt") || "").split(" ").includes("consent") }
}
async function main() {
  const { values } = parseArgs({ options: { url: { type: "string", default: DEFAULT_SITE }, "start-oauth": { type: "boolean", default: false } } })
  const result = await inspectGoogleAuth(values.url, { startOAuth: values["start-oauth"] })
  console.log(JSON.stringify(result, null, 2))
  if (!["provider-callback-matches-site", "authorization-request-matches-site"].includes(result.state)) process.exitCode = 1
}
if (require.main === module) main().catch(error => { console.error("Google auth diagnostic stopped:", error.code || "REQUEST_FAILED"); process.exitCode = 1 })
module.exports = { inspectGoogleAuth, siteOrigin }
