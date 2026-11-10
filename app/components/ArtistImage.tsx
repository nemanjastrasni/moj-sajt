import { responsiveArtistImage, type ArtistImageVariant } from "@/lib/artistResponsive"
import ArtistImageContent from "./ArtistImageContent"

type Props = { src: string | null; name: string; variant?: ArtistImageVariant; priority?: boolean; sizes?: string }

export default function ArtistImage({ src, name, variant = "avatar", priority = false, sizes }: Props) {
  return <ArtistImageContent key={src} {...responsiveArtistImage(src, variant, sizes)} name={name} variant={variant} priority={priority} />
}
