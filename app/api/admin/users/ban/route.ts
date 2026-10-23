import { getServerSession } from "next-auth"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Nije dozvoljeno." }, { status: 403 })
  }
  const origin = req.headers.get("origin")
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Nije dozvoljeno." }, { status: 403 })
  }
  const isJson = req.headers.get("content-type")?.includes("application/json")
  let userId: unknown
  try {
    userId = isJson ? (await req.json()).userId : (await req.formData()).get("userId")
  } catch {
    return NextResponse.json({ error: "Neispravni podaci." }, { status: 400 })
  }
  if (typeof userId !== "string" || !userId.trim() || userId.length > 128 || userId === session.user.id) {
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
}
