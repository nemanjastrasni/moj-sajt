import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id

  try {
    await prisma.listeningItem.deleteMany({
      where: { playlistId: id },
    })

    await prisma.listeningPlaylist.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}