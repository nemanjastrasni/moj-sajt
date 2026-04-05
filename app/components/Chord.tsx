"use client"

import { useState, useRef } from "react"

const BASE = "https://nemanjastrasni.github.io/Chords/dark"

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
  const rootMatch = normalized.match(/^[A-G](#|b)?/)
  const root = rootMatch ? rootMatch[0] : null

  if (!root) {
    return <span style={{ fontSize: `${size}px` }}>{chord}</span>
  }

  const encodedRoot = encodeURIComponent(root)
  const encodedChord = encodeURIComponent(normalized)
  const src = `${BASE}/${encodedRoot}/${encodedChord}.png`

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
              left: rect.left + 30,
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
            />
          </div>
        )
      })()}
    </span>
  )
}