"use client"

import { useState, useRef, useEffect } from "react"

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
  const [variantIndex, setVariantIndex] = useState(1)
  const maxVariants = 4
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (
      spanRef.current &&
      !spanRef.current.contains(event.target as Node)
    ) {
      setShow(false)
    }
  }

  document.addEventListener("mousedown", handleClickOutside)

  return () => {
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    )
  }
}, [])

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
  const variantChord = safeChord.replace("maj", "")
  const src =
  variantIndex === 1
    ? `/chords_final/${encodeURIComponent(safeChord)}_v1.png`
    : `/chord_variants_final/${encodeURIComponent(variantChord)}_v${variantIndex}.png`
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
      onClick={() => {
  setShow(true)
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
  pointerEvents: "auto",
}}
          >
<img
  key={src}
  src={src}
  width={120}
  alt={chord}
  draggable={false}
/>
<div
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    marginTop: "8px",
    color: "white",
    fontSize: "12px",
    pointerEvents: "auto",
  }}
>
  <button
    onClick={(e) => {
      e.stopPropagation()

      setVariantIndex((prev) =>
        Math.max(1, prev - 1)
      )
    }}
    style={{
      background: "none",
      border: "none",
      color: "white",
      cursor: "pointer",
    }}
  >
    ◀
  </button>

  <span>
    v{variantIndex} / {maxVariants}
  </span>

  <button
    onClick={(e) => {
      e.stopPropagation()

      setVariantIndex((prev) =>
        Math.min(maxVariants, prev + 1)
      )
    }}
    style={{
      background: "none",
      border: "none",
      color: "white",
      cursor: "pointer",
    }}
  >
    ▶
  </button>
</div>
          </div>
        )
      })()}
    </span>
  )
}