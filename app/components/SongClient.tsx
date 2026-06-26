"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Chord from "./Chord"
import { useMemo } from "react"
import ChordDiagram from "./ChordDiagram"
import UsedChordCard from "./UsedChordCard"
import { cleanLyrics } from "@/lib/cleanLyrics"
import { chordVariants } from "@/lib/chords/chordVariants"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

type ChordVariant = {
  name: string
  image: string
}

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
  const { data: session } = useSession()
  const router = useRouter()
  const [transpose, setTranspose] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [miniPlayer, setMiniPlayer] = useState(false)
  const [isFav, setIsFav] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1)
  const scrollRef = useRef<NodeJS.Timeout | null>(null)
  const [showModal, setShowModal] = useState(false)

  const [playlistName, setPlaylistName] = useState("")
  const [playlists, setPlaylists] = useState<any[]>([])
  const [showSelect, setShowSelect] = useState(false)

  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loadingVideo, setLoadingVideo] = useState(false)
  
  const [showChordsPanel, setShowChordsPanel] = useState(false)
  const [textSize, setTextSize] = useState(18)
  const [chordSize, setChordSize] = useState(18)
  const normalize = (str?: string) =>
  (str || "")
    .toLowerCase()
    .replace("ć", "c")
    .replace("č", "c")
    .replace("š", "s")
    .replace("ž", "z")
    .trim()

  if (!song) return null
  const { title, artist, content, lyrics } = song
  const displayContent = lyrics || content || ""

 
  const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
  const FLAT_TO_SHARP: Record<string, string> = {
    Cb: "B",
    Db: "C#",
    Eb: "D#",
    Fb: "E",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
    "E#": "F",
    "B#": "C",
  }
  const rendered = useMemo(() => {
  return renderContent(displayContent.trim(), chordSize)
}, [displayContent, chordSize, transpose])
   const usedChords = useMemo(() => {
  const chordTokenRegex =
    /^[A-GH](#|b)?(maj7|maj|min|sus2|sus4|sus|dim|aug|add\d*|m|7)?(\d+|\+)?(\/[A-GH](#|b)?)?$/i

  const isChordToken = (token: string) =>
    chordTokenRegex.test(normalizeChordToken(token))

  return Array.from(
    new Set(
      displayContent
        .split("\n")
        .flatMap((line) => {
          const candidate = line.trim().replace(/[-–—]+/g, " ")
          const tokens = candidate.split(/\s+/).filter(Boolean)
          const isChordLine =
            tokens.some(isChordToken) &&
            tokens.every((token) => isChordToken(token) || /^\d+x$/i.test(token))

          if (!isChordLine) return []

          return tokens
            .filter(isChordToken)
            .map((token) => transposeChord(token))
        })
    )
  )
}, [displayContent, transpose])

  function normalizeChordToken(chord: string) {
    const clean = chord
      .trim()
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .replace(/[.,;:]$/g, "")
      .replace("+", "maj7")

    const european = clean
      .replace(/^([a-gA-GHh])is/i, "$1#")
      .replace(/^([a-gA-GHh])es/i, "$1b")

    const match = european.match(/^([a-gA-GHh])(#|b)?(.*)$/)
    if (!match) return clean

    const [, rawRoot, accidental = "", rawRest = ""] = match
    const root = rawRoot.toUpperCase() === "H" ? "B" : rawRoot.toUpperCase()
    const note = FLAT_TO_SHARP[root + accidental] || root + accidental
    const rest = rawRest.replace(/^M/, "m")

    return note + rest
  }

  function transposeChord(chord: string) {
    const normalizedChord = normalizeChordToken(chord)
    const match = normalizedChord.match(/^([A-G])(#|b)?(.*)$/)
    if (!match) return chord

    const [, root, accidental, rest] = match
    const note = root + (accidental || "")
    const index = NOTES.indexOf(note)

    if (index === -1) return chord

    const newIndex = (index + transpose + 12) % 12
    return NOTES[newIndex] + rest
  }
  function normalizeChord(chord: string) {
  return normalizeChordToken(chord)
}

  function renderContent(text: string, chordSize: number) {
    const chordTokenRegex =
      /^[A-GH](#|b)?(maj7|maj|min|sus2|sus4|sus|dim|aug|add\d*|m|7)?(\d+|\+)?(\/[A-GH](#|b)?)?$/i
    const bracketChordRegex =
      /\[[A-GH](#|b)?(maj7|maj|min|sus2|sus4|sus|dim|aug|add\d*|m|7)?(\d+|\+)?(\/[A-GH](#|b)?)?\]/gi

    const isChordToken = (token: string) =>
      chordTokenRegex.test(normalizeChordToken(token))

    const isRepeatToken = (token: string) => /^\d+x$/i.test(token)

    const isTabLine = (line: string) =>
      (line.match(/\|/g) || []).length >= 2 ||
      /^[eBGDAE][|-]/i.test(line.trim())

    const splitChordPrefix = (line: string) => {
      const commentIndex = line.search(/\s+\(/)
      const chordPart = commentIndex >= 0 ? line.slice(0, commentIndex) : line
      const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : ""
      const normalizedChordPart = chordPart.replace(/[-–—.]+/g, " ")
      const tokens = normalizedChordPart.trim().split(/\s+/).filter(Boolean)
      const isChordPrefix =
        tokens.some(isChordToken) &&
        tokens.every((token) => isChordToken(token) || isRepeatToken(token))

      return {
        commentPart,
        isChordPrefix,
        normalizedChordPart,
        tokens,
      }
    }

    const renderChord = (rawChord: string, key: string) => {
      const chord = normalizeChord(rawChord)

      return (
        <Chord
          key={key}
          chord={transposeChord(chord)}
          size={chordSize}
        />
      )
    }

    return text.split("\n").map((line, i) => {
      const trimmed = line.trim()

      if (!trimmed) {
        return <div key={i}>&nbsp;</div>
      }

      if (isTabLine(line)) {
        return (
          <pre key={i} className="font-mono whitespace-pre">
            {line}
          </pre>
        )
      }

      const {
        commentPart,
        isChordPrefix,
        normalizedChordPart,
        tokens,
      } = splitChordPrefix(line)

      if (isChordPrefix) {
        return (
          <div key={i} className="font-mono whitespace-pre">
            {normalizedChordPart.split(/(\s+)/).map((part, index) => {
              if (!part) return null
              if (/^\s+$/.test(part)) return part

              if (isChordToken(part)) {
                return renderChord(part, `${i}-${index}`)
              }

              return <span key={`${i}-${index}`}>{part}</span>
            })}
            {commentPart}
          </div>
        )
      }

      const parts = []
      let lastIndex = 0
      let match

      while ((match = bracketChordRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.slice(lastIndex, match.index))
        }

        parts.push(renderChord(match[0], `${i}-${match.index}`))
        lastIndex = bracketChordRegex.lastIndex
      }

      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex))
      }

      return (
        <div key={i} className="font-mono whitespace-pre-wrap">
          {parts.length ? parts : line}
        </div>
      )
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
  let mounted = true

  async function checkFav() {
    const res = await fetch(`/api/favorite/check?songId=${song.id}`)
    const data = await res.json()

    if (mounted) {
      setIsFav(data.isFav)
    }
  }
  
  checkFav()

  return () => {
    mounted = false
  }
}, [song.id])

useEffect(() => {
  async function fetchPlaylists() {
    if (!session) return

    const res = await fetch("/api/playlist")
    const data = await res.json()

    setPlaylists(data)
  }

  fetchPlaylists()
}, [session])


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
            {/* akordi */}
            <button
  onClick={() => setShowChordsPanel(!showChordsPanel)}
  className="px-2 text-xs border border-gray-700 rounded hover:text-white"
>
  AKORDI {showChordsPanel ? "ON" : "OFF"}
</button>
            {/* YOUTUBE VIDEO */}
            <button
  onClick={async () => {
    if (videoUrl) {
      setShowVideo(!showVideo)
      return
    }

    setLoadingVideo(true)
    console.log("CLICK VIDEO:", song.title, song.artist)
    const res = await fetch(
  `/api/youtube?song=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`
)

    const data = await res.json()
    console.log("YT RESPONSE:", data)

    setVideoUrl(data?.embedUrl || null)
    setShowVideo(true)
    setLoadingVideo(false)
  }}
  className="px-2 text-xs border border-gray-700 rounded hover:text-white"
>
  {loadingVideo ? "LOADING..." : `VIDEO ${showVideo ? "ON" : "OFF"}`}
</button>
          </div>

       {/* TITLE */}
      
<div className="flex flex-wrap items-center gap-4 mb-2 relative z-10">
  <h1 className="text-3xl font-bold">
    {title}
  </h1>

  {/* FAVORITE STAR */}
  <button
    onClick={async () => {
      const method = isFav ? "DELETE" : "POST"

      const res = await fetch("/api/favorite", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          songId: song.id,
        }),
      })

      if (!res.ok) return

      setIsFav(!isFav)
    }}
    className={`text-2xl transition ${
      isFav
        ? "text-yellow-400"
        : "text-gray-500 hover:text-yellow-300"
    }`}
  >
    ★
  </button>

  {/* PLAYLIST */}
  <div className="relative inline-block">
    <button
      onClick={() => {
  if (!session) {
    router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
    return
  }

  setShowSelect(!showSelect)
}}
      className="px-2 py-1 text-sm bg-blue-500 hover:bg-blue-600 rounded text-white"
    >
      + Playlist
    </button>

    {showSelect && (
      <div className="fixed left-4 right-4 top-24 max-h-[70vh] overflow-auto bg-neutral-900 border border-gray-700 rounded p-2 z-[999999] sm:absolute sm:left-0 sm:right-auto sm:top-auto sm:mt-2 sm:w-64">

  {(() => {
  const sc = (song.category || "").toLowerCase()

  const filtered = playlists.filter(p => {
    const pc = (p.category || "").toLowerCase()
    return pc === sc || pc === "mix"
  })

  const sorted = [
    ...filtered.filter(p => p.category !== "mix"),
    ...filtered.filter(p => p.category === "mix"),
  ]

  return sorted.map((p) => {
    const isAdded = p.songs?.some(
      (s: any) => s.songId === song.id
    )
  

    return (
      <div
        key={p.id}
        onClick={async () => {
          if (isAdded) return

          await fetch("/api/playlist", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              playlistId: p.id,
              songId: song.id,
            }),
          })

          setPlaylists(prev =>
            prev.map(pl =>
              pl.id === p.id
                ? {
                    ...pl,
                    songs: [...(pl.songs || []), { songId: song.id }]
                  }
                : pl
            )
          )

          setShowSelect(false)
        }}
        className="px-2 py-2 hover:bg-white/10 cursor-pointer flex justify-between items-center"
      >
        <span className="truncate max-w-[180px]">
          {p.name}
        </span>

        <span className="text-green-400">
          {isAdded ? "✓" : "+"}
        </span>
      </div>
    )
  })
})()}

        {/* NOVA PLAYLISTA */}
        <div
  onClick={() => {
    setShowModal(true)
    setShowSelect(false)
  }}
          className="px-2 py-2 hover:bg-white/10 cursor-pointer border-t border-gray-700 mt-1 text-blue-400"
        >
          + Nova playlista
        </div>

      </div>
    )}
  </div>
