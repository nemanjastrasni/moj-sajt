"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, Plus, RefreshCw, Search } from "lucide-react"
import { prepareSongQuery, type SongSearchResult } from "@/lib/songSearch"
import { loadSongSearch } from "@/lib/songSearchClient"
import { playlistRequest } from "@/lib/playlists/client"
import type { PlaylistSongItem } from "./PlaylistClient"
import { useI18n } from "./UiText"
import styles from "./PlaylistClient.module.css"

export default function PlaylistSongSearch({ playlistId, songs, disabled, add, startSave, finishSave }: { playlistId: string; songs: PlaylistSongItem[]; disabled: boolean; add: (item: PlaylistSongItem) => void; startSave: () => boolean; finishSave: () => void }) {
  const { t } = useI18n(), [query, setQuery] = useState(""), [retry, setRetry] = useState(0)
  const [snapshot, setSnapshot] = useState<{ key: string; results: SongSearchResult[]; error: string }>({ key: "", results: [], error: "" })
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState("")
  const running = useRef(false)
  const prepared = useMemo(() => { try { return { search: prepareSongQuery(query), error: "" } } catch (cause) { return { search: null, error: (cause as Error).message } } }, [query])
  const key = JSON.stringify([prepared.search?.query, retry]), current = snapshot.key === key
  useEffect(() => {
    if (!prepared.search) return
    const controller = new AbortController(), search = prepared.search
    const timer = setTimeout(async () => {
      try { const results = await loadSongSearch(search.query, controller.signal); if (!controller.signal.aborted) setSnapshot({ key, results, error: "" }) }
      catch (cause) { if (!controller.signal.aborted) setSnapshot({ key, results: [], error: cause instanceof Error ? cause.message : "Pretraga nije uspela. Pokusaj ponovo." }) }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [prepared.search, key])
  const failure = prepared.error || (current ? snapshot.error : "")
  return <section className={styles.search} aria-label={t("Dodaj pesme")}>
    <label className={styles.field}><span><Search size={18} />{t("Dodaj pesme")}</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} maxLength={120} placeholder={t("Pesma ili izvodjac...")} /></label>
    {prepared.search && !current && <p role="status">{t("Trazim...")}</p>}
    {failure && <div role="alert" className={styles.error}><p>{t(failure)}</p>{!prepared.error && <button type="button" className={styles.button} onClick={() => setRetry(value => value + 1)}><RefreshCw />{t("Pokusaj ponovo")}</button>}</div>}
    {error && <p role="alert" className={styles.error}>{t(error)}</p>}
    {notice && <p role="status" className={styles.notice}>{t(notice)}</p>}
    {prepared.search && current && !failure && !snapshot.results.length && <p role="status">{t("Nema pronadjenih pesama.")}</p>}
    {prepared.search && current && <ul className={styles.results}>{snapshot.results.map(song => {
      const exists = songs.some(item => item.songId === song.id)
      return <li className={styles.row} key={song.id}><span className={styles.resultText} translate="no">{song.artist.name}{" - "}{song.title}</span><button type="button" className={styles.icon} disabled={disabled || Boolean(busy) || exists} title={t(exists ? "Vec je dodato" : "Dodaj pesmu")} aria-label={t(exists ? "Vec je dodato" : "Dodaj pesmu") + ": " + song.title} onClick={async () => {
        if (running.current || !startSave()) return
        running.current = true; setBusy(song.id); setError(""); setNotice("")
        try {
          const data = await playlistRequest<{ id: string; playlistId: string; songId: string; order: number }>("/api/playlist", "PUT", { playlistId, songId: song.id })
          if (typeof data.id !== "string" || data.playlistId !== playlistId || data.songId !== song.id || !Number.isSafeInteger(data.order)) throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
          add({ ...data, song }); setNotice("Pesma je dodata u playlistu.")
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Promena nije uspela. Proveri internet vezu.") }
        finally { running.current = false; setBusy(null); finishSave() }
      }}>{exists ? <Check /> : <Plus />}</button></li>
    })}</ul>}
  </section>
}
