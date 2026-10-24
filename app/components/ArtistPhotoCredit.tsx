import Link from "next/link"
import manifest from "@/public/artist-photos/manifest.json"

export default function ArtistPhotoCredit({ image }: { image: string | null }) {
  const photo = manifest.photos.find(photo => photo.image === image)
  if (!photo) return null
  return (
    <p className="mt-2 mb-4 text-xs leading-relaxed text-gray-400 break-words">
      Photo: {photo.author} · {photo.license}{" "}
      <Link href={`/foto-izvori#${photo.artistId}`} className="underline underline-offset-2">
        Izvor / Source
      </Link>
    </p>
  )
}