</div>

{song.artistSlug ? (
  <Link
  href={`/pesme/${song.category}/${song.artistSlug}`}
  className="text-lg text-gray-500 mb-6 block hover:text-blue-400 transition"
>
  🎤 {artist}
</Link>
) : (
  <h2 className="text-lg text-gray-500 mb-6">
    {artist}
  </h2>
)}

{/* USED CHORDS */}
{showChordsPanel && (
  <div className="flex flex-wrap gap-3 mb-6">
    {usedChords.map((chord) => (
      <UsedChordCard key={chord} chord={chord} />
    ))}
  </div>
)}
          {/* CONTENT */}
<div
  className="font-mono leading-relaxed whitespace-pre-wrap"
  style={{ fontSize: `${textSize}px` }}
>
  {rendered}
</div>
</div>


        {/* DESNA STRANA - YOUTUBE */}
        <div>

           {showVideo && videoUrl && (

  <div
    className={
      miniPlayer
        ? "lg:sticky lg:top-20 h-fit scale-90 origin-top transition-all duration-300"
        : "lg:sticky lg:top-28 h-fit transition-all duration-300"
    }
  >

    <div className="relative w-full" style={{ paddingBottom: "56.25%", height: 0 }}>
  <iframe
    loading="lazy"
    src={videoUrl}
    title="YouTube player"
    className="absolute top-0 left-0 w-full h-full"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen
  />
</div>

  </div>

)}
{showModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999999] px-4">
    <div className="bg-gray-900 p-6 rounded w-full max-w-[320px]">
      
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
            body: JSON.stringify({
              name: playlistName,
              category: song.category,
              songId: song.id,
       }),
          })

          const data = await res.json()

          
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
