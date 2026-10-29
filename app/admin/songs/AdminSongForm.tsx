"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Save, Eye, EyeOff, ArrowLeft } from "lucide-react"
import SongSheet from "@/app/components/SongSheet"
import { parseSongSheet } from "@/lib/chords/songSheet"
import { submissionCategories } from "@/lib/submissions/validation"
import { MAX_BATCH, validateSongBatch, validateSongEdit } from "@/lib/adminSongs/validation"
import { adminSongRequest } from "@/lib/adminSongs/client"
import styles from "./AdminSongs.module.css"

type Artist = { id: string; name: string; category: string | null }
export type EditableAdminSong = { id: string; title: string; lyrics: string; chords: string | null; category: string; artist: Artist }
type Draft = { key: number; title: string; lyrics: string; chords: string; preview: boolean }
const emptySong = (key: number): Draft => ({ key, title: "", lyrics: "", chords: "", preview: false })

function SongPreview({ lyrics }: { lyrics: string }) {
  const lines = useMemo(() => parseSongSheet(lyrics), [lyrics])
  return <div className={styles.preview}><SongSheet lines={lines} transpose={0} textSize={16} chordSize={16} /></div>
}

export default function AdminSongForm({ initial, returnToSong = false, backHref = "/admin/songs" }: { initial?: EditableAdminSong; returnToSong?: boolean; backHref?: string }) {
  const router = useRouter()
  const nextKey = useRef(1)
  const [artistName, setArtistName] = useState(initial?.artist.name ?? "")
  const [artistId, setArtistId] = useState<string | undefined>(initial?.artist.id)
  const [category, setCategory] = useState(initial?.category ?? "narodne")
  const [songs, setSongs] = useState<Draft[]>(initial ? [{ key: 0, title: initial.title, lyrics: initial.lyrics, chords: initial.chords ?? "", preview: false }] : [emptySong(0)])
  const [artistBio, setArtistBio] = useState("")
  const [artistDiscography, setArtistDiscography] = useState("")
  const [suggestions, setSuggestions] = useState<Artist[]>([])
  const [active, setActive] = useState(-1)
  const [lookupError, setLookupError] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (artistId || artistName.trim().length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/admin/artists?search=" + encodeURIComponent(artistName.trim()), { signal: controller.signal })
        if (!response.ok) throw new Error("Pretraga izvodjaca trenutno nije dostupna.")
        const data: Artist[] = await response.json()
        if (!Array.isArray(data)) throw new Error("Pretraga izvodjaca trenutno nije dostupna.")
        if (!controller.signal.aborted) { setSuggestions(data); setActive(-1); setLookupError("") }
      } catch {
        if (!controller.signal.aborted) { setSuggestions([]); setLookupError("Pretraga izvodjaca trenutno nije dostupna.") }
      }
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [artistName, artistId])

  function choose(artist: Artist) {
    setArtistName(artist.name); setArtistId(artist.id); setSuggestions([]); setLookupError(""); setActive(-1)
    if (artist.category) setCategory(artist.category)
  }
  function update(key: number, patch: Partial<Draft>) { setSongs(current => current.map(song => song.key === key ? { ...song, ...patch } : song)) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError("")
    const common = { artistName, artistId, category }
    let body: unknown
    try { body = initial ? validateSongEdit({ ...common, ...songs[0] }) : validateSongBatch({ ...common, songs, artistBio, artistDiscography }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Proveri podatke."); return }
    setBusy(true)
    try {
      const result = await adminSongRequest(initial ? "/api/admin/songs/" + encodeURIComponent(initial.id) : "/api/admin/songs", initial ? "PATCH" : "POST", body)
      if (returnToSong && result.href) { router.push(result.href); router.refresh(); return }
      setSaved(true); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cuvanje nije uspelo.") }
    finally { setBusy(false) }
  }

  if (saved) return <div className={styles.page}>
    <p role="status" className={styles.success}>{initial ? "Izmene su sacuvane." : `Sacuvano pesama: ${songs.length}.`}</p>
    <Link href="/admin/songs" className={styles.button}><ArrowLeft />Spisak pesama</Link>
  </div>

  return <div className={styles.page}>
    <div className={styles.heading}><h2>{initial ? "Uredi pesmu" : "Nova pesma"}</h2><Link href={backHref} className={styles.button}><ArrowLeft />{returnToSong ? "Nazad na pesmu" : "Spisak pesama"}</Link></div>
    <form onSubmit={submit} className={styles.form}>
      <fieldset disabled={busy}>
        <div className={styles.grid}>
          <div style={{ position: "relative", minWidth: 0 }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSuggestions([]) }}>
            <label htmlFor="song-artist">Izvodjac / grupa</label>
            <input id="song-artist" className={styles.input} required maxLength={200} autoComplete="off" role="combobox" aria-expanded={suggestions.length > 0} aria-controls={suggestions.length ? "artist-suggestions" : undefined} aria-autocomplete="list" aria-activedescendant={suggestions[active] ? `artist-option-${active}` : undefined}
              value={artistName} onChange={event => { setArtistName(event.target.value); setArtistId(undefined); setSuggestions([]); setActive(-1); setLookupError("") }}
              onKeyDown={event => {
                if (event.key === "Escape") { setSuggestions([]); setActive(-1) }
                if (suggestions.length && ["ArrowDown", "ArrowUp"].includes(event.key)) {
                  event.preventDefault()
                  setActive(i => i < 0 ? event.key === "ArrowDown" ? 0 : suggestions.length - 1 : (i + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length)
                }
                if (event.key === "Enter" && active >= 0 && suggestions[active]) { event.preventDefault(); choose(suggestions[active]) }
              }} />
            {suggestions.length > 0 && <div id="artist-suggestions" className={styles.suggestions} role="listbox">{suggestions.map((artist, index) => <button type="button" key={artist.id} id={`artist-option-${index}`} role="option" aria-selected={active === index} onClick={() => choose(artist)}>{artist.name} · {submissionCategories.find(c => c.value === artist.category)?.label || "Bez kategorije"}</button>)}</div>}
          </div>
          <label>Kategorija<select className={styles.input} value={category} onChange={event => setCategory(event.target.value)}>{submissionCategories.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        </div>
        {lookupError && <p role="status" className={styles.count}>{lookupError}</p>}
        {artistId ? <p className={styles.count}><Link href={`/admin/artists/${artistId}/edit`} className="underline">Uredi podatke izvodjaca</Link></p> : !initial && <details className={styles.details}>
          <summary>Podaci novog izvodjaca (opciono)</summary>
          <label>Biografija<textarea rows={4} maxLength={30000} className={styles.input} value={artistBio} onChange={event => setArtistBio(event.target.value)} /></label>
          <label>Diskografija<textarea rows={4} maxLength={100000} placeholder="1974 - Naziv albuma" className={`${styles.input} ${styles.lyrics}`} value={artistDiscography} onChange={event => setArtistDiscography(event.target.value)} /></label>
        </details>}
        {songs.map((song, index) => <section className={styles.song} key={song.key}>
          <div className={styles.heading}><h3>Pesma {index + 1}</h3>{!initial && songs.length > 1 && <button type="button" className={`${styles.icon} ${styles.danger}`} title={`Ukloni unos ${index + 1}`} aria-label={`Ukloni unos ${index + 1}`} onClick={() => setSongs(current => current.filter(item => item.key !== song.key))}><Trash2 /></button>}</div>
          <label>Naziv pesme<input className={styles.input} required maxLength={200} value={song.title} onChange={event => update(song.key, { title: event.target.value })} /></label>
          <label>Tekst sa akordima<textarea required className={`${styles.input} ${styles.lyrics}`} value={song.lyrics} onChange={event => update(song.key, { lyrics: event.target.value })} rows={18} maxLength={100000} wrap="off" spellCheck={false} autoCapitalize="off" autoCorrect="off" /></label>
          {initial?.chords && <details className={styles.details}><summary>Zasebno polje akorda</summary><textarea className={`${styles.input} ${styles.lyrics}`} aria-label="Zasebno polje akorda" value={song.chords} onChange={event => update(song.key, { chords: event.target.value })} rows={4} maxLength={100000} wrap="off" /></details>}
          <div className={styles.actions}><span className={styles.count}>{song.lyrics.length.toLocaleString("sr-Latn")} / 100.000 znakova</span><button type="button" className={styles.button} aria-expanded={song.preview} aria-controls={`song-preview-${song.key}`} onClick={() => update(song.key, { preview: !song.preview })}>{song.preview ? <EyeOff /> : <Eye />}{song.preview ? "Sakrij pregled" : "Pregled rasporeda"}</button></div>
          {song.preview && <div id={`song-preview-${song.key}`}><SongPreview lyrics={song.lyrics} /></div>}
        </section>)}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>{!initial && <button className={styles.button} type="button" disabled={songs.length >= MAX_BATCH} onClick={() => setSongs(current => [...current, emptySong(nextKey.current++)])}><Plus />Dodaj pesmu</button>}
          <button type="submit" disabled={busy} className={`${styles.button} ${styles.primary}`}><Save />{busy ? "Cuvam..." : initial ? "Sacuvaj izmene" : "Sacuvaj pesme"}</button>
        </div>
      </fieldset>
    </form>
  </div>
}
