"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Check, ListPlus, Plus, RefreshCw } from "lucide-react"
import { playlistRequest, readPlaylistChoices, type PlaylistChoice } from "@/lib/playlists/client"
import PlaylistDialog from "./PlaylistDialog"
import PlaylistNameDialog from "./PlaylistNameDialog"
import { useI18n } from "./UiText"
import styles from "./PlaylistClient.module.css"

export default function SongPlaylistButton({ songId }: { songId: string }) {
  const { t } = useI18n(), router = useRouter(), { data: session } = useSession()
  const [open, setOpen] = useState(false), [create, setCreate] = useState(false), [choices, setChoices] = useState<PlaylistChoice[]>([])
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("")
  const running = useRef(false)
  async function load() {
    if (running.current) return
    running.current = true; setBusy(true); setError(""); setChoices([])
    try { setChoices(await readPlaylistChoices()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Promena nije uspela. Proveri internet vezu.") }
    finally { running.current = false; setBusy(false) }
  }
  return <>
    <button type="button" className={styles.button} onClick={() => {
      if (!session) { router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`); return }
      setOpen(true); setNotice(""); void load()
    }}><ListPlus />{t("+ Playlist")}</button>
    {notice && <span role="status" className={styles.status}>{t(notice)}</span>}
    {open && <PlaylistDialog title="Dodaj u playlistu" busy={busy} close={() => setOpen(false)}>
      {busy && <p role="status">{t("Cuvam...")}</p>}
      {error && <div role="alert" className={styles.error}><p>{t(error)}</p><button className={styles.button} type="button" disabled={busy} onClick={() => void load()}><RefreshCw />{t("Osvezi playlistu")}</button></div>}
      {!busy && !error && !choices.length && <p className={styles.notice}>{t("Nema playlisti.")}</p>}
      {choices.map(choice => {
        const added = choice.songs.some(item => item.songId === songId)
        return <button type="button" key={choice.id} className={styles.choice} data-added={added} disabled={busy || added} onClick={async () => {
          if (running.current) return
          running.current = true; setBusy(true); setError("")
          try {
            const data = await playlistRequest<{ songId: string; playlistId: string }>("/api/playlist", "PUT", { playlistId: choice.id, songId })
            if (data.songId !== songId || data.playlistId !== choice.id) throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
            setChoices(current => current.map(row => row.id === choice.id ? { ...row, songs: [...row.songs, { songId }] } : row))
            setNotice("Pesma je dodata u playlistu."); setOpen(false)
          } catch (cause) { setError(cause instanceof Error ? cause.message : "Promena nije uspela. Proveri internet vezu.") }
          finally { running.current = false; setBusy(false) }
        }}><span translate="no">{choice.name}</span>{added ? <Check aria-label={t("Vec je dodato")} /> : <Plus />}</button>
      })}
      <button className={styles.button} type="button" disabled={busy} onClick={() => { setOpen(false); setCreate(true) }}><Plus />{t("Nova playlista")}</button>
    </PlaylistDialog>}
    {create && <PlaylistNameDialog close={() => setCreate(false)} save={async name => {
      const data = await playlistRequest<{ id: string; name: string }>("/api/playlist", "POST", { name, category: "mix", songId })
      if (typeof data.id !== "string" || data.name !== name) throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
      setNotice("Playlista je napravljena i pesma je dodata.")
    }} />}
  </>
}
