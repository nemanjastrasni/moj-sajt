"use client"

import { useState, useRef, useEffect } from "react"
import Chord from "./Chord"


type Props = {
  song: {
    id: string
    title: string
    artist: string
    content?: string
    lyrics?: string
    chords?: string
    category?: string
    artistSlug?: string
    artistName?: string
  }
  media?: {
    platform: string
    embedUrl: string
  } | null
}

export default function SongClient({ song, media }: Props) {

  const [transpose, setTranspose] = useState(0)
  const [showVideo, setShowVideo] = useState(true)
  const [miniPlayer, setMiniPlayer] = useState(false)
  const [isFav, setIsFav] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1)
  const scrollRef = useRef<NodeJS.Timeout | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [playlistName, setPlaylistName] = useState("")

  const [textSize, setTextSize] = useState(18)
  const [chordSize, setChordSize] = useState(18)
  if (!song) return null
  const { title, artist, content, lyrics } = song
  const displayContent = lyrics || content || ""

  const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

  function transposeChord(chord: string) {
    const match = chord.match(/^([A-GH])(#|b)?(.*)$/)
    if (!match) return chord

    const [, root, accidental, rest] = match
    const note = root + (accidental || "")
    const index = NOTES.indexOf(note)

    if (index === -1) return chord

    const newIndex = (index + transpose + 12) % 12
    return NOTES[newIndex] + rest
  }
  function normalizeChord(chord: string) {
  if (!chord) return chord
  return chord[0].toUpperCase() + chord.slice(1)
}
  function renderContent(text: string, chordSize: number) {
    
   const chordRegex =
  /(?<!\S)[A-GHa-gh](#|b)?(m|maj|min|maj7|7|sus|sus4|dim|aug|add\d*)?(\d*)?(\/[A-GHa-gh](#|b)?)?(?!\S)/g

    return text.split("\n").map((line, i) => {

      const parts = []
      let lastIndex = 0
      let match
    const isChordLine = /^[\sA-GHa-gh#mb0-9\/]+$/.test(line.trim())

      while ((match = chordRegex.exec(line)) !== null) {

        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index))
        }

        const rawChord = match[0]
        const chord = normalizeChord(rawChord)
        const isSingleLetter = chord.length === 1
        const hasTextAround =
  /[a-zA-ZčćžšđČĆŽŠĐ]/.test(line[match.index - 1] || "") ||
  /[a-zA-ZčćžšđČĆŽŠĐ]/.test(line[chordRegex.lastIndex] || "")

// ako je jedno slovo i ima tekst oko njega → NIJE akord
if (isSingleLetter && hasTextAround) {
  parts.push(rawChord)
  lastIndex = chordRegex.lastIndex
  continue
}

// ako NIJE chord linija → ostavi tekst
if (!isChordLine) {
  parts.push(rawChord)
  lastIndex = chordRegex.lastIndex
  continue
}

parts.push(
  <Chord
    key={match.index}
    chord={transposeChord(chord)}
    size={chordSize}
  />
)

        lastIndex = chordRegex.lastIndex
      }

      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex))
      }

      return <div key={i}>{parts}</div>
    })
  }

  function startAutoScroll() {

    if (scrollRef.current) return

    setIsAutoScrolling(true)

    scrollRef.current = setInterval(() => {
      window.scrollBy(0, scrollSpeed * 0.2)
    }, 60)
  }

  function stopAutoScroll() {

    if (scrollRef.current) {
      clearInterval(scrollRef.current)
      scrollRef.current = null
    }

    setIsAutoScrolling(false)
  }

  useEffect(() => {

    return () => {
      if (scrollRef.current) clearInterval(scrollRef.current)
    }

  }, [])

  useEffect(() => {
  function handleScroll() {
    if (window.scrollY > 350) setMiniPlayer(true)
    else setMiniPlayer(false)
  }

  window.addEventListener("scroll", handleScroll)

  return () => {
    window.removeEventListener("scroll", handleScroll)
  }
}, [])

  useEffect(() => {
  async function checkFav() {
    const res = await fetch(`/api/favorite/check?songId=${song.id}`)
    const data = await res.json()
    setIsFav(data.isFav)
  }
  checkFav()
}, [song.id])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      <div className="grid lg:grid-cols-[1fr_380px] gap-10">

        {/* LEVA STRANA */}
        <div>

          {/* TOOLBAR */}
          <div className="mb-6 flex items-center gap-6 text-sm text-gray-400 border-b border-gray-800 pb-3">

            {/* TON */}
            <div className="flex items-center gap-2">

              <span className="uppercase tracking-wide text-xs">Ton</span>

              <button
                onClick={() => setTranspose(t => t - 1)}
                className="px-2 hover:text-white"
              >
                −
              </button>

              <span className="text-white font-medium w-6 text-center">
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>

              <button
                onClick={() => setTranspose(t => t + 1)}
                className="px-2 hover:text-white"
              >
                +
              </button>

              <button
                onClick={() => setTranspose(0)}
                className="ml-1 text-xs text-red-400 hover:text-red-300"
              >
                reset
              </button>

            </div>

            {/* SCROLL */}
            <div className="flex items-center gap-2">

              <span className="uppercase tracking-wide text-xs">Scroll</span>

              <button
                onClick={isAutoScrolling ? stopAutoScroll : startAutoScroll}
                className="px-2 hover:text-white"
              >
                {isAutoScrolling ? "⏸" : "▶"}
              </button>

              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                className="w-20"
              />

            </div>
            
            {/* TEKST */}
            <div className="flex items-center gap-2">

              <span className="uppercase tracking-wide text-xs">Tekst</span>

              <input
                type="range"
                min="14"
                max="32"
                value={textSize}
                onChange={(e) => setTextSize(Number(e.target.value))}
                className="w-20"
              />

            </div>

            {/* AKORDI */}
            <div className="flex items-center gap-2">

              <span className="uppercase tracking-wide text-xs">Akordi</span>

              <input
                type="range"
                min="14"
                max="32"
                value={chordSize}
                onChange={(e) => setChordSize(Number(e.target.value))}
                className="w-20"
              />

            </div>

            {/* VIDEO */}
            {media && (
              <button
                onClick={() => setShowVideo(!showVideo)}
                className="px-2 text-xs border border-gray-700 rounded hover:text-white"
              >
                VIDEO {showVideo ? "ON" : "OFF"}
              </button>
            )}

          </div>

       {/* TITLE */}
