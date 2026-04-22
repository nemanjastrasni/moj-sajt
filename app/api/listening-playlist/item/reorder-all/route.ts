import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const { items } = await req.json()

    await prisma.$transaction(
      items.map((item: any) =>
        prisma.listeningItem.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "fail" }, { status: 500 })
  }
}