"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { rememberPlayback } from "@/lib/performance/recent"

export default function useRememberPerformance(songId: string | undefined, playlistId: string | undefined, unavailable: boolean) {
  const { data: session, status } = useSession(), userId = session?.user?.id
  useEffect(() => {
    if (unavailable || !songId || status !== "authenticated" || !userId) return
    rememberPlayback(userId, playlistId ? { kind: "playlist", playlistId, songId } : { kind: "song", songId })
  }, [songId, playlistId, unavailable, status, userId])
}
