import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { foldSearchText, SEARCH_LIMIT, type SearchCandidate, type prepareSongQuery } from "./songSearch"
import { slugify } from "./until/slug"

export function foldedSearchSql(column: Prisma.Sql) {
  // Fixed SQL literals match the expression indexes, including generic prepared plans.
  return Prisma.sql`replace(regexp_replace(normalize(lower(${column}), NFD), '[̀-ͯ]', '', 'g'), 'đ', 'dj')`
}
const literalLike = (value: string) => value.replace(/[\\%_]/g, "\\$&")
export function normalizedSearchQuery(search: NonNullable<ReturnType<typeof prepareSongQuery>>) {
  const title = foldedSearchSql(Prisma.sql`s.title`), artist = foldedSearchSql(Prisma.sql`a.name`)
  const phrase = foldSearchText(search.query), phraseLike = literalLike(phrase) + "%"
  const terms = search.terms.map(term => {
    const text = "%" + literalLike(foldSearchText(term)) + "%", slug = slugify(term)
    // Keep each OR within one table so PostgreSQL can use its trigram indexes.
    // Intersect per-word candidates to preserve mixed title/artist searches.
    return Prisma.sql`s.id IN (
      SELECT ts.id FROM public."Song" ts WHERE ${foldedSearchSql(Prisma.sql`ts.title`)} LIKE ${text}${slug ? Prisma.sql` OR ts.slug ILIKE ${"%" + literalLike(slug) + "%"}` : Prisma.empty}
      UNION
      SELECT aps.id FROM public."Artist" ta JOIN public."Song" aps ON aps."artistId" = ta.id
      WHERE ${foldedSearchSql(Prisma.sql`ta.name`)} LIKE ${text}${slug ? Prisma.sql` OR ta.slug ILIKE ${"%" + literalLike(slug) + "%"}` : Prisma.empty}
    )`
  })
  return Prisma.sql`SELECT s.id, s.title, s.slug, coalesce(a.category, s.category) AS category, s.popularity,
      jsonb_build_object('name', a.name, 'slug', a.slug) AS artist
    FROM public."Song" s JOIN public."Artist" a ON a.id = s."artistId"
    WHERE ${Prisma.join(terms, " AND ")}
    ORDER BY CASE WHEN ${title} = ${phrase}${search.slug ? Prisma.sql` OR s.slug = ${search.slug}` : Prisma.empty} THEN 0
      WHEN ${artist} = ${phrase} THEN 1 WHEN ${title} LIKE ${phraseLike} THEN 2
      WHEN ${artist} LIKE ${phraseLike} THEN 3 ELSE 4 END,
      s.popularity DESC, s.title ASC, s.id ASC
    LIMIT ${SEARCH_LIMIT}`
}
export async function normalizedSongSearch(search: NonNullable<ReturnType<typeof prepareSongQuery>>) {
  return prisma.$queryRaw<SearchCandidate[]>(normalizedSearchQuery(search))
}
