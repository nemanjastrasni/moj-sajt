import type { Metadata } from "next"
import { artistWikiManifest, wikiValueHash, type WikiSource } from "@/lib/artistWiki"

export const metadata: Metadata = { title: "Wikipedia - izvori i autori" }
export default function WikiCreditsPage() {
  return (
    <section className="mx-auto max-w-3xl py-10" data-artist-wiki-manifest={wikiValueHash(artistWikiManifest)}>
      <h1 className="mb-8 text-2xl font-bold">Wikipedia: izvori / Sources</h1>
      <div className="divide-y divide-gray-700">
        {artistWikiManifest.artists.map(artist => (
          <article id={artist.artistId} key={artist.artistId} className="py-6 scroll-mt-6 break-words">
            <h2 className="text-lg font-semibold">{artist.artistName}</h2>
            {(["bio", "discography"] as const).filter(field => artist[field]).map(field => {
              const source = artist[field] as WikiSource
              return <div key={field} className="mt-4">
                <h3 className="font-medium">{field === "bio" ? "Biografija / Biography" : "Diskografija / Discography"}</h3>
                <p>{source.title} ({source.language}) · revision {source.revisionId}</p>
                <p className="my-2 flex flex-wrap gap-x-4 gap-y-2">
                  <a href={source.revisionUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Wikipedia</a>
                  <a href={source.historyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Autori / Contributors</a>
                  <a href={source.license} target="_blank" rel="license noopener noreferrer" className="text-blue-500 underline">CC BY-SA 4.0</a>
                </p>
                <p className="text-sm text-gray-400">{source.changes}</p>
              </div>
            })}
          </article>
        ))}
      </div>
    </section>
  )
}
