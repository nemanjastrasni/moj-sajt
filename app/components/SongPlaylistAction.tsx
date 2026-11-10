"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Check, ListPlus, Plus, RefreshCw, Star } from "lucide-react"
import { playlistRequest, readPlaylistChoices, type PlaylistChoice } from "@/lib/playlists/client"
import PlaylistDialog from "./PlaylistDialog"
import PlaylistNameDialog from "./PlaylistNameDialog"
import { useI18n } from "./UiText"
import styles from "./PlaylistClient.module.css"
import type { PlayingValues } from "@/lib/playlists/settings"

type Props = { songId: string; settings?: PlayingValues; disabled?: boolean; initialOpen?: boolean; onClose?: () => void; onMembership?: (added: boolean) => void }
export default function SongPlaylistAction(props: Props) {
  const { data: session, status } = useSession()
  return <PlaylistSongChoice key={JSON.stringify([props.songId, status, session?.user?.id])} {...props} />
}
function PlaylistSongChoice({ songId, settings, disabled = false, initialOpen = false, onClose, onMembership }: Props) {
  const { t } = useI18n(), router = useRouter(), { data: session, status } = useSession()
  const [open, setOpen] = useState(initialOpen), [create, setCreate] = useState(false), [choices, setChoices] = useState<PlaylistChoice[]>([])
  const [busy, setBusy] = useState(false), [error, setError] = useState("")
  const running = useRef(false)
  const scope = JSON.stringify([songId, session?.user?.id])
  const [membership, setMembership] = useState({ scope: "", added: false })
  const addedHere = membership.scope === scope && membership.added
  async function addTo(id: string) {
    if (running.current) return
    running.current = true; setBusy(true); setError("")
    try {
      const data = await playlistRequest<{ songId: string; playlistId: string }>("/api/playlist", "PUT", { playlistId: id, songId, ...(settings ? { settings } : {}) })
      if (data.songId !== songId || data.playlistId !== id) throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
      setChoices(current => current.map(row => row.id === id ? { ...row, songs: [...row.songs, { songId }] } : row))
      setMembership({ scope, added: true }); onMembership?.(true); setOpen(false); onClose?.()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Promena nije uspela. Proveri internet vezu.") }
    finally { running.current = false; setBusy(false) }
  }
  const load = useCallback(async () => {
    if (running.current) return
    running.current = true; setBusy(true); setError(""); setChoices([])
    try { const data = await readPlaylistChoices(); const added = data.some(row => row.songs.some(item => item.songId === songId)); setChoices(data); setMembership({ scope, added }); onMembership?.(added) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Promena nije uspela. Proveri internet vezu.") }
    finally { running.current = false; setBusy(false) }
  }, [songId, scope, onMembership])
  useEffect(() => { if (initialOpen) void load() }, [initialOpen, load])
  return <>
    {!initialOpen && <button type="button" className={styles.button} data-in-playlist={addedHere} title={t(addedHere ? "U tvojim plejlistama" : "Dodaj u playlistu")} disabled={disabled || status === "loading"} onClick={() => {
      if (!session) { router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`); return }
      setOpen(true); void load()
    }}>{addedHere ? <Star fill="currentColor" /> : <ListPlus />}{t("+ Playlist")}</button>}
    {open && <PlaylistDialog title="Dodaj u playlistu" busy={busy} close={() => { setOpen(false); onClose?.() }}>
      {busy && <p role="status">{t("Cuvam...")}</p>}
      {error && <div role="alert" className={styles.error}><p>{t(error)}</p><button className={styles.button} type="button" disabled={busy} onClick={() => void load()}><RefreshCw />{t("Osvezi playlistu")}</button></div>}
      {!busy && !error && !choices.length && <p className={styles.notice}>{t("Nema playlisti.")}</p>}
      {!busy && !error && !choices.some(choice => choice.isFavorites) && <button type="button" className={styles.choice} onClick={async () => {
        if (running.current) return
        running.current = true; setBusy(true); setError("")
        let id: string | undefined
        try { const data = await playlistRequest<{ id: string }>("/api/playlist/omiljene", "POST", {}); if (typeof data.id !== "string") throw Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo."); id = data.id }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Promena nije uspela. Proveri internet vezu.") }
        finally { running.current = false; setBusy(false) }
        if (id) await addTo(id)
      }}><span>{t("Omiljene")}</span><Plus /></button>}
      {choices.map(choice => {
        const added = choice.songs.some(item => item.songId === songId)
        return <button type="button" key={choice.id} className={styles.choice} data-added={added} disabled={busy || added} onClick={async () => {
          await addTo(choice.id)
        }}><span translate="no">{choice.name}</span>{added ? <Check aria-label={t("Vec je dodato")} /> : <Plus />}</button>
      })}
      <button className={styles.button} type="button" disabled={busy} onClick={() => { setOpen(false); setCreate(true) }}><Plus />{t("Nova playlista")}</button>
    </PlaylistDialog>}
    {create && <PlaylistNameDialog close={() => { setCreate(false); onClose?.() }} save={async name => {
      const data = await playlistRequest<{ id: string; name: string }>("/api/playlist", "POST", { name, category: "mix", songId, ...(settings ? { settings } : {}) })
      if (typeof data.id !== "string" || data.name !== name) throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
      setMembership({ scope, added: true })
      onMembership?.(true)
    }} />}
  </>
}
