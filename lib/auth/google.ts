import { isValidEmail, normalizeEmail } from "./validation"

export function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || process.env.GOOGLE_SECRET?.trim()
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

export function verifiedGoogleEmail(profile: unknown, providerAccountId: unknown): string | null {
  if (!profile || typeof profile !== "object") return null
  const google = profile as Record<string, unknown>
  if (google.email_verified !== true || typeof google.sub !== "string" || !google.sub || google.sub !== providerAccountId || typeof google.email !== "string") return null
  const email = normalizeEmail(google.email)
  return isValidEmail(email) ? email : null
}
