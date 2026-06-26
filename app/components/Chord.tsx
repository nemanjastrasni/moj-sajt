"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { getChordVariantFileIndex } from "@/lib/chords/chordVariantRules"

type Props = {
  chord: string
  size: number
}

function normalizeChord(chord: string) {
  return chord
    .replace(/^H/i, "B")
    .replace(/^([A-G])is/i, "$1#")
    .replace(/^([A-G])es/i, "$1b")
}

function toImageChord(chord: string) {
  let safeChord = normalizeChord(chord)
    .replace(/\s+/g, "")
    .replace("/", "_")
    .replace(/^Cb/, "B")
    .replace(/^Ab/, "G#")
    .replace(/^Db/, "C#")
    .replace(/^Eb/, "D#")
    .replace(/^Fb/, "E")
    .replace(/^Gb/, "F#")
    .replace(/^Bb/, "A#")
    .replace(/^E#/, "F")
    .replace(/^B#/, "C")

  if (/^[A-G](#)?$/.test(safeChord)) {
    safeChord = safeChord + "maj"
  }

  return safeChord
}

export default function Chord({ chord, size }: Props) {
  const previewId = useId()
  const [show, setShow] = useState(false)
  const [variantState, setVariantState] = useState({ chord, index: 1 })
  const [isDesktop, setIsDesktop] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const maxVariants = 4

  const wrapperRef = useRef<HTMLSpanElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const handledTouchRef = useRef(false)
  const lastTouchToggleRef = useRef(0)

  const normalized = useMemo(() => normalizeChord(chord), [chord])
  const safeChord = useMemo(() => toImageChord(chord), [chord])
  const variantIndex = variantState.chord === chord ? variantState.index : 1
  const variantChord = safeChord.replace("maj", "")
  const variantFileIndex = getChordVariantFileIndex(variantChord, variantIndex)
  const rootMatch = normalized.match(/^[A-G](#|b)?/)
  const root = rootMatch ? rootMatch[0] : null

  const src =
    variantIndex === 1
      ? `/chords_final/${encodeURIComponent(safeChord)}_v1.png`
      : `/chord_variants_final/${encodeURIComponent(
          variantChord
        )}_v${variantFileIndex}.png`

  const updatePosition = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return

    const popupWidth = 144
    const nextLeft = Math.min(
      window.innerWidth - popupWidth - 12,
      Math.max(12, rect.left + rect.width / 2 - popupWidth / 2)
    )

    setPosition({
      top: Math.max(12, rect.top - 166),
      left: nextLeft,
    })
  }, [])

  useEffect(() => {
    const updateMode = () => {
      setIsDesktop(window.matchMedia("(hover: hover) and (pointer: fine)").matches)
    }

    updateMode()
    window.addEventListener("resize", updateMode)

    return () => window.removeEventListener("resize", updateMode)
  }, [])

  useEffect(() => {
    if (!show) return

    const handleOutsidePress = (event: Event) => {
      const target = event.target as Node

      if (wrapperRef.current?.contains(target)) return
      if (popupRef.current?.contains(target)) return

      setShow(false)
    }

    document.addEventListener("pointerdown", handleOutsidePress)
    document.addEventListener("touchstart", handleOutsidePress)

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePress)
      document.removeEventListener("touchstart", handleOutsidePress)
    }
  }, [show])

  useEffect(() => {
    const handleOtherPreview = (event: Event) => {
      const customEvent = event as CustomEvent<string>
      if (customEvent.detail !== previewId) {
        setShow(false)
      }
    }

    window.addEventListener("chord-preview-open", handleOtherPreview)

    return () => {
      window.removeEventListener("chord-preview-open", handleOtherPreview)
    }
  }, [previewId])

  useEffect(() => {
    if (!show) return

    const updateOpenPosition = () => updatePosition()

    window.addEventListener("scroll", updateOpenPosition, true)
    window.addEventListener("resize", updateOpenPosition)

    return () => {
      window.removeEventListener("scroll", updateOpenPosition, true)
      window.removeEventListener("resize", updateOpenPosition)
    }
  }, [show, updatePosition])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  if (!root) {
    return <span style={{ fontSize: `${size}px` }}>{chord}</span>
  }

  function openPreview(resetVariant = false) {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    if (resetVariant) {
      setVariantState({ chord, index: 1 })
    }

    updatePosition()
    setShow(true)
    window.dispatchEvent(
      new CustomEvent("chord-preview-open", { detail: previewId })
    )
  }

  function closePreviewSoon() {
    if (!isDesktop) return

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
    }

    closeTimerRef.current = window.setTimeout(() => {
      setShow(false)
    }, 120)
  }

  function keepPreviewOpen() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function changeVariant(direction: -1 | 1) {
    keepPreviewOpen()
    setShow(true)
    window.dispatchEvent(
      new CustomEvent("chord-preview-open", { detail: previewId })
    )
    setVariantState((prev) => {
      const currentIndex = prev.chord === chord ? prev.index : 1

      return {
        chord,
        index: Math.min(maxVariants, Math.max(1, currentIndex + direction)),
      }
    })
  }

  function toggleTouchPreview() {
    const now = Date.now()

    if (now - lastTouchToggleRef.current < 350) return

    lastTouchToggleRef.current = now
    handledTouchRef.current = true

    if (show) {
      setShow(false)
    } else {
      openPreview(true)
    }

    window.setTimeout(() => {
      handledTouchRef.current = false
    }, 450)
  }

  return (
    <span
      ref={wrapperRef}
      style={{
        fontWeight: "bold",
        color: "#1a73e8",
        cursor: "pointer",
        position: "relative",
        display: "inline-block",
        zIndex: show ? 99999 : 10,
        fontSize: `${size}px`,
        touchAction: "manipulation",
      }}
      onMouseEnter={() => {
        if (isDesktop) openPreview()
      }}
      onMouseLeave={closePreviewSoon}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" || isDesktop) return

        event.stopPropagation()
        toggleTouchPreview()
      }}
      onTouchEnd={(event) => {
        if (isDesktop) return

        event.preventDefault()
        event.stopPropagation()
        toggleTouchPreview()
      }}
      onClick={(event) => {
        event.stopPropagation()

        if (
          handledTouchRef.current ||
          Date.now() - lastTouchToggleRef.current < 450
        ) {
          return
        }

        if (isDesktop) {
          openPreview()
          return
        }

        if (show) {
          setShow(false)
        } else {
          openPreview(true)
        }
      }}
    >
      {chord}

      {show &&
        typeof document !== "undefined" &&
        createPortal(
        <div
          ref={popupRef}
          onMouseEnter={keepPreviewOpen}
          onMouseLeave={closePreviewSoon}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onTouchEnd={(event) => event.stopPropagation()}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            bottom: "auto",
            transform: "none",
            width: 144,
            maxWidth: "calc(100vw - 24px)",
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
            style={{
              display: "block",
              width: "120px",
              height: "auto",
              margin: "0 auto",
            }}
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
            }}
          >
            <button
              type="button"
              aria-label="Prethodna varijanta akorda"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                changeVariant(-1)
              }}
              disabled={variantIndex === 1}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: variantIndex === 1 ? "default" : "pointer",
                opacity: variantIndex === 1 ? 0.35 : 1,
                padding: "6px",
                minWidth: "32px",
                minHeight: "32px",
                touchAction: "manipulation",
              }}
            >
              {"<"}
            </button>

            <span>v{variantIndex} / {maxVariants}</span>

            <button
              type="button"
              aria-label="Sledeca varijanta akorda"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                changeVariant(1)
              }}
              disabled={variantIndex === maxVariants}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: variantIndex === maxVariants ? "default" : "pointer",
                opacity: variantIndex === maxVariants ? 0.35 : 1,
                padding: "6px",
                minWidth: "32px",
                minHeight: "32px",
                touchAction: "manipulation",
              }}
            >
              {">"}
            </button>
          </div>
        </div>,
          document.body
        )}
    </span>
  )
}
