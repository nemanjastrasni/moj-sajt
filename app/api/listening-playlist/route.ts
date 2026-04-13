import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const name = formData.get("name") as string

    if (!name) {
      return NextResponse.json(
        { error: "Missing name" },
        { status: 400 }
      )
    }

    const playlist = await prisma.listeningPlaylist.create({
      data: {
        name,
      },
    })

    return NextResponse.redirect(
  new URL("/listening-playlist", req.url)
)
  } catch (error) {
    console.error("PLAYLIST ERROR FULL:", error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}