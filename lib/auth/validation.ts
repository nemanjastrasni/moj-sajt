export const MAX_AVATAR_BYTES = 1024 * 1024
export const MAX_SIGNUP_BYTES = 1500 * 1024

export const AVATARS = [
  "/avatars/hendrix.png", "/avatars/page.png", "/avatars/clapton.png",
  "/avatars/srv.png", "/avatars/slash.png", "/avatars/santana.png",
  "/avatars/knopfler.png", "/avatars/bbking.png", "/avatars/gilmour.png",
  "/avatars/vanhalen.png",
]

export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function getPasswordError(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) {
    return "Lozinka mora imati najmanje 8 karaktera."
  }
  // bcrypt ignores everything after 72 bytes, not 72 characters.
  if (new TextEncoder().encode(password).length > 72) {
    return "Lozinka je predugacka. Koristi najvise 72 bajta."
  }
  return null
}

type SignupData = {
  name: string
  email: string
  password: string
  image: string | null
  city: string | null
  country: string | null
  birthYear: number | null
}

export function validateSignup(input: unknown):
  | { data: SignupData; error?: never }
  | { error: string; data?: never } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Neispravni podaci za registraciju." }
  }
  const value = input as Record<string, unknown>
  const name = typeof value.name === "string" ? value.name.trim() : ""
  const email = normalizeEmail(value.email)
  if (!name || name.length > 80) return { error: "Ime mora imati od 1 do 80 karaktera." }
  if (!isValidEmail(email)) return { error: "Unesi ispravan email." }
  const passwordError = getPasswordError(value.password)
  if (passwordError) return { error: passwordError }

  const optionalText = (field: unknown) =>
    field === undefined || field === null || field === ""
      ? null
      : typeof field === "string" && field.trim().length <= 100
        ? field.trim() || null
        : undefined
  const city = optionalText(value.city)
  const country = optionalText(value.country)
  if (city === undefined || country === undefined) {
    return { error: "Grad i drzava mogu imati najvise 100 karaktera." }
  }

  let birthYear: number | null = null
  if (value.birthYear !== undefined && value.birthYear !== null && value.birthYear !== "") {
    if (typeof value.birthYear !== "string" && typeof value.birthYear !== "number") {
      return { error: "Unesi ispravnu godinu rodjenja." }
    }
    birthYear = Number(value.birthYear)
    if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > new Date().getFullYear()) {
      return { error: "Unesi ispravnu godinu rodjenja." }
    }
  }

  let image: string | null = null
  if (value.image !== undefined && value.image !== null && value.image !== "") {
    if (typeof value.image !== "string") return { error: "Neispravna profilna slika." }
    image = value.image
    if (!AVATARS.includes(image)) {
      const match = /^data:image\/(?:png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image)
      if (!match || match[1].length % 4 !== 0) return { error: "Izaberi PNG, JPG, WebP ili GIF sliku." }
      const padding = match[1].endsWith("==") ? 2 : match[1].endsWith("=") ? 1 : 0
      if (match[1].length * 3 / 4 - padding > MAX_AVATAR_BYTES) {
        return { error: "Profilna slika moze imati najvise 1 MB." }
      }
    }
  }
  return { data: { name, email, password: value.password as string, city, country, birthYear, image } }
}
