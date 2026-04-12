import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const formData = await req.formData()

  const playlistId = formData.get("playlistId") as string
  const url = formData.get("url") as string

  if (!url || !playlistId) {
    return NextResponse.json({ error: "missing" }, { status: 400 })
  }

  let platform = "youtube"

  if (url.includes("spotify")) {
    platform = "spotify"
  }

  await prisma.listeningItem.create({
    data: {
      playlistId,
      url,
      platform,
      title: url, // kasnije auto title
    },
  })

  return NextResponse.redirect(
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/listening-playlist/${playlistId}`
  )
}