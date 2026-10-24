import { createHash } from "node:crypto"
import type { Metadata } from "next"
import manifest from "@/public/artist-photos/manifest.json"

export const metadata: Metadata = { title: "Fotografije - Photo Credits" }

export default function PhotoCreditsPage() {
  const checksum = createHash("sha256").update(JSON.stringify(manifest)).digest("hex")
  return (
    <section className="mx-auto max-w-3xl py-10" data-artist-photo-manifest={checksum}>
      <h1 className="mb-8 text-2xl font-bold">Fotografije / Photo Credits</h1>
      <div className="divide-y divide-gray-700">
        {manifest.photos.map(photo => (
          <article key={photo.artistId} id={photo.artistId} className="py-6 scroll-mt-6 break-words">
            <h2 className="mb-2 text-lg font-semibold">{photo.artistName}</h2>
            <p>{photo.title}</p>
            <p>Photo: {photo.author}</p>
            {photo.credit && <p className="text-sm">{photo.credit}</p>}
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              <a href={photo.source} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Wikimedia Commons</a>
              {photo.licenseUrl ? (
                <a href={photo.licenseUrl} target="_blank" rel="license noopener noreferrer" className="text-blue-500 underline">{photo.license}</a>
              ) : <span>{photo.license}</span>}
            </p>
            <p className="mt-2 text-sm text-gray-400">{photo.changes}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