<div className="flex items-center gap-4 mb-2 relative z-10">
  <h1 className="text-3xl font-bold">
    {title}
  </h1>

  {/* FAVORITE START */}
<button
  onClick={async () => {
    const res = await fetch("/api/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId: song.id }),
    })

    const data = await res.json()

    if (data.added) setIsFav(true)
    if (data.removed) setIsFav(false)
  }}
  className={`text-xl transition ${
    isFav ? "text-yellow-400" : "text-gray-400"
  }`}
>
  ⭐
</button>

</div>

<h2 className="text-lg text-gray-500 mb-6">
  {artist}
</h2>
{/* Playlist */}
<button
    onClick={() => setShowModal(true)}
    className="px-2 py-1 text-sm bg-blue-500 hover:bg-blue-600 rounded text-white"
  >
    + Playlist
  </button>

          {/* CONTENT */}
          <div
            className="font-mono leading-relaxed whitespace-pre-wrap"
            style={{ fontSize: `${textSize}px` }}
          >
            {renderContent(displayContent.trim(), chordSize)}
          </div>

        </div>

        {/* DESNA STRANA - YOUTUBE */}
        <div>

           {showVideo && media?.embedUrl && (

  <div
    className={
      miniPlayer
        ? "lg:sticky lg:top-20 h-fit scale-90 origin-top transition-all duration-300"
        : "lg:sticky lg:top-28 h-fit transition-all duration-300"
    }
  >

    <div className="relative w-full" style={{ paddingBottom: "56.25%", height: 0 }}>
  <iframe
    src={media?.embedUrl}
    title="YouTube player"
    className="absolute top-0 left-0 w-full h-full"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
  />
</div>

  </div>

)}
{showModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-gray-900 p-6 rounded w-[300px]">
      
      <h2 className="mb-4 text-lg">Nova playlista</h2>

      <input
        value={playlistName}
        onChange={(e) => setPlaylistName(e.target.value)}
        placeholder="Naziv..."
        className="w-full p-2 mb-4 bg-gray-800 text-white rounded"
      />

      <button
        onClick={async () => {
          const res = await fetch("/api/playlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: playlistName }),
          })

          const data = await res.json()

          await fetch("/api/playlist", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playlistId: data.id,
              songId: song.id,
            }),
          })

          setShowModal(false)
          setPlaylistName("")
        }}
        className="w-full bg-blue-500 py-2 rounded"
      >
        Sačuvaj
      </button>

    </div>
  </div>
)}
        </div>

      </div>

    </div>
  )
  
}

