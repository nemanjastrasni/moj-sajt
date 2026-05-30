import { NextResponse } from "next/server"

type YoutubeSearchItem = {
  id?: {
    videoId?: string
  }
  snippet?: {
    title?: string
    channelTitle?: string
    description?: string
  }
}

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function cleanSearchPart(value: string) {
  return stripAccents(value)
    .replace(/\s*\(\d+\)\s*$/g, "")
    .replace(/\s*\[\d+\]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeForMatch(value: string) {
  return cleanSearchPart(value)
    .toLowerCase()
    .replace(/đ/g, "dj")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function scoreVideo(item: YoutubeSearchItem, artist: string, song: string) {
  const title = normalizeForMatch(item.snippet?.title ?? "")
  const channel = normalizeForMatch(item.snippet?.channelTitle ?? "")
  const description = normalizeForMatch(item.snippet?.description ?? "")
  const haystack = `${title} ${channel} ${description}`
  const cleanArtist = normalizeForMatch(artist)
  const cleanSong = normalizeForMatch(song)

  let score = 0

  if (title.includes(cleanSong)) score += 70
  if (haystack.includes(cleanArtist)) score += 45
  if (channel.includes(cleanArtist)) score += 35
  if (channel.includes("official")) score += 25
  if (channel.includes("topic")) score += 20
  if (title.includes("official")) score += 15
  if (title.includes("audio")) score += 10

  if (title.includes("cover")) score -= 45
  if (title.includes("karaoke")) score -= 45
  if (title.includes("instrumental")) score -= 35
  if (title.includes("lesson")) score -= 35
  if (title.includes("akordi")) score -= 25
  if (title.includes("tekst")) score -= 20

  return score
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const song = searchParams.get("song")
  const artist = searchParams.get("artist")

  if (!song || !artist) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const cleanSong = cleanSearchPart(song)
  const cleanArtist = cleanSearchPart(artist)
  const query = `${cleanArtist} ${cleanSong} official audio`

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=8&order=relevance&q=${encodeURIComponent(
      query
    )}&key=${process.env.YOUTUBE_API_KEY}`
  )

  const data = await res.json()
  const items = (data.items ?? []) as YoutubeSearchItem[]

  if (items.length === 0) {
    return NextResponse.json({ embedUrl: null })
  }

  const bestVideo = items
    .filter((item) => item.id?.videoId)
    .sort((a, b) => scoreVideo(b, cleanArtist, cleanSong) - scoreVideo(a, cleanArtist, cleanSong))[0]

  const videoId = bestVideo?.id?.videoId

  if (!videoId) {
    return NextResponse.json({ embedUrl: null })
  }

  return NextResponse.json({
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  })
}
