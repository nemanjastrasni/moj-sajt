import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { unstable_cache, revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { BRANDING_TAG, DEFAULT_BRANDING, BrandingError, publicBranding, validateBranding } from "./model"

type Row = { config: unknown; version: string; updatedAt: Date }
const readPublic = unstable_cache(async () => {
  const rows = await prisma.$queryRaw<Row[]>`SELECT config FROM public."SiteBranding" WHERE id='home'`
  return publicBranding(rows.length ? validateBranding(rows[0].config) : DEFAULT_BRANDING)
}, ["public-site-branding-v1"], { revalidate: 300, tags: [BRANDING_TAG] })
export async function readPublicBranding() { return readPublic() }

export async function readAdminBranding() {
  await requireSongAdmin()
  try {
    const rows = await prisma.$queryRaw<Row[]>`SELECT config,version,"updatedAt" FROM public."SiteBranding" WHERE id='home'`
    if (!rows.length) throw new Error("missing-configuration")
    return { available: true as const, config: validateBranding(rows[0].config), version: rows[0].version, updatedAt: rows[0].updatedAt.toISOString() }
  } catch { return { available: false as const, config: DEFAULT_BRANDING, version: "", updatedAt: null } }
}

export async function saveBranding(input: unknown) {
  const actor = await requireSongAdmin()
  if (!input || typeof input !== "object") throw new BrandingError(400, "Neispravan zahtev.")
  const { version, config: raw } = input as Record<string, unknown>
  if (typeof version !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(version)) throw new BrandingError(400, "Osveži podešavanja pre čuvanja.")
  const config = validateBranding(raw)
  const result = await prisma.$transaction(async tx => {
    const rows = await tx.$queryRaw<Row[]>`SELECT config,version,"updatedAt" FROM public."SiteBranding" WHERE id='home' FOR UPDATE`
    const current = rows[0]
    if (!current) throw new BrandingError(503, "Podešavanja još nisu pripremljena u bazi.")
    if (current.version !== version) throw new BrandingError(409, "Drugi administrator je promenio slogane. Osveži stranicu pre nove izmene.")
    if (JSON.stringify(validateBranding(current.config)) === JSON.stringify(config)) return { config, version, updatedAt: current.updatedAt.toISOString() }
    const nextVersion = randomUUID(), updatedAt = new Date(), json = JSON.stringify(config)
    await tx.$executeRaw`UPDATE public."SiteBranding" SET config=${json}::jsonb,version=${nextVersion},"updatedById"=${actor.id},"updatedAt"=${updatedAt} WHERE id='home'`
    await tx.$executeRaw`INSERT INTO public."SiteBrandingChange" (id,"brandingId",before,after,"beforeVersion","afterVersion","actorId") VALUES (${randomUUID()},'home',${JSON.stringify(current.config)}::jsonb,${json}::jsonb,${version},${nextVersion},${actor.id})`
    return { config, version: nextVersion, updatedAt: updatedAt.toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 10000 })
  revalidateTag(BRANDING_TAG)
  return result
}
