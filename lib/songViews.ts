import { after } from "next/server"
import { prisma } from "@/lib/prisma"

export function shouldCountSongView(headers: Pick<Headers, "get">) {
  return headers.get("next-router-prefetch") !== "1" && headers.get("x-middleware-prefetch") !== "1"
    && !/\bprefetch\b/i.test([headers.get("purpose"), headers.get("sec-purpose")].join(" "))
    && !/bot|crawler|spider|slurp|facebookexternalhit|bingpreview|headlesschrome|lighthouse/i.test(headers.get("user-agent") ?? "")
}
export function countSongViewAfterResponse(id: string, headers: Pick<Headers, "get">) {
  if (!shouldCountSongView(headers)) return
  after(async () => {
    try { await prisma.song.update({ where: { id }, data: { popularity: { increment: 1 } } }) }
    catch { console.warn("Song view counter was not updated.") }
  })
}
