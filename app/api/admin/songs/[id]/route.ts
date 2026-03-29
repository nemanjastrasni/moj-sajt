import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request, { params }: any) {
  const formData = await req.formData()

  const title = formData.get("title") as string
  const category = formData.get("category") as string
  const lyrics = formData.get("lyrics") as string

  await prisma.song.update({
    where: { id: params.id },
    data: {
      ...(title ? { title } : {}),
      ...(category ? { category } : {}),
      ...(lyrics ? { lyrics } : {})
    }
  })

  return NextResponse.redirect(new URL("/admin/edit", req.url))
}