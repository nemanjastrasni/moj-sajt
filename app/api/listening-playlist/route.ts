import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const name = formData.get("name") as string

    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 })
    }
    const session = await getServerSession(authOptions)
    const playlist = await prisma.listeningPlaylist.create({
  data: {
    name,
    userId: (session?.user as any)?.id || null,
  },
})

    return NextResponse.redirect(
      new URL(`/listening-playlist/${playlist.id}`, req.url),
      303
    )

  } catch (error) {
    console.error("CREATE ERROR:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}