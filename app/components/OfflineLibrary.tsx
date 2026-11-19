"use client"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { OFFLINE_EVENT, OFFLINE_OWNER, readOfflineLists, removeOfflineList } from "@/lib/offline/store"
import type { OfflinePlaylist, OfflineSong } from "@/lib/offline/model"
import { parseSongSheet } from "@/lib/chords/songSheet"
import { capoSheet, capoSource } from "@/lib/chords/capoDisplay"
import SongSheet from "./SongSheet"
import styles from "./OfflineLibrary.module.css"

function Player({ list, song, close, select }: { list: OfflinePlaylist; song: OfflineSong; close: () => void; select: (id: string) => void }) {
  const [transpose, setTranspose] = useState(song.transpose), [capo, setCapo] = useState(song.capo), [size, setSize] = useState(18)
  const [chordSize, setChordSize] = useState(18)
  const [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1)
  const lines = useMemo(() => parseSongSheet(song.lyrics || song.chords || ""), [song])
  const source = useMemo(() => capoSource(lines), [lines]), display = capoSheet(lines, transpose, capo, source)
  useEffect(() => {
    if (!playing) return
    let remaining = 0
    const timer = setInterval(() => { remaining += speed * .2; const distance = Math.floor(remaining); if (distance) { window.scrollBy(0, distance); remaining -= distance } }, 60)
    return () => clearInterval(timer)
  }, [playing, speed])
  const index = list.songs.findIndex(item => item.id === song.id)
  return <article>
    <div className={styles.controls}>
      <button className="ui-button" onClick={close}>← Sve liste</button>
      <button className="ui-button" disabled={index === 0} onClick={() => select(list.songs[index - 1].id)}>Prethodna</button>
      <button className="ui-button" disabled={index === list.songs.length - 1} onClick={() => select(list.songs[index + 1].id)}>Sledeća</button>
    </div>
    <h2>{song.title}</h2><p>{song.artist}</p>
    <div className={styles.controls}>
      <button className="ui-button" aria-label="Smanji tonalitet" disabled={transpose <= -11} onClick={() => setTranspose(v => v - 1)}>−</button><span>Ton: {transpose > 0 ? "+" : ""}{transpose}</span><button className="ui-button" aria-label="Povećaj tonalitet" disabled={transpose >= 11} onClick={() => setTranspose(v => v + 1)}>+</button>
      <label>Capo <select disabled={source.ambiguous} value={capo ?? ""} onChange={e => setCapo(e.target.value === "" ? null : Number(e.target.value))}><option value="">Izvorni zapis</option>{Array.from({ length: 13 }, (_, n) => <option key={n} value={n}>{n}</option>)}</select></label>
      <button className="ui-button" aria-pressed={playing} onClick={() => setPlaying(v => !v)}>{playing ? "Pauza" : "Play skrol"}</button>
      <label>Brzina <input aria-label="Brzina skrolovanja" type="range" min={1} max={10} value={speed} onChange={e => setSpeed(Number(e.target.value))} /></label>
      <label>Tekst <input aria-label="Veličina teksta" type="range" min={14} max={32} value={size} onChange={e => setSize(Number(e.target.value))} /></label>
      <label>Akordi <input aria-label="Veličina akorda" type="range" min={14} max={32} value={chordSize} onChange={e => setChordSize(Number(e.target.value))} /></label>
    </div>
    <SongSheet lines={display.lines} transpose={display.shift} textSize={size} chordSize={chordSize} />
  </article>
}
export default function OfflineLibrary() {
  const { data: session, status } = useSession(), [lists, setLists] = useState<OfflinePlaylist[]>([]), [error, setError] = useState(""), [ready, setReady] = useState(false)
  const [selection, setSelection] = useState<{ list: string; song: string } | null>(null)
  useEffect(() => {
    if (status === "loading") return
    let alive = true
    const refresh = () => { void readOfflineLists().then(data => {
      const owner = session?.user?.id ?? localStorage.getItem(OFFLINE_OWNER)
      if (alive) { setLists(data.filter(list => list.ownerId === owner)); setSelection(null); setReady(true); setError("") }
    }).catch(() => { if (alive) { setError("Offline memorija nije dostupna u ovom pregledaču."); setReady(true) } }) }
    refresh(); window.addEventListener(OFFLINE_EVENT, refresh)
    return () => { alive = false; window.removeEventListener(OFFLINE_EVENT, refresh) }
  }, [session?.user?.id, status])
  async function remove(id?: string) {
    if (!window.confirm(id ? "Ukloniti kopiju sa uređaja? Plejlista na nalogu ostaje sačuvana." : "Obrisati sve offline kopije sa ovog uređaja?")) return
    try { await removeOfflineList(id) } catch { setError("Brisanje kopije nije uspelo. Pokušaj ponovo.") }
  }
  const visibleLists = session?.user?.id ? lists.filter(item => item.ownerId === session.user.id) : lists
  const list = visibleLists.find(item => item.id === selection?.list), song = list?.songs.find(item => item.id === selection?.song)
  if (status === "loading") return <section className={styles.page}><h1>Pesme bez interneta</h1><p role="status">Proveravam lokalne kopije…</p></section>
  return <section className={styles.page}>
    <h1>Pesme bez interneta</h1>
    {error && <p role="alert">{error}</p>}
    {!ready && <p role="status">Učitavam sačuvane liste…</p>}
    {list && song ? <Player key={list.id + song.id} list={list} song={song} close={() => setSelection(null)} select={id => setSelection({ list: list.id, song: id })} /> : <>
      <p>Ovde su kopije koje si izričito sačuvao na ovom uređaju. Mogu raditi bez interneta i bez nove prijave. Na deljenom uređaju ukloni kopije posle korišćenja. Pregledač ih može ukloniti ako obrišeš podatke sajta ili oslobodi prostor.</p>
      <p className={styles.note}>Promene tonaliteta i capoa tokom offline sviranja važe samo za taj prikaz i ne šalju se na nalog. Hvatovi i YouTube zahtevaju internet. Transpozicija menja akorde, a brojevi pragova u tabovima ostaju izvorni.</p>
      <a className="ui-button" href="/profile/plejliste">Moje plejliste (internet)</a>{" "}{visibleLists.length > 0 && <button className="ui-button" onClick={() => void remove()}>Obriši sve kopije</button>}
      {ready && !visibleLists.length && <p>Nema sačuvanih lista na ovom uređaju. Dok imaš internet, otvori svoju plejlistu i izaberi „Sačuvaj listu za offline“.</p>}
      {visibleLists.map(item => <section className={styles.list} key={item.id}>
        <h2>{item.name}</h2><p>{item.songs.length} pesama · Preuzeto {new Date(item.savedAt).toLocaleString("sr-Latn")}</p>
        <button className="ui-button" onClick={() => void remove(item.id)}>Ukloni offline kopiju</button>
        <ul>{item.songs.map(s => <li key={s.id}><button onClick={() => setSelection({ list: item.id, song: s.id })}>{s.title}<span>{s.artist}</span></button></li>)}</ul>
      </section>)}
    </>}
  </section>
}
