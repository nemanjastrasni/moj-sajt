import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// DELETE PLAYLIST
export async function DELETE(req: Request, context: any) {
  const id = String(context.params.id)

  try {
    await prisma.listeningPlaylist.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("DELETE PLAYLIST ERROR:", e)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}