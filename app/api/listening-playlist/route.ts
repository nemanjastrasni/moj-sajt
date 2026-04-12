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
        userId: "demo-user", // kasnije stavi session user
      },
    })

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/listening-playlist/${playlist.id}`
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )
  }
}
export async function GET() {
  return NextResponse.json({ ok: true })
}