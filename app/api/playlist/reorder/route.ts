import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(req: Request) {
  const { items, playlistId } = await req.json()

  await Promise.all(
    items.map((item: any) =>
      prisma.playlistSong.update({
        where: { id: item.id },
        data: { order: item.order },
      })
    )
  )

  // 🔥 KLJUČNO
  revalidatePath(`/plejliste/${playlistId}`)

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const { playlistId, songId, direction } = await req.json()

  const current = await prisma.playlistSong.findUnique({
    where: {
      playlistId_songId: { playlistId, songId },
    },
  })

  if (!current) return NextResponse.json({ ok: false })

  const currentOrder = current.order ?? 0

const swapWith = await prisma.playlistSong.findFirst({
  where: {
    playlistId,
    order:
      direction === "up"
        ? { lt: currentOrder }
        : { gt: currentOrder },
  },
  orderBy: {
    order: direction === "up" ? "desc" : "asc",
  },
})

  if (!swapWith) return NextResponse.json({ ok: false })

  await prisma.$transaction([
    prisma.playlistSong.update({
      where: {
        playlistId_songId: { playlistId, songId },
      },
      data: { order: swapWith.order },
    }),
    prisma.playlistSong.update({
      where: {
        playlistId_songId: {
          playlistId: swapWith.playlistId,
          songId: swapWith.songId,
        },
      },
      data: { order: current.order },
    }),
  ])

  return NextResponse.json({ ok: true })
}