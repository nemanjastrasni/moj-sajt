"use client"

import { useState } from "react"
import { artistInitials, safeArtistImage } from "@/lib/artistMedia"
import styles from "./ArtistMedia.module.css"

type Props = {
  src: string | null
  name: string
  variant?: "avatar" | "tile" | "portrait"
  priority?: boolean
}

export default function ArtistImage({ src, name, variant = "avatar", priority = false }: Props) {
  const image = safeArtistImage(src)
  const [failed, setFailed] = useState<string | null>(null)
  return (
    <span className={`${styles.image} ${styles[variant]}`}>
      {image && failed !== image ? (
        <img
          src={image}
          alt={name}
          width={variant === "avatar" ? 40 : 640}
          height={variant === "avatar" ? 40 : 480}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          ref={node => {
            // Cached failures can finish before React attaches the error handler.
            if (node?.complete && node.naturalWidth === 0) setFailed(image)
          }}
          onError={() => setFailed(image)}
        />
      ) : (
        <span className={styles.initials} role="img" aria-label={name}>{artistInitials(name)}</span>
      )}
    </span>
  )
}
