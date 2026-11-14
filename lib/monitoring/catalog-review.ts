import { createHash } from "node:crypto"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { hash } from "@/scripts/lib/artist-wiki-store.cjs"
import { getArtistImage } from "@/lib/artistPhotos"
import rawReview from "./catalog-review-data.json"
import { normalizeDiscography } from "@/lib/discography"
import { biographyText } from "@/lib/biographies/catalog"
import { findingVersion } from "@/scripts/lib/catalog-finding-version.cjs"

export const reviewKinds = { sve: "Sve oblasti", biografije: "Biografije", diskografije: "Diskografije", slike: "Fotografije", akordi: "Pesme i akordi" } as const
export type ReviewKind = keyof typeof reviewKinds
export type CatalogFinding = {
  id: string; kind: Exclude<ReviewKind,"sve">; subject: "artist" | "song"; subjectId: string; name: string; field: "bio" | "discography" | "image" | "song";
  expectedHash: string; title: string; observed: string; next: string; confidence: "missing" | "confirmed-mismatch" | "technical-error" | "technical-warning"; requiresApproval: boolean;
  slug?: string; category?: string; publicHref?: string; lines?: number[]; sourceNote?: string | null;
}
export type ReviewedFinding = CatalogFinding & { state: "unchanged" | "changed" | "resolved" | "removed" | "unavailable"; currentVersion?: string; href: string | null; editHref: string | null }
const review = rawReview as unknown as { version: number; checkedAt: string; songCheckedAt: string; summary: { artists: number; biographies: number; discographies: number; photos: number; songs: number; songsNeedingTechnicalReview: number; songIssueCounts: Record<string,number>; findingsShown: number }; findings: CatalogFinding[] }
const segment = (value: string) => encodeURIComponent(value)
const artistHref = (value: { slug: string; category: string | null }) => value.slug && ["domace","narodne","strane"].includes(value.category || "") ? `/biografija/${segment(value.category!)}/${segment(value.slug)}` : null

const cachedReview = unstable_cache(async () => {
  try {
    const [artists,songs] = await Promise.all([
      prisma.artist.findMany({ where: { id: { in: review.findings.filter(row=>row.subject==="artist").map(row=>row.subjectId) } }, select: { id:true,name:true,slug:true,category:true,bio:true,discography:true,image:true } }),
      prisma.song.findMany({ where: { id: { in: review.findings.filter(row=>row.subject==="song").map(row=>row.subjectId) } }, select: { id:true,title:true,slug:true,category:true,lyrics:true,chords:true,artist:{select:{name:true,slug:true}} } }),
    ])
    return review.findings.map((finding): ReviewedFinding => {
      if (finding.subject==="artist") {
        const current=artists.find(row=>row.id===finding.subjectId)
        if (!current) return {...finding,state:"removed",href:null,editHref:null}
        const field=finding.field as "bio" | "discography" | "image"
        const unchanged=hash(current[field])===finding.expectedHash && current.name===finding.name && current.slug===finding.slug && current.category===finding.category && !(field==="image" && getArtistImage(current))
        const filled = field === "bio" ? Boolean(biographyText(current.bio)) : field === "discography" ? normalizeDiscography(current.discography).length > 0 : Boolean(getArtistImage(current))
        return {...finding,state:finding.confidence === "missing" && filled ? "resolved" : unchanged?"unchanged":"changed",currentVersion:findingVersion(finding,current),href:artistHref(current),editHref:`/admin/artists/${segment(current.id)}/edit`}
      }
      const current=songs.find(row=>row.id===finding.subjectId)
      if (!current) return {...finding,state:"removed",href:null,editHref:null}
      const unchanged=createHash("sha256").update(JSON.stringify([current.lyrics,current.chords])).digest("hex")===finding.expectedHash
      const href=current.slug && ["domace","narodne","strane"].includes(current.category || "") ? `/pesme/${segment(current.category)}/${segment(current.artist.slug)}/${segment(current.slug)}` : null
      return {...finding,state:unchanged?"unchanged":"changed",currentVersion:findingVersion(finding,current),href,editHref:`/admin/songs/${segment(current.id)}/edit`}
    })
  } catch {
    return review.findings.map((finding): ReviewedFinding=>({...finding,state:"unavailable",href:null,editHref:null}))
  }
},["admin-catalog-review-2026-11-08-v2"],{revalidate:300,tags:["admin-catalog-review"]})

export async function readCatalogReview() {
  await requireSongAdmin()
  return { checkedAt:review.checkedAt,songCheckedAt:review.songCheckedAt,summary:review.summary,findings:await cachedReview() }
}
export function reviewSelection(value: unknown, page: unknown, status?: unknown) {
  const kind: ReviewKind=typeof value==="string" && Object.hasOwn(reviewKinds,value) ? value as ReviewKind : "sve"
  const number=typeof page==="string" && /^\d{1,3}$/.test(page) ? Math.max(1,Number(page)) : 1
  return {kind,page:number,status:status === "reseni" || status === "svi" ? status : "otvoreni" as "otvoreni" | "reseni" | "svi"}
}
