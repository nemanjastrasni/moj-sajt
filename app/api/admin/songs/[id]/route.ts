import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  context: { params: { id: string } }
) {
  const { params } = context

  const formData = await req.formData()

  const category = formData.get("category") as string
  const title = formData.get("title") as string
  const artistId = formData.get("artistId") as string

  await prisma.song.update({
    where: { id: params.id },
    data: {
  ...(category ? { category } : {}),
  ...(title ? { title } : {}),
  ...(artistId ? { artistId } : {})
}
  })

  return NextResponse.redirect(new URL("/admin/edit", req.url))
}