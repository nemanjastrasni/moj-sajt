"use client"

import { useState, useRef } from "react"

const BASE = "/chords_final"

function normalizeChord(chord: string) {
  return chord.replace(/^H/, "B")
}

type Props = {
  chord: string
  size: number
}

export default function Chord({ chord, size }: Props) {
  const [show, setShow] = useState(false)
  const spanRef = useRef<HTMLSpanElement>(null)

  const normalized = normalizeChord(chord)
  let safeChord = normalized
  .replace(/\s+/g, "")
  .replace("/", "_")
  .replace(/^Ab/, "G#")
  .replace(/^Db/, "C#")
  .replace(/^Eb/, "D#")
  .replace(/^Gb/, "F#")
  .replace(/^Bb/, "A#")

// 👉 ako je samo slovo (F, G, C...) → dodaj "maj"
if (/^[A-G](#)?$/.test(safeChord)) {
  safeChord = safeChord + "maj"
}
  const rootMatch = normalized.match(/^[A-G](#|b)?/)
  const root = rootMatch ? rootMatch[0] : null

  if (!root) {
    return <span style={{ fontSize: `${size}px` }}>{chord}</span>
  }

  const encodedRoot = encodeURIComponent(root)
  const fileName = normalized
  .replace("b", "_b")
   .replace(/\s+/g, "")
  .replace("maj", "maj")

  const encodedChord = encodeURIComponent(fileName + "_v1")
  const src = `/chords_final/${encodeURIComponent(safeChord)}_v1.png`
   console.log("CHORD:", chord, "->", safeChord)

  return (
    <span
      ref={spanRef}
      style={{
        fontWeight: "bold",
        color: "#1a73e8",
        cursor: "pointer",
        position: "relative",
        display: "inline-block",
        zIndex: 10,
        fontSize: `${size}px`,   // ✅ OVDE JE BITNO
      }}
      onMouseEnter={() => {
        if (window.innerWidth > 768) setShow(true)
      }}
      onMouseLeave={() => {
        if (window.innerWidth > 768) setShow(false)
      }}
      onClick={() => {
        if (window.innerWidth <= 768) {
          setShow(prev => !prev)
        }
      }}
    >
      {chord}

      {show && spanRef.current && (() => {
        const rect = spanRef.current.getBoundingClientRect()

        return (
          <div
           style={{
  position: "fixed",
  top: rect.top - 150,
  left: Math.max(20, rect.left - 30),
  transform: "none",
  right: "auto",
  bottom: "auto",
  background: "#111",
  padding: "8px",
  borderRadius: "8px",
  zIndex: 99999,
  boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
  pointerEvents: "none",
}}
          >
            <img
  src={src}
  width={120}
  alt={chord}
  draggable={false}
  onError={(e) => {
    (e.currentTarget as HTMLImageElement).style.display = "none"
  }}
/>
          </div>
        )
      })()}
    </span>
  )
}