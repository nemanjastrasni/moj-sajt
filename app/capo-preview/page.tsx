"use client"
import { useState } from "react"
import SongClient from "@/app/components/SongClient"
import PlaylistPerformance from "@/app/components/PlaylistPerformance"

export default function Preview() {
  const [fixture, setFixture] = useState("standard"), [playlist, setPlaylist] = useState(false)
  const lyrics = fixture === "standard" ? "F#m            D          A          E\nOvo je probni stih za preporuku capoa.\nF#m D A E (bass: F# F# E E D D)\nOvo je druga strofa." : fixture === "source" ? "Capo II\nAm            G          C          F\nIzvorni zapis vec ima capo.\nE(#9) E(b9) Am/G\nDodaci ostaju sacuvani.\ne|--0--2--3--" : fixture === "ambiguous" ? "Capo 2 ili 3\nAm G C F\nNejasan izvorni capo." : fixture === "empty" ? "Samo tekst bez akorda." : "G D Em C\nDruga pesma nema izabran capo."
  return <><div><label>Fixture<select aria-label="Fixture" value={fixture} onChange={event => setFixture(event.target.value)}>{["standard", "source", "ambiguous", "empty", "other"].map(value => <option key={value}>{value}</option>)}</select></label><button type="button" onClick={() => setPlaylist(true)}>Fixture playlist</button></div><SongClient song={{ id: fixture, title: "Probna pesma za capo", artist: "Probni bend", lyrics }} />{playlist && <PlaylistPerformance playlistId="fixture" initialSong="first" initialCapo={2} />}</>
}
