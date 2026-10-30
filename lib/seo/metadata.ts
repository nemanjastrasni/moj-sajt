import type { Metadata } from "next"
import images from "../site-image-manifest.json"
import { publicUrl, SITE_NAME } from "./site"

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const url = publicUrl(path), image = images.heroStrane
  return {
    title, description, alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "sr_RS", title, description, url, images: [{ url: publicUrl(image.src), width: image.width, height: image.height, alt: SITE_NAME }] },
    twitter: { card: "summary_large_image", title, description, images: [publicUrl(image.src)] },
  }
}
