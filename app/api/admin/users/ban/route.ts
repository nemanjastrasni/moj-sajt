import { prisma } from "@/lib/prisma"
import { adminSameOrigin, adminSongFailure, requireSongAdmin } from "@/lib/adminSongs/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const actor = await requireSongAdmin()
    adminSameOrigin(req)
    const isJson = req.headers.get("content-type")?.includes("application/json")
    let userId: unknown
    try {
      userId = isJson ? (await req.json()).userId : (await req.formData()).get("userId")
    } catch {
      return NextResponse.json({ error: "Neispravni podaci." }, { status: 400 })
    }
    if (typeof userId !== "string" || !userId.trim() || userId.length > 128 || userId === actor.id) {
      return NextResponse.json({ error: "Neispravan korisnik." }, { status: 400 })
    }
    const result = await prisma.user.updateMany({
      where: { id: userId },
      data: { banned: true },
    })
    if (!result.count) return NextResponse.json({ error: "Korisnik nije pronadjen." }, { status: 404 })
    return isJson
      ? NextResponse.json({ ok: true })
      : NextResponse.redirect(new URL("/admin/korisnici", req.url), 303)
  } catch (error) { return adminSongFailure(error) }
}
