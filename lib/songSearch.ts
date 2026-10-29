import type { Prisma } from "@prisma/client"
import { slugify } from "./until/slug"

export const SEARCH_LIMIT = 12
export const SEARCH_MAX_LENGTH = 120
export const SEARCH_MAX_WORDS = 6

export type SongSearchResult = {
  id: string
  title: string
  slug: string
  category: string
  artist: { name: string; slug: string }
}
export type SearchCandidate = SongSearchResult & { popularity: number }

export function cleanSearchQuery(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ")
}

export function foldSearchText(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0111/g, "dj")
}

export function prepareSongQuery(value: string | null) {
  const query = cleanSearchQuery(value ?? "")
  if (query.length > SEARCH_MAX_LENGTH || query.split(" ").length > SEARCH_MAX_WORDS) {
    throw new Error("Skrati pretragu na najvise 6 reci i 120 karaktera.")
  }
  if (query.length < 2 || !/[\p{L}\p{N}]/u.test(query)) return null
  return { query, terms: query.split(" ").filter(term => /[\p{L}\p{N}]/u.test(term)), slug: slugify(query) }
}

// PostgreSQL's insensitive equals/contains use ILIKE, where these are wildcards.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&")
}

function literalContains(value: string): Prisma.StringFilter {
  return { contains: escapeLike(value), mode: "insensitive" }
}

export function songSearchWhere(search: NonNullable<ReturnType<typeof prepareSongQuery>>): Prisma.SongWhereInput {
  return { AND: search.terms.map(term => {
    const text = literalContains(term)
    const slug = slugify(term)
    const alternatives: Prisma.SongWhereInput[] = [
      { title: text }, { artist: { name: text } },
    ]
    if (slug) alternatives.push({ slug: literalContains(slug) }, { artist: { slug: literalContains(slug) } })
    return { OR: alternatives }
  }) }
}

export function exactSongWhere(search: NonNullable<ReturnType<typeof prepareSongQuery>>): Prisma.SongWhereInput {
  return { OR: [
    { title: { equals: escapeLike(search.query), mode: "insensitive" } },
    ...(search.slug ? [{ slug: { equals: search.slug, mode: "insensitive" as const } }] : []),
  ] }
}

export function rankSearchResults(results: SearchCandidate[], query: string): SongSearchResult[] {
  const phrase = slugify(query)
  function score(song: SearchCandidate) {
    const title = slugify(song.title)
    const artist = slugify(song.artist.name)
    if (cleanSearchQuery(song.title).toLowerCase() === query.toLowerCase() || (phrase && title === phrase)) return 0
    if (phrase && artist === phrase) return 1
    if (phrase && title.startsWith(phrase)) return 2
    if (phrase && artist.startsWith(phrase)) return 3
    return 4
  }
  return [...new Map(results.map(song => [song.id, song])).values()]
    .sort((a, b) => score(a) - score(b) || b.popularity - a.popularity || a.title.localeCompare(b.title, "sr-Latn") || a.id.localeCompare(b.id))
    .slice(0, SEARCH_LIMIT)
    .map(song => ({ id: song.id, title: song.title, slug: song.slug, category: song.category, artist: song.artist }))
}

export function songSearchHref(song: SongSearchResult): string {
  return "/pesme/" + [song.category, song.artist.slug, song.slug].map(encodeURIComponent).join("/")
}
