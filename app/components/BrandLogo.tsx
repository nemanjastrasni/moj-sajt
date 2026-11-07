import Image from "next/image"
import { SITE_NAME } from "@/lib/brand"

export default function BrandLogo() {
  return <span className="site-brand"><Image className="site-brand-image" src="/brand/gitarakordi-guitar.svg" width={371} height={148} alt={SITE_NAME} loading="eager" unoptimized /></span>
}
