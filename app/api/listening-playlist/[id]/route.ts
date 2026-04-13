import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request, context: any) {
  const id = String(context.params.id)

  try {
    await prisma.listeningItem.delete({
      where: { id },
    })

    return NextResponse.redirect(
      new URL("/listening-playlist", req.url)
    )
  } catch (e) {
    console.error("DELETE ITEM ERROR:", e)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}