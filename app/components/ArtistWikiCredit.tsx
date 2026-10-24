import { artistWikiManifest, wikiValueHash } from "@/lib/artistWiki"

export default function ArtistWikiCredit({ artistId, field, value }: { artistId: string; field: "bio" | "discography"; value: unknown }) {
  const source = artistWikiManifest.artists.find(artist => artist.artistId === artistId)?.[field]
  if (!source || source.hash !== wikiValueHash(value)) return null
  return (
    <p className="mt-3 mb-5 text-xs leading-relaxed text-gray-400 break-words">
      <a href={source.revisionUrl} target="_blank" rel="noopener noreferrer" className="underline">Wikipedia ({source.language})</a>
      {" · "}<a href={source.historyUrl} target="_blank" rel="noopener noreferrer" className="underline">Autori / Contributors</a>
      {" · "}<a href={source.license} target="_blank" rel="license noopener noreferrer" className="underline">CC BY-SA 4.0</a>
      {" · "}<a href={`/wiki-izvori#${artistId}`} className="underline">Izvor / Source</a>
    </p>
  )
}
