import { unstable_cache } from "next/cache"
import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { PUBLIC_CATEGORIES } from "@/lib/seo/site"
import type { HomeSong, HomeSongKind } from "./homeSongs"

export const getHomeSongs = unstable_cache(async (kind: HomeSongKind): Promise<HomeSong[]> => {
  const orderBy: Prisma.SongOrderByWithRelationInput[] = kind === "popular" ? [{ popularity: "desc" }, { id: "asc" }] : [{ createdAt: { sort: "desc", nulls: "last" } }, { id: "desc" }]
  const songs = await prisma.song.findMany({ where: { artist: { category: { in: [...PUBLIC_CATEGORIES] } } },
    select: { id: true, title: true, slug: true, category: true, artist: { select: { name: true, slug: true, category: true } } }, orderBy, take: 5 })
  return songs.map(song => ({ id: song.id, title: song.title, slug: song.slug, category: song.artist.category ?? song.category, artist: { name: song.artist.name, slug: song.artist.slug } }))
}, ["public-home-songs-v1"], { revalidate: 60, tags: ["public-home-songs"] })

export async function homeSongsResponse(kind: HomeSongKind) {
  try { return NextResponse.json(await getHomeSongs(kind), { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } }) }
  catch { return NextResponse.json({ error: "Pesme trenutno nisu dostupne." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } }) }
}
