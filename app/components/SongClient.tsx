"use client"

import { useI18n } from "@/app/components/UiText"
import { useState, useRef, useEffect, type ReactNode } from "react"
import Link from "next/link"
import { useMemo } from "react"
import UsedChordCard from "./UsedChordCard"
import SongSheet from "./SongSheet"
import SongPdfButton from "./SongPdfButton"
import SongPlaylistButton from "./SongPlaylistButton"
import SongReportButton from "./SongReportButton"
import CapoControl from "./CapoControl"
import useSongCapo from "./useSongCapo"
import useFavoriteSong from "./useFavoriteSong"
import FavoriteTransposeStatus from "./FavoriteTransposeStatus"
import PerformanceView from "./PerformanceView"
import { Maximize, Minus, Plus, RotateCcw, Star } from "lucide-react"
import { useRouter } from "next/navigation"
import { getUsedChords, parseSongSheet } from "@/lib/chords/songSheet"
import { transposeChordSymbol } from "@/lib/chords/chordSymbols"
import { withCapoHref } from "@/lib/chords/capo"

type Props = {
  adminTools?: ReactNode
  fromFavorites?: boolean
  performanceHref?: string
  songVersion?: string
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

export default function SongClient({ song, adminTools, fromFavorites = false, performanceHref, songVersion }: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const [performance, setPerformance] = useState(false)

  const favorite = useFavoriteSong(song.id, fromFavorites)
  const { transpose, isFav } = favorite
  const [showVideo, setShowVideo] = useState(false)
  const [miniPlayer, setMiniPlayer] = useState(false)
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
  const capo = useSongCapo(song.id, sheetLines, transpose)
  const usedChords = useMemo(() =>
    getUsedChords(capo.lines).map((chord) => transposeChordSymbol(chord, capo.shift)),
    [capo.lines, capo.shift])
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





  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      <div className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_380px] gap-10">

        {/* LEVA STRANA */}
        <div className="min-w-0">

          {/* TOOLBAR */}
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-400 border-b border-gray-800 pb-3">

            <div className="flex items-center gap-2">
              <span className="uppercase text-xs">{t("Ton")}</span>
              <button type="button" disabled={favorite.controlsDisabled || transpose <= -11} aria-label={t("Smanji tonalitet")} title={t("Smanji tonalitet")} onClick={() => favorite.change(value => Math.max(-11, value - 1))} className="inline-flex h-11 w-11 items-center justify-center disabled:opacity-40"><Minus size={18} /></button>
              <output aria-label={t("Transpozicija")} className="text-white font-medium w-10 text-center">{transpose > 0 ? `+${transpose}` : transpose}</output>
              <button type="button" disabled={favorite.controlsDisabled || transpose >= 11} aria-label={t("Povecaj tonalitet")} title={t("Povecaj tonalitet")} onClick={() => favorite.change(value => Math.min(11, value + 1))} className="inline-flex h-11 w-11 items-center justify-center disabled:opacity-40"><Plus size={18} /></button>
              <button type="button" disabled={favorite.controlsDisabled} aria-label={t("Originalni tonalitet")} title={t("Originalni tonalitet")} onClick={() => favorite.change(0)} className="inline-flex h-11 w-11 items-center justify-center disabled:opacity-40"><RotateCcw size={18} /></button>
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

       <div className="mb-4"><CapoControl key={song.id} capo={capo} disabled={favorite.controlsDisabled} /></div>
       <FavoriteTransposeStatus phase={favorite.phase} error={favorite.error} reload={favorite.reload} />
       {/* TITLE */}
      
<div className="flex flex-wrap items-center gap-4 mb-2 relative z-10">
  <h1 className="text-3xl font-bold" translate="no">
    {title}
  </h1>

  <SongPdfButton song={{ id: song.id, title, artist, lyrics: displayContent }} transpose={transpose} capo={capo.active ? capo.selected : null} textSize={textSize} chordSize={chordSize} />
  <button type="button" disabled={["loading", "saving", "updating"].includes(favorite.phase)} title={t("Rezim za sviranje")} aria-label={t("Rezim za sviranje")} className="inline-flex h-11 w-11 items-center justify-center rounded border border-gray-600 disabled:opacity-40" onClick={() => { stopAutoScroll(); setShowVideo(false); if (performanceHref) router.push(withCapoHref(performanceHref, capo.active ? capo.selected : null)); else setPerformance(true) }}><Maximize size={18} /></button>
  <button type="button" title={t(isFav ? "Ukloni iz favorita" : "Dodaj u favorite")} aria-label={t(isFav ? "Ukloni iz favorita" : "Dodaj u favorite")} aria-pressed={isFav} disabled={favorite.favoriteDisabled} onClick={() => void favorite.toggle()} className={`inline-flex h-11 w-11 items-center justify-center transition disabled:opacity-40 ${isFav ? "text-yellow-400" : "text-gray-500 hover:text-yellow-300"}`}>
    <Star size={22} fill={isFav ? "currentColor" : "none"} />
  </button>

  <SongPlaylistButton key={song.id} songId={song.id} />
  {songVersion && <SongReportButton songId={song.id} songVersion={songVersion} title={title} artist={artist} transpose={transpose} />}

</div>

{adminTools}
{performance && <PerformanceView song={{ id: song.id, title, artist, lyrics: displayContent }} controls={favorite} capoControl={capo} close={() => setPerformance(false)} />}
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
<SongSheet lines={capo.lines} transpose={capo.shift} textSize={textSize} chordSize={chordSize} />
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
