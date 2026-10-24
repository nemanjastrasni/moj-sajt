import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import BioText from "@/app/biografija/components/BioText"
import ArtistPhotoCredit from "@/app/components/ArtistPhotoCredit"
import ArtistWikiCredit from "@/app/components/ArtistWikiCredit"
import { normalizeDiscography } from "@/lib/discography"

function cirToLat(text: string) {
  const map: any = {
    "А":"A","Б":"B","В":"V","Г":"G","Д":"D","Ђ":"Đ","Е":"E","Ж":"Ž","З":"Z","И":"I","Ј":"J","К":"K","Л":"L","Љ":"Lj","М":"M","Н":"N","Њ":"Nj","О":"O","П":"P","Р":"R","С":"S","Т":"T","Ћ":"Ć","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Č","Џ":"Dž","Ш":"Š",
    "а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"đ","е":"e","ж":"ž","з":"z","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"ć","у":"u","ф":"f","х":"h","ц":"c","ч":"č","џ":"dž","ш":"š"
  }

  return text.replace(/[А-я]/g, (l) => map[l] || l)
}

export const dynamic = "force-dynamic"

export default async function BiographyPage({ params }: any) {
  const artistSlug = (await params).artist

  const artistData = await prisma.artist.findUnique({
    where: { slug: artistSlug }
  })

  if (!artistData) notFound()
  const albums = normalizeDiscography(artistData.discography)

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>

      {/* SLIKA */}
      {artistData.image && (
        <img
          src={artistData.image}
          alt={artistData.name}
          style={{
            width: "100%",
            maxWidth: "500px",
            borderRadius: "12px",
            marginBottom: "30px"
          }}
        />
      )}

      {/* IME */}
      <ArtistPhotoCredit image={artistData.image} />
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        {artistData.name}
      </h1>

      <a
        href={`/pesme/${artistData.category}/${artistData.slug}`}
        className="text-blue-500 underline block mb-6"
      >
        ▶ Idi na pesme izvođača
      </a>

      {/* BIOGRAFIJA */}
      <div style={{ marginBottom: "40px" }}>
        <BioText text={cirToLat(artistData.bio || "Biografija nije dostupna.")} />
        <ArtistWikiCredit artistId={artistData.id} field="bio" value={artistData.bio} />
      </div>

      {/* DISKOGRAFIJA */}
      {albums.length > 0 && (
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "10px" }}>
            {albums.every(album => album.kind === "studio") ? "Studijski albumi / Studio albums" : "Diskografija"}
          </h2>

          <div style={{ whiteSpace: "pre-line" }}>
              <div className="space-y-1">
                {albums.map((album, i) => {
                  return (
                    <div key={i} className="flex gap-4">
                      <div className="w-16 shrink-0 text-gray-400">{album.year}</div>
                      <div className="min-w-0 break-words">{album.title}</div>
                    </div>
                  )
                })}
              </div>
          </div>
          <ArtistWikiCredit artistId={artistData.id} field="discography" value={artistData.discography} />
        </div>
      )}

    </div>
  )
}
