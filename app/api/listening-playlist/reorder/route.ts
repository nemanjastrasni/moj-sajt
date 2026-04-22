import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { id, direction } = await req.json()

  const item = await prisma.listeningItem.findUnique({
    where: { id },
  })

  if (!item) return NextResponse.json({ error: "not found" })

  const swapWith = await prisma.listeningItem.findFirst({
    where: {
      playlistId: item.playlistId,
      order: direction === "up" ? item.order - 1 : item.order + 1,
    },
  })

  if (!swapWith) return NextResponse.json({ ok: true })

  await prisma.$transaction([
    prisma.listeningItem.update({
      where: { id: item.id },
      data: { order: swapWith.order },
    }),
    prisma.listeningItem.update({
      where: { id: swapWith.id },
      data: { order: item.order },
    }),
  ])

  return NextResponse.json({ ok: true })
}