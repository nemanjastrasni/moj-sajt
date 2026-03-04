import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { songId } = await req.json()

  const favorite = await prisma.favorite.create({
    data: {
      userId: (session.user as any).id,
      songId,
    },
  })

  return NextResponse.json(favorite)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { songId } = await req.json()

  await prisma.favorite.delete({
    where: {
      userId_songId: {
        userId: (session.user as any).id,
        songId,
      },
    },
  })

  return NextResponse.json({ success: true })
}