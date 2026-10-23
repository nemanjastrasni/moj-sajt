"use client"

import { useEffect, useState } from "react"
import { getChordAssetName, getChordAssetUrl } from "@/lib/chords/chordAssets"
import { isDuplicateChordVariant } from "@/lib/chords/chordVariantRules"

type Variant = { index: number; image: string }
const requests = new Map<string, Promise<Variant[]>>()

export function useChordVariants(chord: string, enabled = true) {
  const name = getChordAssetName(chord)
  const baseImage = name ? getChordAssetUrl(name) : null
  const [loaded, setLoaded] = useState<{ name: string; variants: Variant[] } | null>(null)

  useEffect(() => {
    if (!enabled || !name || !baseImage) return
    let cancelled = false
    let request = requests.get(name)
    if (!request) {
      const variantName = name.replace(/maj$/, "")
      request = Promise.all([2, 3, 4, 5, 6].map(async (index): Promise<Variant | null> => {
        if (isDuplicateChordVariant(variantName, index)) return null
        const image = getChordAssetUrl(variantName, index)
        try {
          const response = await fetch(image, { method: "HEAD" })
          return response.ok ? { index, image } : null
        } catch {
          return null
        }
      })).then((variants) => [{ index: 1, image: baseImage }, ...variants.filter((variant): variant is Variant => variant !== null)])
      requests.set(name, request)
    }
    void request.then((variants) => {
      if (!cancelled) setLoaded({ name, variants })
    })
    return () => { cancelled = true }
  }, [name, baseImage, enabled])

  return loaded?.name === name ? loaded.variants : baseImage ? [{ index: 1, image: baseImage }] : []
}
