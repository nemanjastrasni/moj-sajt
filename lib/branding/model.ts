export type Slogan = { id: string; text: string; textEn: string; enabled: boolean }
export type BrandingConfig = { slogans: Slogan[]; rotate: boolean; intervalSeconds: number }
export const BRANDING_TAG = "site-branding"
export const DEFAULT_BRANDING: BrandingConfig = {
  rotate: true, intervalSeconds: 12,
  slogans: [
    { id: "welcome", text: "Za znalce, neznalice i ostale muzikalice!", textEn: "For experts, beginners and every music lover!", enabled: true },
    { id: "ear", text: "Za sve koji imaju sluha... i one koji ga traže!", textEn: "For those with an ear for music... and those finding theirs!", enabled: true },
    { id: "beginner", text: "Znaš da sviraš? Super! Ne znaš? Još bolje!", textEn: "Can you play? Great! Can't yet? Even better!", enabled: true },
    { id: "key", text: "Sviraj, slušaj, čitaj... pazi na tonalitet!", textEn: "Play, listen, read... mind the key!", enabled: true },
    { id: "music", text: "Za sve bez sluha koji vole muziku!", textEn: "For everyone who loves music, even without a musical ear!", enabled: true },
  ],
}
export class BrandingError extends Error { constructor(public status: number, message: string) { super(message) } }
function text(value: unknown, optional = false) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/.test(value)) throw new BrandingError(400, "Unesi ispravan tekst slogana.")
  const clean = value.trim()
  if ((!optional && !clean) || clean.length > 160) throw new BrandingError(400, "Slogan može imati od 1 do 160 znakova.")
  return clean
}
export function validateBranding(value: unknown): BrandingConfig {
  if (!value || typeof value !== "object") throw new BrandingError(400, "Neispravna podešavanja slogana.")
  const input = value as Record<string, unknown>
  if (!Array.isArray(input.slogans) || input.slogans.length < 1 || input.slogans.length > 50 || typeof input.rotate !== "boolean" || !Number.isInteger(input.intervalSeconds) || Number(input.intervalSeconds) < 6 || Number(input.intervalSeconds) > 60) throw new BrandingError(400, "Dodaj 1–50 slogana i interval od 6 do 60 sekundi.")
  const ids = new Set<string>()
  const slogans = input.slogans.map((item: unknown): Slogan => {
    if (!item || typeof item !== "object") throw new BrandingError(400, "Neispravan slogan.")
    const row = item as Record<string, unknown>
    if (typeof row.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(row.id) || ids.has(row.id) || typeof row.enabled !== "boolean") throw new BrandingError(400, "Osveži listu slogana pre čuvanja.")
    ids.add(row.id)
    return { id: row.id, text: text(row.text), textEn: text(row.textEn, true), enabled: row.enabled }
  })
  if (!slogans.some(item => item.enabled)) throw new BrandingError(400, "Uključi najmanje jedan slogan.")
  return { slogans, rotate: input.rotate, intervalSeconds: Number(input.intervalSeconds) }
}
export function publicBranding(config: BrandingConfig): BrandingConfig {
  return { ...config, slogans: config.slogans.filter(item => item.enabled).map(item => ({ ...item })) }
}
