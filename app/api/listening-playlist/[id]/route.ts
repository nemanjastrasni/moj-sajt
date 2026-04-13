import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(req: Request, context: any) {
  const id = String(context.params.id)

  try {
    // prvo obriši iteme
    await prisma.listeningItem.deleteMany({
      where: { playlistId: id },
    })

    // onda playlistu (safe)
    const result = await prisma.listeningPlaylist.deleteMany({
      where: { id },
    })

    console.log("DELETE RESULT:", result)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("DELETE ERROR FULL:", e)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}