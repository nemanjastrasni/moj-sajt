import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request, context: any) {
  try {
    const { id } = context.params
    const formData = await req.formData()
    const name = formData.get("name") as string
    const category =
  (formData.get("category") as string) || "Mix"

    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 })
    }

    await prisma.listeningPlaylist.update({
      where: { id },
      data: {
  name,
  category,
},
    })

    return NextResponse.redirect(
      new URL(`/listening-playlist/${id}`, req.url)
    )

  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "fail" }, { status: 500 })
  }
}