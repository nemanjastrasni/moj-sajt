import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE(
  req: Request,
  { params }: any
) {
  try {
    await prisma.listeningPlaylist.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "fail" }, { status: 500 })
  }
}