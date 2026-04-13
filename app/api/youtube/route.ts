import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${process.env.YOUTUBE_API_KEY}`
  )

  const data = await res.json()

  if (!data.items || data.items.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const item = data.items[0]

  return NextResponse.json({
    title: item.snippet.title,
    duration: item.contentDetails.duration,
  })
}