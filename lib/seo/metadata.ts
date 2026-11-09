import type { Metadata } from "next"
import { SOCIAL_IMAGE } from "./social-image"
import { publicUrl, SITE_NAME } from "./site"

type PublicMetadataOptions = {
  image?: string | null
  canonicalQuery?: Record<string, string>
}

export function publicPageMetadata(title: string, description: string, path: string, options: PublicMetadataOptions = {}): Metadata {
  const canonical = new URL(publicUrl(path))
  for (const [key, value] of Object.entries(options.canonicalQuery ?? {})) canonical.searchParams.set(key, value)
  const url = canonical.href
  const fallback = SOCIAL_IMAGE
  const image = options.image
    ? { url: options.image.startsWith("/") ? publicUrl(options.image) : options.image, alt: title }
    : { url: publicUrl(fallback.src), width: fallback.width, height: fallback.height, alt: fallback.alt }
  return {
    title, description, alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "sr_RS", title, description, url, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  }
}
