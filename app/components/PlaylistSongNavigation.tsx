"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, ArrowRight, ListMusic, RotateCcw } from "lucide-react"
import { useI18n } from "./UiText"
import { isPlaylistNavigation, type PlaylistNavigation } from "@/lib/playlists/navigation"
import styles from "./PlaylistSongNavigation.module.css"

async function load(id: string, current: string, signal: AbortSignal) {
  const response = await fetch(`/api/playlist/${encodeURIComponent(id)}/navigation?songId=${encodeURIComponent(current)}`, { cache: "no-store", signal })
  const data = await response.json()
  if (!response.ok || !isPlaylistNavigation(data, id, current)) throw Error("navigation unavailable")
  return data
}
export default function PlaylistSongNavigation({ playlistId, songId, blocked = false }: { playlistId: string; songId: string; blocked?: boolean }) {
  const { t } = useI18n(), { data: session, status } = useSession()
  const scope = JSON.stringify([playlistId, songId, status, session?.user?.id])
  const [state, setState] = useState<{ scope: string; data?: PlaylistNavigation; error?: boolean }>({ scope })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (status === "loading") return
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    let alive = true
    void load(playlistId, songId, controller.signal).then(data => { if (alive) setState({ scope, data }) }).catch(() => { if (alive) setState({ scope, error: true }) }).finally(() => clearTimeout(timer))
    return () => { alive = false; clearTimeout(timer); controller.abort() }
  }, [scope, playlistId, songId, retry, status])
  const data = state.scope === scope ? state.data : undefined
  const error = state.scope === scope && state.error
  const index = data?.songs.findIndex(song => song.id === songId) ?? -1
  function guard(event: React.MouseEvent<HTMLAnchorElement>) { if (blocked) event.preventDefault() }
  // Ordinary links also pass through the shared playlist autosave navigation guard.
  return <nav className={styles.nav} aria-label={t("Pesme u plejlisti")}>
    <Link href={`/plejliste/${encodeURIComponent(playlistId)}`} className={styles.name} onClick={guard} aria-disabled={blocked}>
      <ListMusic size={18} aria-hidden="true" /><span translate="no">{data?.name ?? t("Playlista")}</span>
    </Link>
    {data ? <span className={styles.position} aria-live="polite">{index + 1} / {data.songs.length}</span> : <span role="status" className={styles.status}>{t(error ? "Navigacija plejliste nije dostupna." : "Ucitavam playlistu...")}</span>}
    <div className={styles.actions}>
      {error && <button type="button" className="ui-button" aria-label={t("Pokusaj ponovo")} title={t("Pokusaj ponovo")} onClick={() => { setState({ scope }); setRetry(value => value + 1) }}><RotateCcw size={18} /></button>}
      {([-1, 1] as const).map(direction => {
        const target = data?.songs[index + direction], label = t(direction === -1 ? "Prethodna pesma" : "Sledeca pesma"), Icon = direction === -1 ? ArrowLeft : ArrowRight
        return target && !blocked ? <Link key={direction} href={target.href} prefetch={false} className="ui-button" aria-label={label} title={`${label}: ${target.title}`} onClick={guard}><Icon size={18} /></Link> : <button key={direction} type="button" className="ui-button" disabled aria-label={label} title={label}><Icon size={18} /></button>
      })}
    </div>
  </nav>
}
