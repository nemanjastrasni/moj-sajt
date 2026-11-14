/**
 * Compare browser requests with our configured public origin. A reverse proxy
 * can leave Request.url pointing at Next's internal hostname and port.
 * Forwarded headers are not trusted to choose an allowed origin.
 * @param {Request} request
 * @param {string | undefined} [publicUrl]
 */
function publicRequestOrigin(request, publicUrl = process.env.NEXTAUTH_URL || process.env.SITE_URL) {
  try {
    const expected = new URL(publicUrl || request.url)
    if (!["http:", "https:"].includes(expected.protocol) || expected.username || expected.password) return null
    return expected.origin
  } catch {
    return null
  }
}

/** @param {Request} request @param {string | undefined} [publicUrl] */
function isSameOrigin(request, publicUrl = process.env.NEXTAUTH_URL || process.env.SITE_URL) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false
  const origin = request.headers.get("origin")
  // Preserve authenticated non-browser clients that do not send Origin.
  return !origin || origin === publicRequestOrigin(request, publicUrl)
}

module.exports = { isSameOrigin, publicRequestOrigin }
