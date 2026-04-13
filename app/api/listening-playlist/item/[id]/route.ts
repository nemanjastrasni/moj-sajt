import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.listeningItem.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "error" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: any) {
  try {
    const item = await prisma.listeningItem.findUnique({
      where: { id: params.id },
    })

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.listeningItem.delete({
      where: { id: params.id },
    })

    return NextResponse.redirect(
      new URL(`/listening-playlist/${item.playlistId}`, req.url)
    )

  } catch (error) {
    console.error("DELETE ITEM ERROR:", error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}