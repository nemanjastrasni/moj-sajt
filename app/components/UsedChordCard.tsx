"use client"

import { useEffect, useMemo, useState } from "react"
import { chordImages } from "@/lib/chords/chordImages"
import { chordPositions } from "@/lib/chords/chordPositions"
import { isDuplicateChordVariant } from "@/lib/chords/chordVariantRules"

type ChordVariant = {
  index: number
  image: string
}

type Props = {
  chord: string
}

function normalizeChord(chord: string) {
  return chord.replace(/^H/, "B")
}

function toImageChord(chord: string) {
  let safeChord = normalizeChord(chord)
    .replace(/\s+/g, "")
    .replace("/", "_")
    .replace(/^Ab/, "G#")
    .replace(/^Db/, "C#")
    .replace(/^Eb/, "D#")
    .replace(/^Gb/, "F#")
    .replace(/^Bb/, "A#")

  if (/^[A-G](#)?$/.test(safeChord)) {
    safeChord = safeChord + "maj"
  }

  return safeChord
}

export default function UsedChordCard({ chord }: Props) {
  const [variants, setVariants] = useState<ChordVariant[]>([])
  const [variantPosition, setVariantPosition] = useState(0)

  const baseImage =
    chordImages[chord as keyof typeof chordImages] ??
    `/chords_final/${encodeURIComponent(toImageChord(chord))}_v1.png`

  const variantBase = useMemo(
    () => toImageChord(chord).replace("maj", ""),
    [chord]
  )

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadVariants() {
      const possibleVariants: ChordVariant[] = [
        {
          index: 1,
          image: baseImage,
        },
      ]

      const checks = await Promise.all(
        [2, 3, 4, 5, 6].map(async (index) => {
          if (isDuplicateChordVariant(variantBase, index)) {
            return null
          }

          const image = `/chord_variants_final/${encodeURIComponent(
            variantBase
          )}_v${index}.png`

          try {
            const res = await fetch(image, {
              method: "HEAD",
              signal: controller.signal,
            })

            return res.ok ? { index, image } : null
          } catch {
            return null
          }
        })
      )

      if (cancelled) return

      setVariants([
        ...possibleVariants,
        ...checks.filter((variant): variant is ChordVariant => Boolean(variant)),
      ])
      setVariantPosition(0)
    }

    loadVariants()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [baseImage, variantBase])

  const activeVariant = variants[variantPosition] ?? {
    index: 1,
    image: baseImage,
  }
  const hasVariants = variants.length > 1

  function changeVariant(direction: -1 | 1) {
    setVariantPosition((prev) =>
      Math.min(variants.length - 1, Math.max(0, prev + direction))
    )
  }

  return (
    <div className="bg-neutral-900 border border-gray-700 rounded-lg p-2 text-center min-w-[110px]">
      <div className="font-bold mb-2">{chord}</div>

      {activeVariant.image ? (
        <img
          key={activeVariant.image}
          src={activeVariant.image}
          alt={chord}
          className="w-32 h-auto object-contain mx-auto"
          draggable={false}
        />
      ) : (
        <div className="text-blue-500 text-4xl font-bold py-8">{chord}</div>
      )}

      {hasVariants && (
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-white">
          <button
            type="button"
            aria-label="Prethodna varijanta akorda"
            onClick={() => changeVariant(-1)}
            disabled={variantPosition === 0}
            className="px-2 py-1 disabled:opacity-30"
          >
            {"<"}
          </button>

          <span>
            v{variantPosition + 1} / {variants.length}
          </span>

          <button
            type="button"
            aria-label="Sledeca varijanta akorda"
            onClick={() => changeVariant(1)}
            disabled={variantPosition === variants.length - 1}
            className="px-2 py-1 disabled:opacity-30"
          >
            {">"}
          </button>
        </div>
      )}

      {chordPositions[chord] && (
        <div className="text-[11px] text-gray-400 mt-2 font-mono tracking-widest">
          {chordPositions[chord]}
        </div>
      )}
    </div>
  )
}
