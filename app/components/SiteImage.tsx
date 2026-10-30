/* eslint-disable @next/next/no-img-element -- Responsive WebP files are pre-generated, without runtime image processing. */
import images from "@/lib/site-image-manifest.json"

export type SiteImageName = keyof typeof images
export const siteImage = (name: SiteImageName) => images[name]

export default function SiteImage({ name, alt = "", className, sizes = "100vw", priority = false }: { name: SiteImageName; alt?: string; className?: string; sizes?: string; priority?: boolean }) {
  const image = siteImage(name)
  return <img src={image.src} srcSet={image.srcSet} sizes={sizes} width={image.width} height={image.height} alt={alt}
    className={className} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" />
}
