import { NextResponse } from "next/server"
import { readPublicBranding } from "@/lib/branding/server"

export const dynamic = "force-dynamic"
export async function GET() {
  try { return NextResponse.json(await readPublicBranding(), { headers: { "Cache-Control": "no-store" } }) }
  catch { return NextResponse.json({ error: "Podešavanja trenutno nisu dostupna." }, { status: 503, headers: { "Cache-Control": "no-store" } }) }
}
