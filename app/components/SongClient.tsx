"use client"

import { useState } from "react"
import Chord from "./Chord"

type Props = {
  song: {
    title: string
    artist: string
    content: string
  }
}

export default function SongClient({ song }: Props) {
  const [transpose, setTranspose] = useState(0)

  const { title, artist, content } = song

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

  function renderContent(text: string) {
    return text.split("\n").map((line, i) => (
      <div key={i}>
        {line.split(" ").map((word, j) =>
          chordRegex.test(word)
            ? <Chord key={j} chord={transposeChord(word)} />
            : word + " "
        )}
      </div>
    ))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

     {/* TONALITET */}
<div className="mb-8 text-center">
  <div className="inline-flex items-center gap-5 px-5 py-3 border border-gray-700 rounded-xl">

    <button
      onClick={() => setTranspose(t => t - 1)}
      className="px-3 py-1 border border-gray-600 rounded-lg hover:bg-gray-800 transition"
    >
      −
    </button>

    <div className="flex flex-col items-center min-w-[70px]">
      <span className="text-sm text-gray-400">
        Tonalitet
      </span>

      <span className="text-xl font-semibold">
        {transpose > 0 ? `+${transpose}` : transpose}
      </span>

      <button
  onClick={() => setTranspose(0)}
  className="mt-1 px-2 py-0.5 text-xs border border-red-500 text-red-400 rounded-md hover:bg-red-500/10 transition"
>
  Reset
</button>
    </div>

    <button
      onClick={() => setTranspose(t => t + 1)}
      className="px-3 py-1 border border-gray-600 rounded-lg hover:bg-gray-800 transition"
    >
      +
    </button>

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
      <div className="font-mono text-lg leading-relaxed whitespace-pre-wrap">
        {renderContent(content.trim())}
      </div>
    </div>
  )
}