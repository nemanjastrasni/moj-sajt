import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { userId } = await req.json()

  await prisma.user.update({
    where: { id: userId },
    data: { banned: true },
  })

  return NextResponse.json({ ok: true })
}