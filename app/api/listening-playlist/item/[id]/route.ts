import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// DELETE (AJAX - dugme)
export async function DELETE(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params

    await prisma.listeningItem.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "error" }, { status: 500 })
  }
}

// POST (form submit fallback)
export async function POST(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params

    const item = await prisma.listeningItem.findUnique({
      where: { id },
    })

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.listeningItem.delete({
      where: { id },
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