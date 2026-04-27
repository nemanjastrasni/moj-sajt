import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ isFav: false })
  }

  const { searchParams } = new URL(req.url)
  const songId = searchParams.get("songId")

  if (!songId) {
    return NextResponse.json({ isFav: false })
  }

  const userId = (session.user as any).id

  const fav = await prisma.favorite.findUnique({
    where: {
      userId_songId: {
        userId,
        songId,
      },
    },
  })

  console.log("CHECK FAVORITE:", {
    userId,
    songId,
    isFav: !!fav,
  })

  return NextResponse.json({
    isFav: !!fav,
  })
}