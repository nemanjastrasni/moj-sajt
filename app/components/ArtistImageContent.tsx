/* eslint-disable @next/next/no-img-element -- Static, responsive WebP files require no runtime image service. */
"use client"

import { useState } from "react"
import { artistInitials } from "@/lib/artistMedia"
import type { ArtistImageVariant } from "@/lib/artistResponsive"
import styles from "./ArtistMedia.module.css"

type Props = { image: string | null; src: string | null; srcSet?: string; sizes?: string; width: number; height: number; name: string; variant: ArtistImageVariant; priority: boolean }
export default function ArtistImageContent({ image, src, srcSet, sizes, width, height, name, variant, priority }: Props) {
  const [failure, setFailure] = useState<"none" | "thumbnail" | "original">("none")
  const optimized = failure === "none" && src !== image
  function failed() { setFailure(optimized ? "thumbnail" : "original") }
  return <span className={`${styles.image} ${styles[variant]}`}>
    {image && failure !== "original" ? <img
      key={optimized ? src : image} src={(optimized ? src : image)!} srcSet={failure === "none" ? srcSet : undefined} sizes={failure === "none" ? sizes : undefined}
      alt={name} width={width} height={height} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async"
      ref={node => { if (node?.complete && node.naturalWidth === 0) failed() }} onError={failed}
    /> : <span className={styles.initials} role="img" aria-label={name}>{artistInitials(name)}</span>}
  </span>
}
