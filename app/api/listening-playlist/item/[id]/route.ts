import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(
  req: Request,
  { params }: any
) {
  try {
    const id = String(params.id)

    await prisma.listeningItem.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("DELETE ITEM ERROR:", error)

    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: any
) {
  try {
    const id = String(params.id)

    const item = await prisma.listeningItem.findUnique({
      where: { id },
    })

    if (!item) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      )
    }

    await prisma.listeningItem.delete({
      where: { id },
    })

    return NextResponse.redirect(
      new URL(
        `/listening-playlist/${item.playlistId}`,
        req.url
      )
    )
  } catch (error) {
    console.error("DELETE ITEM ERROR:", error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}