import { prisma } from "@/lib/prisma"
import { parseMusicUrl } from "@/lib/parseMusicUrl"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { playlistId, url } = body

    if (!playlistId || !url) {
      return NextResponse.json(
        { error: "Missing playlistId or url" },
        { status: 400 }
      )
    }

    const parsed = parseMusicUrl(url)

    if (!parsed) {
      return NextResponse.json(
        { error: "Nevažeći link" },
        { status: 400 }
      )
    }

    const item = await prisma.listeningItem.create({
      data: {
        playlistId,
        url,
        type: parsed.type,
        title: "",
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}