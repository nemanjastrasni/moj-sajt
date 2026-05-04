import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const song = searchParams.get("song")
  const artist = searchParams.get("artist")

  console.log("SONG:", song)
  console.log("ARTIST:", artist)

  if (!song || !artist) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const query = `${artist} ${song}`

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${process.env.YOUTUBE_API_KEY}`
  )

  const data = await res.json()

  console.log("YT DATA:", data)

  if (!data.items || data.items.length === 0) {
    return NextResponse.json({ embedUrl: null })
  }

  const videoId = data.items[0].id.videoId

  return NextResponse.json({
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  })
}