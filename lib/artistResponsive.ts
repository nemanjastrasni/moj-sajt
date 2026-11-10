import variants from "./artist-image-variants.json"
import { safeArtistImage } from "./artistMedia"

export type ArtistImageVariant = "avatar" | "tile" | "portrait"
type Candidate = { src: string; width: number; height: number; bytes: number }
const images = variants as Record<string, Candidate[]>
const defaultSizes = {
  avatar: "40px",
  tile: "(max-width: 600px) calc((100vw - 76px) / 2), (max-width: 900px) calc((100vw - 112px) / 3), (max-width: 1064px) calc((100vw - 128px) / 4), 226px",
  portrait: "(max-width: 600px) calc(100vw - 64px), 500px",
}

// This manifest stays on the server. Only the chosen image's candidates reach a browser.
export function responsiveArtistImage(source: string | null, variant: ArtistImageVariant, sizes?: string) {
  const image = safeArtistImage(source), candidates = image ? images[image] : undefined
  if (!image || !candidates?.length) return { image, src: image, srcSet: undefined, sizes: undefined, width: variant === "avatar" ? 40 : 640, height: variant === "avatar" ? 40 : 480 }
  const choices = variant === "avatar" ? candidates.filter(row => row.width <= 160) : candidates
  const available = choices.length ? choices : [candidates[0]]
  const fallback = available.find(row => row.width >= (variant === "avatar" ? 80 : 320)) ?? available.at(-1)!
  return { image, src: fallback.src, srcSet: available.map(row => `${row.src} ${row.width}w`).join(", "), sizes: sizes ?? defaultSizes[variant], width: fallback.width, height: fallback.height }
}
