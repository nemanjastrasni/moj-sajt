import { NextResponse } from "next/server"
import { requireSongAdmin } from "@/lib/adminSongs/server"
import { SubmissionError } from "@/lib/submissions/errors"
import { measureProcessMemory } from "@/lib/monitoring/process-memory-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Robots-Tag": "noindex, nofollow" }

export async function GET() {
  try {
    await requireSongAdmin()
    return NextResponse.json(measureProcessMemory(), { headers })
  } catch (error) {
    const status = error instanceof SubmissionError && [401, 403].includes(error.status) ? error.status : 503
    return NextResponse.json({ error: status === 401 ? "Prijavi se kao administrator." : status === 403 ? "Nije dozvoljeno." : "Merenje trenutno nije dostupno. Pokušaj ponovo." }, { status, headers })
  }
}
