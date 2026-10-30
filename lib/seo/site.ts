export const PUBLIC_CATEGORIES = ["narodne", "domace", "strane"] as const
export const SITE_NAME = "GitaraAkordi"
export const DEFAULT_SITE_URL = "https://moj-sajt-rho.vercel.app"

export function resolveSiteOrigin(env: Record<string, string | undefined>) {
  const input = env.SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL || DEFAULT_SITE_URL
  let url: URL
  try { url = new URL(input.includes("://") ? input : "https://" + input) }
  catch { throw Error("SITE_URL must be the public HTTPS site origin.") }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/" || url.port) throw Error("SITE_URL must be the public HTTPS site origin without a path, query or credentials.")
  return url.origin
}

export const SITE_URL = resolveSiteOrigin(process.env)
export const isPublicCategory = (value: string) => (PUBLIC_CATEGORIES as readonly string[]).includes(value)
export function routePath(...segments: string[]) {
  if (segments.some(segment => !segment.trim() || [".", ".."].includes(segment) || /[\u0000-\u001f]/.test(segment))) throw Error("Invalid public path.")
  return "/" + segments.map(encodeURIComponent).join("/")
}
export function publicUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) throw Error("Expected a public site path.")
  const url = new URL(path, SITE_URL)
  if (url.origin !== SITE_URL) throw Error("Expected a public site path.")
  url.search = ""; url.hash = ""
  return url.href
}
