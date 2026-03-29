import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const formData = await req.formData()

  const category = formData.get("category") as string
  const title = formData.get("title") as string
  const artistId = formData.get("artistId") as string

  await prisma.song.update({
    where: { id },
    data: {
      ...(category ? { category } : {}),
      ...(title ? { title } : {}),
      ...(artistId ? { artistId } : {})
    }
  })

  return NextResponse.redirect(new URL("/admin/edit", req.url))
}