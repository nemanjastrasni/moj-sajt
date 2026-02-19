"use client"

import { useState } from "react"
import Chord from "@/app/components/Chord"
import { songs } from "@/app/lib/data/songs"
import { notFound, useParams } from "next/navigation"
import React from "react"


const NOTES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B"
]

function transposeChord(chord: string, amount: number) {
  const match = chord.match(/^([A-G](#|b)?)(.*)$/)
  if (!match) return chord

  let [, root, , rest] = match

  if (root === "H") root = "B"

  const index = NOTES.indexOf(root)
  if (index === -1) return chord

  let newIndex = (index + amount) % 12
  if (newIndex < 0) newIndex += 12

  return NOTES[newIndex] + rest
}

export default function SongPage() {

  const [transpose, setTranspose] = useState<number>(0)

  const params = useParams()
  const { category, artist, slug } = params as {
    category: string
    artist: string
    slug: string
  }

  const song = songs.find(
    (s) =>
      s.category === category &&
      s.artist === artist &&
      s.id === slug
  )

  if (!song) {
    return notFound()
  }

  function parseSong(text: string) {
    const chordRegex =
      /\b(H|[A-G])(#|b)?(m|maj7|7|sus2|sus4)?\b/g

    return text.split("\n").map((line, i) => {
      const elements: React.ReactNode[] = []
      let lastIndex = 0
      let match

      chordRegex.lastIndex = 0

      while ((match = chordRegex.exec(line)) !== null) {
        const index = match.index
        const chord = match[0]

        elements.push(line.slice(lastIndex, index))

        const transposed = transposeChord(chord, transpose)
        elements.push(<Chord key={index} chord={transposed} />)

        lastIndex = index + chord.length
      }

      elements.push(line.slice(lastIndex))

      return <div key={i}>{elements}</div>
    })
  }

return (
  <div style={{ padding: "40px" }}>

    {/* KONTROLE IZNAD NASLOVA */}
    <div style={{ marginBottom: "30px", textAlign: "center" }}>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
          marginBottom: "8px"
        }}
      >
        <button
          onClick={() => setTranspose(t => t - 1)}
          style={{
            padding: "6px 14px",
            fontSize: "18px",
            cursor: "pointer",
            borderRadius: "8px"
          }}
        >
          −
        </button>

        <span style={{ fontWeight: "bold", fontSize: "18px" }}>
          Transpose: {transpose}
        </span>

        <button
          onClick={() => setTranspose(t => t + 1)}
          style={{
            padding: "6px 14px",
            fontSize: "18px",
            cursor: "pointer",
            borderRadius: "8px"
          }}
        >
          +
        </button>
      </div>

      <button
        onClick={() => setTranspose(0)}
        style={{
          padding: "6px 20px",
          fontSize: "13px",
          cursor: "pointer",
          borderRadius: "20px",
          background: "#0000FF",
          color: "white",
          border: "none",
          fontWeight: "bold"
        }}
      >
        RESET
      </button>

    </div>

    <h1
  style={{
    fontSize: "42px",
    fontWeight: "800",
    marginBottom: "10px",
    fontFamily: "'Poppins', sans-serif",
    letterSpacing: "1px"
  }}
>
  {song.title}
</h1>

<h2
  style={{
    fontSize: "26px",
    fontWeight: "500",
    color: "#555",
    marginBottom: "40px",
    fontFamily: "'Poppins', sans-serif"
  }}
>
  {song.artistFull}
</h2>

    <div
      style={{
        fontFamily: "monospace",
        fontSize: "20px",
        lineHeight: "1.7",
        whiteSpace: "pre-wrap",
      }}
    >
      {parseSong(song.content)}
    </div>

  </div>
)

}
