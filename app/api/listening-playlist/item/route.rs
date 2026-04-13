import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const playlistId = formData.get("playlistId") as string
    const url = formData.get("url") as string

    if (!playlistId || !url) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    // 🔥 DETEKCIJA PLATFORME
    let type = "youtube"

    if (url.includes("spotify")) {
      type = "spotify"
    }

    await prisma.listeningItem.create({
      data: {
        playlistId,
        url,
        type,
      },
    })

    return NextResponse.redirect(
      new URL(`/listening-playlist/${playlistId}`, req.url)
    )

  } catch (error) {
    console.error("ITEM ERROR:", error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}