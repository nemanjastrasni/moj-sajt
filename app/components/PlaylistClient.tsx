"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, useSortable, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Download, FileDown, Globe, GripVertical, LoaderCircle, LockKeyhole, RefreshCw, Trash2 } from "lucide-react"
import { useI18n } from "./UiText"
import { playlistPdfSongs, playlistRequest } from "@/lib/playlists/client"
import { downloadPdf, pdfError, preparePdfDownload } from "@/lib/songbook/client"
import { MAX_BOOK_SONGS } from "@/lib/songbook/model"
import styles from "./PlaylistClient.module.css"
import { playlistSongHref } from "@/lib/navigation/parent"

export type PlaylistSongItem = {
  id: string; songId: string; playlistId: string; order: number | null
  song: { title: string; slug: string; category: string; artist: { name: string; slug: string } }
}
function SongLink({ item }: { item: PlaylistSongItem }) {
  return <Link href={playlistSongHref(item.song, "/plejliste/" + encodeURIComponent(item.playlistId))} translate="no">
    <span className={styles.muted}>{item.song.artist.name}</span>{" - "}{item.song.title}
  </Link>
}
function SortableItem({ item, disabled, remove }: { item: PlaylistSongItem; disabled: boolean; remove: () => void }) {
  const { t } = useI18n()
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id, disabled })
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={styles.row}>
    <button type="button" {...attributes} {...listeners} disabled={disabled} className={styles.icon + " " + styles.drag} title={t("Promeni redosled pesme")} aria-label={t("Promeni redosled pesme") + ": " + item.song.title}><GripVertical /></button>
    <SongLink item={item} />
    <button type="button" disabled={disabled} onClick={remove} className={styles.icon + " " + styles.remove} title={t("Ukloni iz playliste")} aria-label={t("Ukloni iz playliste") + ": " + item.song.title}><Trash2 /></button>
  </div>
}

