import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!(session?.user as any)?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { playlistId } = await req.json()

  const userId = (session?.user as any)?.id

  const existing = await prisma.listeningPlaylistLike.findUnique({
    where: {
      userId_playlistId: {
        userId,
        playlistId,
      },
    },
  })

  if (existing) {
    await prisma.listeningPlaylistLike.delete({
      where: {
        userId_playlistId: {
          userId,
          playlistId,
        },
      },
    })

    return NextResponse.json({ liked: false })
  }

  await prisma.listeningPlaylistLike.create({
    data: {
      userId,
      playlistId,
    },
  })

  return NextResponse.json({ liked: true })
}