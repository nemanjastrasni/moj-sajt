"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { loadPerformance } from "@/lib/performance/client"
import type { PerformanceSnapshot } from "@/lib/performance/model"
import usePlaylistSongSettings from "./usePlaylistSongSettings"
import useSongCapo from "./useSongCapo"
import PlaylistSettingsStatus from "./PlaylistSettingsStatus"
import { parseSongSheet } from "@/lib/chords/songSheet"
import PerformanceView from "./PerformanceView"

export default function PlaylistPerformance({ playlistId, initialSong }: { playlistId: string; initialSong?: string }) {
  const router = useRouter(), { data: session, status } = useSession()
  const [snapshot, setSnapshot] = useState<{ key: string; data: PerformanceSnapshot | null; error: string } | null>(null)
  const [selected, setSelected] = useState(initialSong), [retry, setRetry] = useState(0)
  const requestKey = JSON.stringify([playlistId, selected, retry, status, session?.user?.id])
  const current = snapshot?.key === requestKey ? snapshot.data : null
  const loading = status === "loading" || snapshot?.key !== requestKey
  const error = snapshot?.key === requestKey ? snapshot.error : ""
  const controls = usePlaylistSongSettings(playlistId, current?.current.id ?? "")
  const lyrics = current?.current.lyrics ?? ""
  const lines = useMemo(() => parseSongSheet(lyrics), [lyrics])
  const capo = useSongCapo(current?.current.id ?? "", lines, controls.transpose, undefined, { value: controls.capo, change: controls.changeCapo })
  useEffect(() => {
    if (status === "loading") return
    const controller = new AbortController()
    void loadPerformance(playlistId, selected, controller.signal).then(data => {
      if (!controller.signal.aborted) setSnapshot({ key: requestKey, data, error: "" })
    }).catch(cause => {
      if (!controller.signal.aborted) setSnapshot({ key: requestKey, data: null, error: cause instanceof Error ? cause.message : "Rezim sviranja trenutno nije dostupan." })
    })
    return () => controller.abort()
  }, [playlistId, selected, requestKey, status])
  const index = current ? current.songs.findIndex(song => song.id === current.current.id) : -1
  return <PerformanceView playlistId={playlistId} song={current?.current ?? null} name={current?.name} controls={controls} capoControl={capo} settingsTools={<PlaylistSettingsStatus controls={controls} />} leaveGuard={controls.canLeave} loading={loading || controls.phase === "loading"} error={error} close={() => router.replace(`/plejliste/${encodeURIComponent(playlistId)}`)} retry={() => setRetry(value => value + 1)}
    position={index >= 0 ? index : undefined} total={current?.songs.length ?? 0}
    previous={current && index > 0 ? () => setSelected(current.songs[index - 1].id) : undefined}
    next={current && index >= 0 && index < current.songs.length - 1 ? () => setSelected(current.songs[index + 1].id) : undefined}
  />
}
