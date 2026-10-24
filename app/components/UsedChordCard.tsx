"use client"

import { useI18n } from "@/app/components/UiText"
import { useState } from "react"
import { chordPositions } from "@/lib/chords/chordPositions"
import { useChordVariants } from "./useChordVariants"

type Props = {
  chord: string
}

export default function UsedChordCard({ chord }: Props) {
  const { t } = useI18n()

  const variants = useChordVariants(chord)
  const [selection, setSelection] = useState({ chord, position: 0 })
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const variantPosition = selection.chord === chord ? Math.min(selection.position, Math.max(0, variants.length - 1)) : 0
  const activeVariant = variants[variantPosition]
  const hasVariants = variants.length > 1

  function changeVariant(direction: -1 | 1) {
    setSelection({ chord, position: Math.min(variants.length - 1, Math.max(0, variantPosition + direction)) })
  }

  return (
    <div className="bg-neutral-900 border border-gray-700 rounded-lg p-2 text-center min-w-[110px]">
      <div className="font-bold mb-2">{chord}</div>

      {activeVariant?.image && failedImage !== activeVariant.image ? (
        <img
          key={activeVariant.image}
          src={activeVariant.image}
          alt={chord}
          className="chord-art w-32 h-auto object-contain mx-auto"
          draggable={false}
          onError={() => setFailedImage(activeVariant.image)}
        />
      ) : (
        <div className="w-32 min-h-40 flex items-center justify-center text-xs text-gray-400">{t("Dijagram nije dostupan")}</div>
      )}

      {hasVariants && (
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-white">
          <button
            type="button"
            aria-label={t("Prethodna varijanta akorda")}
            onClick={() => changeVariant(-1)}
            disabled={variantPosition === 0}
            className="min-w-8 min-h-8 px-2 py-1 touch-manipulation disabled:opacity-30"
          >
            {"<"}
          </button>

          <span>
            v{variantPosition + 1} / {variants.length}
          </span>

          <button
            type="button"
            aria-label={t("Sledeca varijanta akorda")}
            onClick={() => changeVariant(1)}
            disabled={variantPosition === variants.length - 1}
            className="min-w-8 min-h-8 px-2 py-1 touch-manipulation disabled:opacity-30"
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
