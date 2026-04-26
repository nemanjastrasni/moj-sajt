import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { playlistSongId } = await req.json()

  await prisma.playlistSong.delete({
    where: {
      id: playlistSongId
    }
  })

  return NextResponse.json({ success: true })
}