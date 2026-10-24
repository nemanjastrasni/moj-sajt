import { createHash } from "node:crypto"
import rawManifest from "@/public/artist-wiki/manifest.json"
import { stableStringify } from "@/lib/wiki-values.cjs"

export type WikiSource = {
  hash: string; language: string; title: string; pageId: number; revisionId: number; timestamp: string
  url: string; revisionUrl: string; historyUrl: string; license: string; changes: string
}
export type WikiArtist = { artistId: string; artistName: string; slug: string; category: string | null; wikidataId: string; bio?: WikiSource; discography?: WikiSource }
export const artistWikiManifest = rawManifest as { version: number; artists: WikiArtist[] }
export function wikiValueHash(value: unknown) { return createHash("sha256").update(stableStringify(value)).digest("hex") }
