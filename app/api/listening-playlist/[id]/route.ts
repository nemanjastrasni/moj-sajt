import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(req: Request, context: any) {
  try {
    const id = context.params.id

    await prisma.listeningPlaylist.delete({
      where: { id },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "fail" }, { status: 500 })
  }
}