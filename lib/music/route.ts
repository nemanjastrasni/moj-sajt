import { NextRequest, NextResponse } from "next/server"
import { resolveMusic } from "@/lib/music/resolver"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const artist = searchParams.get("artist")
    const title = searchParams.get("title")

    if (!artist || !title) {
      return NextResponse.json(
        { error: "Missing params" },
        { status: 400 }
      )
    }

    const result = await resolveMusic(artist, title)

    return NextResponse.json(result || {})
  } catch (error) {
    console.error("Music API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}