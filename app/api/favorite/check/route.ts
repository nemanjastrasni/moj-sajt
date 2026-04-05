import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ isFav: false })

  const { searchParams } = new URL(req.url)
  const songId = searchParams.get("songId")

  const fav = await prisma.favorite.findFirst({
    where: {
      user: { email: session.user.email! },
      songId: songId!
    }
  })

  return Response.json({ isFav: !!fav })
}