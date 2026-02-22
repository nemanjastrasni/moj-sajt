"use client"

import { useState, useRef, useEffect } from "react"
import Chord from "./Chord"

// SAMO TIPA PROMENA: dodato lyrics i chords, zadržan content za kompatibilnost
type Props = {
  song: {
    title: string
    artist: string
    content?: string  // ostaje za kompatibilnost sa postojećim renderContent
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

  // AUTO SCROLL
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(1)
  const scrollRef = useRef<NodeJS.Timeout | null>(null)

  // FONT SIZE
  const [textSize, setTextSize] = useState(18)
  const [chordSize, setChordSize] = useState(18)

  // Preferiraj lyrics ako postoji, fallback na content
  const { title, artist, content, lyrics, chords } = song
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

  const chordRegex = /^[A-GH](#|b)?(m|maj7|7|sus4|dim|aug)?$/

  function renderContent(text: string, chordSize: number) {
    return text.split("\n").map((line, i) => (
      <div key={i}>
        {line.split(" ").map((word, j) =>
          chordRegex.test(word)
            ? (
              <Chord
                key={j}
                chord={transposeChord(word)}
                size={chordSize}
              />
            )
            : word + " "
        )}
      </div>
    ))
  }

  function startAutoScroll() {
    if (scrollRef.current) return

    setIsAutoScrolling(true)

    scrollRef.current = setInterval(() => {
      window.scrollBy(0, scrollSpeed * 0.3)
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      <div className="grid lg:grid-cols-[1fr_420px] gap-12">

        {/* LEVA STRANA */}
        <div>

          {/* MINI TOOLBAR */}
          <div className="mb-6 flex items-center gap-6 text-sm text-gray-400 border-b border-gray-800 pb-3">
            {/* TONALITET */}
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
                max="6"
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

          </div>
          {/* TITLE */}
          <h1 className="text-3xl font-bold mb-2">
            {title}
          </h1>

          <h2 className="text-lg text-gray-500 mb-6">
            {artist}
          </h2>

          {/* CONTENT */}
          <div
            className="font-mono leading-relaxed whitespace-pre-wrap"
            style={{ fontSize: `${textSize}px` }}
          >
            {renderContent(displayContent.trim(), chordSize)}
          </div>

        </div>

        {/* DESNA STRANA - VIDEO */}
        {media?.platform === "youtube" && (
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <iframe
                src={media.embedUrl}
                title="YouTube player"
                className="w-full aspect-video"
                allowFullScreen
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}