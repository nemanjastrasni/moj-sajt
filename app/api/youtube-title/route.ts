import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json(
      { error: "No id" },
      { status: 400 }
    )
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${process.env.YOUTUBE_API_KEY}`
  )

  const data = await res.json()

  const item = data.items?.[0]

  if (!item) {
    return NextResponse.json(
      { error: "Video not found" },
      { status: 404 }
    )
  }

  return NextResponse.json({
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    duration: item.contentDetails.duration,
  })
}