export default function PlaylistClient({ playlistId, name, initialPublic, canEdit, initialSongs }: {
  playlistId: string; name: string; initialPublic: boolean; canEdit: boolean; initialSongs: PlaylistSongItem[]
}) {
  const { t, locale } = useI18n(), router = useRouter()
  const [songs, setSongs] = useState(initialSongs), [isPublic, setPublic] = useState(initialPublic)
  const [busy, setBusy] = useState<"pdf" | "save" | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState("")
  const [progress, setProgress] = useState(0), [file, setFile] = useState<{ url: string; filename: string; key: string } | null>(null)
  const running = useRef(false), alive = useRef(true)
  const key = JSON.stringify([songs.map(song => song.songId), locale])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url) }, [file])
  function begin(type: "pdf" | "save") {
    if (running.current) return false
    running.current = true; setBusy(type); setError(""); setNotice("")
    return true
  }
  function finish() { running.current = false; if (alive.current) setBusy(null) }
  async function privacy() {
    if (!canEdit || !begin("save")) return
    try {
      const data = await playlistRequest<{ id: string; isPublic: boolean }>("/api/playlist", "PATCH", { playlistId, isPublic: !isPublic })
      if (data.id !== playlistId || typeof data.isPublic !== "boolean") throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
      if (alive.current) { setPublic(data.isPublic); setNotice(data.isPublic ? "Playlista je sada javna." : "Playlista je sada privatna.") }
    } catch (cause) { if (alive.current) setError(pdfError(cause)) }
    finally { finish() }
  }
  async function exportPdf() {
    if (!begin("pdf")) return
    setProgress(0)
    try {
      const data = await playlistPdfSongs(playlistId, songs.map(song => song.songId))
      const result = await preparePdfDownload(data.songs, { title: data.name, fontSize: 11, book: true, contents: true, locale }, done => { if (alive.current) setProgress(done) })
      if (!alive.current) { URL.revokeObjectURL(result.url); return }
      setFile({ ...result, key }); downloadPdf(result)
    } catch (cause) { if (alive.current) setError(pdfError(cause)) }
    finally { finish() }
  }
  async function remove(item: PlaylistSongItem) {
    if (!canEdit || !window.confirm(t("Ukloniti pesmu iz playliste?")) || !begin("save")) return
    try {
      const data = await playlistRequest("/api/playlist", "DELETE", { playlistId, songId: item.songId })
      if (data.ok !== true) throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
      if (alive.current) setSongs(current => current.filter(song => song.id !== item.id))
    } catch (cause) { if (alive.current) setError(pdfError(cause)) }
    finally { finish() }
  }
  async function reorder({ active, over }: DragEndEvent) {
    if (!canEdit || !over || active.id === over.id) return
    const from = songs.findIndex(song => song.id === active.id), to = songs.findIndex(song => song.id === over.id)
    if (from < 0 || to < 0 || !begin("save")) return
    const before = songs, ordered = arrayMove(songs, from, to)
    setSongs(ordered)
    try {
      const data = await playlistRequest("/api/playlist/reorder", "POST", { playlistId, items: ordered.map((song, order) => ({ id: song.id, order })) })
      if (data.ok !== true) throw new Error("Promena nije uspela. Osvezi playlistu i pokusaj ponovo.")
    } catch (cause) { if (alive.current) { setSongs(before); setError(pdfError(cause)) } }
    finally { finish() }
  }
  const tooMany = songs.length > MAX_BOOK_SONGS
  return <section className={styles.page} aria-busy={Boolean(busy)}>
    <div className={styles.header}>
      <h1 translate="no">{name}</h1>
      <div className={styles.actions}>
        <button type="button" onClick={() => void exportPdf()} disabled={Boolean(busy) || !songs.length || tooMany} className={styles.button} title={t("Preuzmi celu playlistu kao PDF")} aria-label={t("Preuzmi celu playlistu kao PDF")}>
          {busy === "pdf" ? <LoaderCircle className="animate-spin" /> : <FileDown />}PDF
        </button>
        {canEdit ? <button type="button" role="switch" aria-checked={isPublic} aria-label={t("Javna playlista")} disabled={Boolean(busy)} onClick={() => void privacy()} className={styles.privacy} title={t(isPublic ? "Svako sa linkom moze da vidi playlistu." : "Samo ti mozes da vidis playlistu.")}>
          {isPublic ? <Globe /> : <LockKeyhole />}<span className={styles.track} aria-hidden="true" />{t(isPublic ? "Javna" : "Privatna")}
        </button> : <span className={styles.privacy}>{isPublic ? <Globe /> : <LockKeyhole />}{t(isPublic ? "Javna" : "Privatna")}</span>}
      </div>
    </div>
    {tooMany && <p className={styles.notice}>{t("PDF playlista moze imati od 1 do 100 pesama.")}</p>}
    {notice && <p role="status" className={styles.status}>{t(notice)}</p>}
    {busy && <p role="status" className={styles.status}>{busy === "pdf" ? t("Pripremam PDF...") + " " + progress + " / " + songs.length : t("Cuvam...")}</p>}
    {error && <div role="alert" className={styles.error}><p>{t(error)}</p><button type="button" onClick={() => router.refresh()} disabled={Boolean(busy)} className={styles.button}><RefreshCw />{t("Osvezi playlistu")}</button></div>}
    {file?.key === key && <a href={file.url} download={file.filename} className={styles.button}><Download />{t("Preuzmi PDF")}</a>}
    {!songs.length && <p>{t("Nema pesama.")}</p>}
    {canEdit ? <DndContext id={"playlist-" + playlistId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={event => void reorder(event)}>
      <SortableContext items={songs.map(song => song.id)} strategy={verticalListSortingStrategy}>
        {songs.map(item => <SortableItem key={item.id} item={item} disabled={Boolean(busy)} remove={() => void remove(item)} />)}
      </SortableContext>
    </DndContext> : songs.map(item => <div key={item.id} className={styles.row}><SongLink item={item} /></div>)}
  </section>
}
