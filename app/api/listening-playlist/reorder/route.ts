import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PUT(req: Request) {
  try {
    const body = await req.json()

    const { playlistId, items } = body

    if (!playlistId || !items?.length) {
      return NextResponse.json(
        { error: "Missing data" },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      items.map((id: string, index: number) =>
        prisma.listeningItem.update({
          where: { id },
          data: {
            order: index,
          },
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("REORDER ERROR:", error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}