"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, BookOpen, Download, LoaderCircle, Plus, X } from "lucide-react"
import { useI18n } from "./UiText"
import SongbookNumber from "./SongbookNumber"
import { emptyBook, MAX_BOOK_SONGS, moveBookEntry, restoreBookDraft, type BookDraft } from "@/lib/songbook/model"
import { downloadPdf, favoritePdfSongs, pdfError, preparePdfDownload } from "@/lib/songbook/client"
import styles from "./FavoriteSongbook.module.css"

export type FavoriteBookSong = { id: string; title: string; artist: string; href: string }
export default function FavoriteSongbook({ userId, favorites }: { userId: string; favorites: FavoriteBookSong[] }) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false), [draft, setDraft] = useState<BookDraft>(emptyBook)
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [progress, setProgress] = useState(0)
  const [file, setFile] = useState<{ url: string; filename: string; pages: number; key: string } | null>(null)
  const running = useRef(false), alive = useRef(true)
  const available = useMemo(() => new Map(favorites.map(song => [song.id, song])), [favorites])
  const entries = draft.songs.filter(song => available.has(song.id))
  const selected = new Set(entries.map(song => song.id))
  const stored = JSON.stringify({ ...draft, songs: entries }), key = stored + locale
  const storageKey = "gitarakordi-songbook:" + userId
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url) }, [file])
  useEffect(() => { if (open) { try { localStorage.setItem(storageKey, stored) } catch {} } }, [open, stored, storageKey])
  function toggleOpen() {
    if (!open) {
      let raw = null
      try { raw = localStorage.getItem(storageKey) } catch {}
      setDraft(restoreBookDraft(raw, new Set(available.keys())))
    }
    setOpen(value => !value); setError("")
  }
  function toggleSong(id: string) {
    setError("")
    if (!selected.has(id) && entries.length >= MAX_BOOK_SONGS) { setError("Izaberi od 1 do 100 pesama."); return }
    setDraft(current => ({ ...current, songs: selected.has(id) ? entries.filter(song => song.id !== id) : [...entries, { id, transpose: 0 }] }))
  }
  async function exportBook() {
    if (running.current) return
    if (!entries.length) { setError("Izaberi od 1 do 100 pesama."); return }
    running.current = true; setBusy(true); setError(""); setProgress(0)
    try {
      const songs = await favoritePdfSongs(entries)
      const result = await preparePdfDownload(songs, { title: draft.title.trim() || t("Moja pesmarica"), fontSize: draft.fontSize, book: true, contents: draft.contents, locale }, done => { if (alive.current) setProgress(done) })
      if (!alive.current) { URL.revokeObjectURL(result.url); return }
      setFile({ ...result, key }); downloadPdf(result)
    } catch (cause) { if (alive.current) setError(pdfError(cause)) }
    finally { running.current = false; if (alive.current) setBusy(false) }
  }
  return <div className={styles.page}>
    <div className={styles.heading}><h1>{t("Favoriti")}</h1>{favorites.length > 0 && <button type="button" disabled={busy} onClick={toggleOpen} aria-expanded={open} aria-controls="favorite-book-builder" className={styles.button}><BookOpen />{t("PDF knjiga")}</button>}</div>
    {favorites.length === 0 ? <p>{t("Nema omiljenih pesama.")}</p> : <>
      {open && <fieldset id="favorite-book-builder" disabled={busy} className="min-w-0">
        <div className={styles.settings}>
          <label>{t("Naslov knjige")}<input value={draft.title} maxLength={120} placeholder={t("Moja pesmarica")} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} className={styles.input} /></label>
          <label>{t("Velicina teksta")}<SongbookNumber min={8} max={16} value={draft.fontSize} onChange={value => setDraft(current => ({ ...current, fontSize: value }))} className={`${styles.input} ${styles.number}`} /></label>
          <label className={styles.check}><input type="checkbox" checked={draft.contents} onChange={event => setDraft(current => ({ ...current, contents: event.target.checked }))} />{t("Sadrzaj knjige")}</label>
        </div>
        <div className={styles.tools}>
          <button type="button" onClick={() => void exportBook()} disabled={!entries.length} className={`${styles.button} ${styles.primary}`}>{busy ? <LoaderCircle className="animate-spin" /> : <Download />}{busy ? t("Pripremam PDF...") : t("Preuzmi PDF knjigu")}</button>
          <button type="button" className={styles.button} onClick={() => { if (window.confirm(t("Obrisati trenutni nacrt knjige?"))) { setDraft(emptyBook()); setError("") } }}><Plus />{t("Nova knjiga")}</button>
          <span className={styles.muted}>{entries.length} / {MAX_BOOK_SONGS}</span>
        </div>
      </fieldset>}
      {busy && <p role="status" className={styles.status}>{t("Pripremam PDF...")} {progress} / {entries.length}</p>}
      {error && <p role="alert" className={styles.error}>{t(error)}</p>}
      {file?.key === key && <p role="status" className={styles.status}><a href={file.url} download={file.filename} className="underline">{t("Preuzmi PDF")}</a> · {t("Broj stranica")}: {file.pages}</p>}
      <div className={open ? styles.columns : undefined}>
        {open && <section><h2>{t("Izabrane pesme")}</h2>{!entries.length && <p className={styles.muted}>{t("Nema izabranih pesama.")}</p>}
          <ol className={styles.list}>{entries.map((entry, index) => {
            const song = available.get(entry.id)!
            return <li key={entry.id} className={styles.selected}>
              <p translate="no">{index + 1}. {song.title}</p><p className={styles.muted} translate="no">{song.artist}</p>
              <div className={styles.controls}>
                <label>{t("Transpozicija")}<SongbookNumber className={`${styles.input} ${styles.number}`} min={-11} max={11} disabled={busy} label={t("Transpozicija") + ": " + song.title} value={entry.transpose} onChange={value => setDraft(current => ({ ...current, songs: entries.map(item => item.id === entry.id ? { ...item, transpose: value } : item) }))} /></label>
                <button type="button" disabled={busy || index === 0} className={styles.icon} title={t("Pomeri pesmu gore")} aria-label={t("Pomeri pesmu gore") + ": " + song.title} onClick={() => setDraft(current => ({ ...current, songs: moveBookEntry(entries, entry.id, -1) }))}><ArrowUp /></button>
                <button type="button" disabled={busy || index === entries.length - 1} className={styles.icon} title={t("Pomeri pesmu dole")} aria-label={t("Pomeri pesmu dole") + ": " + song.title} onClick={() => setDraft(current => ({ ...current, songs: moveBookEntry(entries, entry.id, 1) }))}><ArrowDown /></button>
                <button type="button" disabled={busy} className={styles.icon} title={t("Ukloni iz knjige")} aria-label={t("Ukloni iz knjige") + ": " + song.title} onClick={() => toggleSong(entry.id)}><X /></button>
              </div>
            </li>
          })}</ol>
        </section>}
        <section>{open && <h2>{t("Favoriti")}</h2>}
          {open && <div className={styles.tools}><button type="button" disabled={busy || favorites.length > MAX_BOOK_SONGS} className={styles.button} onClick={() => setDraft(current => ({ ...current, songs: [...entries, ...favorites.filter(song => !selected.has(song.id)).map(song => ({ id: song.id, transpose: 0 }))] }))}>{t("Izaberi sve")}</button><button type="button" disabled={busy || !entries.length} className={styles.button} onClick={() => setDraft(current => ({ ...current, songs: [] }))}>{t("Ponisti izbor")}</button></div>}
          <ul className={styles.list}>{favorites.map(song => <li key={song.id} className={styles.row}>
            {open && <label className={styles.check}><input type="checkbox" disabled={busy} checked={selected.has(song.id)} onChange={() => toggleSong(song.id)} aria-label={t("Dodaj u PDF knjigu") + ": " + song.title} /></label>}
            <Link href={song.href} translate="no"><span className={styles.muted}>{song.artist}</span><br />{song.title}</Link>
          </li>)}</ul>
        </section>
      </div>
    </>}
  </div>
}
