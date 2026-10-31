import { prisma } from "@/lib/prisma"
import { metadata } from "@/scripts/lib/youtube-metadata.cjs"
import { withYouTubeMetadata, type MusicList, type YouTubeSource } from "./model"

export async function enrichMusicMetadata(list: MusicList): Promise<MusicList> {
  const sources = list.items.map(item=>item.source).filter((source): source is YouTubeSource=>Boolean(source))
  if (!sources.length) return list
  try {
    const db = { query: async (sql: string, values: unknown[] = []) => ({ rows: await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql,...values) }) }
    const result = await metadata(db,sources)
    return { ...list, items: list.items.map(item=>{
      const source=item.source,info=source&&result.values.get(source.kind+":"+source.id)
      if (!source || !info) return item
      return withYouTubeMetadata(item,info)
    }) }
  } catch { return list }
}
