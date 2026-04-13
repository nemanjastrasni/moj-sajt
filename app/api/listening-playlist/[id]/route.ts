import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(req: Request, context: any) {
  const id = context.params.id

  console.log("DELETE PLAYLIST:", id)

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