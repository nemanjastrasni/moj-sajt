"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useChordVariants } from "./useChordVariants"

type Props = {
  chord: string
  size: number
}

export default function Chord({ chord, size }: Props) {
  const previewId = useId()
  const [show, setShow] = useState(false)
  const [variantState, setVariantState] = useState({ chord, index: 1 })
  const [isDesktop, setIsDesktop] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const variants = useChordVariants(chord, show)
  const maxVariants = Math.max(1, variants.length)
  const [failedImage, setFailedImage] = useState<string | null>(null)

  const wrapperRef = useRef<HTMLSpanElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const pinnedRef = useRef(false)

  const variantIndex = Math.min(variantState.chord === chord ? variantState.index : 1, maxVariants)
  const src = variants[variantIndex - 1]?.image

  const updatePosition = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect()
    if (!rect) return

    const popupWidth = 144
    const nextLeft = Math.min(
      window.innerWidth - popupWidth - 12,
      Math.max(12, rect.left + rect.width / 2 - popupWidth / 2)
    )

    const popupHeight = popupRef.current?.getBoundingClientRect().height || 224
    const top = rect.top >= popupHeight + 8 ? rect.top - popupHeight - 8 : rect.bottom + 8
    setPosition({
      top: Math.max(8, Math.min(top, window.innerHeight - popupHeight - 8)),
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

      pinnedRef.current = false
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
        pinnedRef.current = false
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
    if (!isDesktop || pinnedRef.current) return

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
    pinnedRef.current = true
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

  return (
    <span
      ref={wrapperRef}
      role="button"
      tabIndex={0}
      aria-label={`Akord ${chord}`}
      aria-expanded={show}
      aria-controls={show ? previewId : undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape") setShow(false)
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          if (show) setShow(false)
          else openPreview()
        }
      }}
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
      onClick={(event) => {
        event.stopPropagation()

        if (isDesktop) {
          pinnedRef.current = true
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
          id={previewId}
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
            minHeight: 224,
            maxWidth: "calc(100vw - 24px)",
            background: "#111",
            padding: "8px",
            borderRadius: "8px",
            zIndex: 99999,
            boxShadow: "0 10px 25px rgba(0,0,0,0.6)",
            pointerEvents: "auto",
          }}
        >
          {src && failedImage !== src ? <img
            key={src}
            src={src}
            width={120}
            alt={chord}
            draggable={false}
            onError={() => setFailedImage(src)}
            style={{
              display: "block",
              width: "120px",
              height: "160px",
              objectFit: "contain",
              margin: "0 auto",
            }}
          /> : <div className="py-4 text-center text-sm text-gray-300">{chord}<br />Dijagram nije dostupan</div>}

          {maxVariants > 1 && <div
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
          </div>}
        </div>,
          document.body
        )}
    </span>
  )
}
