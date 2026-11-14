import { NextResponse } from "next/server"
import { isSameOrigin, publicRequestOrigin } from "@/lib/auth/origin.cjs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getPresenceCounts, recordPresence, visitorId } from "@/lib/presence/server"

export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "no-store" }
const unavailable = () => NextResponse.json({ error: "Presence unavailable" }, { status: 503, headers })

export async function GET() {
  try {
    return NextResponse.json(await getPresenceCounts(), { headers })
  } catch {
    return unavailable()
  }
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Not allowed" }, { status: 403, headers })
  try {
    const session = await getServerSession(authOptions)
    const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)ga_visitor=([^;]+)/)?.[1]
    const id = visitorId(cookie)
    await recordPresence(id, session?.user?.id ?? null, process.env.VERCEL === "1" ? req.headers.get("x-vercel-ip-country") : null)
    const res = NextResponse.json(await getPresenceCounts(), { headers })
    res.cookies.set("ga_visitor", id, { httpOnly: true, secure: publicRequestOrigin(req)?.startsWith("https:") === true, sameSite: "lax", maxAge: 30 * 60, path: "/" })
    return res
  } catch {
    return unavailable()
  }
}
