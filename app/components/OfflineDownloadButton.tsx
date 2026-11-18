"use client"
import { useEffect, useRef, useState } from "react"
import { isOfflinePlaylist, MAX_OFFLINE_BYTES, offlineSignature } from "@/lib/offline/model"
import { OFFLINE_EVENT, offlineEpoch, prepareOfflineShell, readOfflineLists, removeOfflineList, saveOfflineList } from "@/lib/offline/store"
import type { PlaylistSongItem } from "./PlaylistClient"

export default function OfflineDownloadButton({ playlistId, name, songs, disabled }: { playlistId: string; name: string; songs: PlaylistSongItem[]; disabled: boolean }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [saved, setSaved] = useState<{ signature: string; savedAt: string } | null>(null)
  const request = useRef<AbortController | null>(null), mounted = useRef(true)
  const signature = offlineSignature(playlistId, name, songs.map(item => ({ id: item.songId, transpose: item.settings?.transpose ?? 0, capo: item.settings?.capo ?? null })))
  useEffect(() => {
    mounted.current = true
    const refresh = () => { void readOfflineLists().then(lists => { if (mounted.current) setSaved(lists.find(list => list.id === playlistId) ?? null) }).catch(() => {}) }
    refresh(); window.addEventListener(OFFLINE_EVENT, refresh)
    return () => { mounted.current = false; request.current?.abort(); request.current = null; window.removeEventListener(OFFLINE_EVENT, refresh) }
  }, [playlistId])
  async function download() {
    if (request.current) return
    const controller = new AbortController(); request.current = controller; setBusy(true); setMessage("Preuzimam listu i pripremam aplikaciju…")
    const timer = setTimeout(() => controller.abort(), 90000)
    try {
      const epoch = offlineEpoch()
      const response = await fetch(`/api/playlist/${encodeURIComponent(playlistId)}/offline`, { cache: "no-store", credentials: "same-origin", signal: controller.signal })
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status) && saved) await removeOfflineList(playlistId)
        const error = await response.json().catch(() => null)
        throw Error(typeof error?.error === "string" ? error.error : "Preuzimanje nije uspelo.")
      }
      const body = await response.text()
      if (new Blob([body]).size > MAX_OFFLINE_BYTES) throw Error("Lista je prevelika za preuzimanje.")
      const snapshot: unknown = JSON.parse(body)
      if (!isOfflinePlaylist(snapshot) || snapshot.id !== playlistId) throw Error("Preuzeti podaci nisu potpuni.")
      await prepareOfflineShell()
      if (controller.signal.aborted) throw Error("Preuzimanje je prekinuto.")
      await saveOfflineList(snapshot, epoch)
      void navigator.storage?.persist?.().catch(() => false)
      if (mounted.current) { setSaved(snapshot); setMessage(`Sačuvano ${snapshot.songs.length} od ${snapshot.songs.length} pesama. Dostupno bez interneta.`) }
    } catch (error) { if (mounted.current) setMessage(error instanceof Error && error.name !== "AbortError" ? error.message : "Preuzimanje je prekinuto. Prethodna kopija ostaje dostupna.") }
    finally { clearTimeout(timer); if (request.current === controller) { request.current = null; if (mounted.current) setBusy(false) } }
  }
  return <section aria-label="Offline kopija" style={{ marginBlock: 16 }}>
    <button type="button" className="ui-button" disabled={busy || disabled || !songs.length} onClick={() => void download()}>{busy ? "Pripremam offline kopiju…" : saved ? "Osveži offline kopiju" : "Sačuvaj listu za offline"}</button>{" "}<a className="ui-button" href="/offline">Otvori offline pesme</a>
    {saved && <p>{saved.signature !== signature ? "Lista je promenjena — osveži offline kopiju." : "Offline kopija je sačuvana."} Preuzeto: {new Date(saved.savedAt).toLocaleString("sr-Latn")}.</p>}
    <p style={{ fontSize: 13 }}>Kopija se čuva samo na ovom uređaju i otvara bez nove prijave. Na deljenom uređaju ukloni kopije posle korišćenja. Osveži ih pre puta radi najnovijih tekstova. Do 100 pesama po listi; YouTube zahteva internet.</p>
    {message && <p role="status">{message}</p>}
  </section>
}
