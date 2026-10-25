"use client"

import { useI18n } from "@/app/components/UiText"
import { useState, useRef, useEffect, type ReactNode } from "react"
import Link from "next/link"
import { useMemo } from "react"
import UsedChordCard from "./UsedChordCard"
import SongSheet from "./SongSheet"
import SongPdfButton from "./SongPdfButton"
import SongPlaylistButton from "./SongPlaylistButton"
import { getUsedChords, parseSongSheet } from "@/lib/chords/songSheet"
import { transposeChordSymbol } from "@/lib/chords/chordSymbols"

type Props = {
  adminTools?: ReactNode
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

export default function SongClient({ song, adminTools }: Props) {
  const { t } = useI18n()

  const [transpose, setTranspose] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [miniPlayer, setMiniPlayer] = useState(false)
  const [isFav, setIsFav] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1)
  const scrollRef = useRef<NodeJS.Timeout | null>(null)

  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loadingVideo, setLoadingVideo] = useState(false)
  
  const [showChordsPanel, setShowChordsPanel] = useState(false)
  const [textSize, setTextSize] = useState(18)
  const [chordSize, setChordSize] = useState(18)
  const { title, artist, content, lyrics } = song
  const displayContent = lyrics || content || ""

 
  const sheetLines = useMemo(() => parseSongSheet(displayContent), [displayContent])
  const usedChords = useMemo(() =>
    getUsedChords(sheetLines).map((chord) => transposeChordSymbol(chord, transpose)),
    [sheetLines, transpose])
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



  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_380px] gap-10">

        {/* LEVA STRANA */}
        <div className="min-w-0">

          {/* TOOLBAR */}
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-400 border-b border-gray-800 pb-3">

            {/* TON */}
            <div className="flex items-center gap-2">

              <span className="uppercase tracking-wide text-xs">{t("Ton")}</span>

              <button
                aria-label={t("Smanji tonalitet")} onClick={() => setTranspose(t => t - 1)}
                className="px-2 hover:text-white"
              >
                −
              </button>

              <span className="text-white font-medium w-6 text-center">
                {transpose > 0 ? `+${transpose}` : transpose}
              </span>

              <button
                aria-label={t("Povecaj tonalitet")} onClick={() => setTranspose(t => t + 1)}
                className="px-2 hover:text-white"
              >
                +
              </button>

              <button
                onClick={() => setTranspose(0)}
                className="ml-1 text-xs text-red-400 hover:text-red-300"
              >
                {t("reset")}
              </button>

            </div>

            {/* SCROLL */}
            <div className="flex items-center gap-2">

              <span className="uppercase tracking-wide text-xs">{t("Scroll")}</span>

              <button
                aria-label={t(isAutoScrolling ? "Zaustavi skrolovanje" : "Pokreni skrolovanje")} onClick={isAutoScrolling ? stopAutoScroll : startAutoScroll}
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
                aria-label={t("Brzina skrolovanja")}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                className="w-20"
              />

            </div>
            
            {/* TEKST */}
            <div className="flex items-center gap-2">

              <span className="uppercase tracking-wide text-xs">{t("Tekst")}</span>

              <input
                type="range"
                min="14"
                max="32"
                value={textSize}
                aria-label={t("Velicina teksta")}
                onChange={(e) => setTextSize(Number(e.target.value))}
                className="w-20"
              />

            </div>

            {/* AKORDI */}
            <div className="flex items-center gap-2">

              <span className="uppercase tracking-wide text-xs">{t("Akordi")}</span>

              <input
                type="range"
                min="14"
                max="32"
                value={chordSize}
                aria-label={t("Velicina akorda")}
                onChange={(e) => setChordSize(Number(e.target.value))}
                className="w-20"
              />

            </div>
            {/* akordi */}
            <button
  onClick={() => setShowChordsPanel(!showChordsPanel)}
  className="px-2 text-xs border border-gray-700 rounded hover:text-white"
>
  {t("AKORDI")} {showChordsPanel ? "ON" : "OFF"}
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
  {loadingVideo ? t("LOADING...") : `VIDEO ${showVideo ? "ON" : "OFF"}`}
</button>
          </div>

       {/* TITLE */}
      
<div className="flex flex-wrap items-center gap-4 mb-2 relative z-10">
  <h1 className="text-3xl font-bold" translate="no">
    {title}
  </h1>

  <SongPdfButton song={{ id: song.id, title, artist, lyrics: displayContent }} transpose={transpose} textSize={textSize} chordSize={chordSize} />
  {/* FAVORITE STAR */}
  <button
    aria-label={t(isFav ? "Ukloni iz favorita" : "Dodaj u favorite")}
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

  <SongPlaylistButton key={song.id} songId={song.id} />

</div>

{adminTools}
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
<SongSheet lines={sheetLines} transpose={transpose} textSize={textSize} chordSize={chordSize} />
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



        </div>
              </div>
    </div>
  )
}
