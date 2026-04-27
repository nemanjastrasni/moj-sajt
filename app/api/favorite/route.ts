import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const { songId } = await req.json()
  const userId = (session.user as any).id

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_songId: {
        userId,
        songId,
      },
    },
  })

  if (existing) {
    await prisma.favorite.delete({
      where: {
        userId_songId: {
          userId,
          songId,
        },
      },
    })

    return NextResponse.json({
      removed: true,
    })
  }

  await prisma.favorite.create({
    data: {
      userId,
      songId,
    },
  })

  await prisma.song.update({
    where: {
      id: songId,
    },
    data: {
      popularity: {
        increment: 1,
      },
    },
  })

  return NextResponse.json({
    added: true,
  })
}

  const { songId } = await req.json()

  const userId = (session.user as any).id

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_songId: {
        userId,
        songId,
      },
    },
  })

  if (existing) {
  await prisma.favorite.delete({
    where: {
      userId_songId: {
        userId,
        songId,
      },
    },
  })

  return NextResponse.json({ removed: true })
}

  const favorite = await prisma.favorite.create({
    data: {
      userId,
      songId,
    },
  })

  return NextResponse.json({ added: true })
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { songId } = await req.json()

  const userId = (session.user as any).id

  await prisma.favorite.delete({
    where: {
      userId_songId: {
        userId,
        songId,
      },
    },
  })

  return NextResponse.json({ success: true })
}