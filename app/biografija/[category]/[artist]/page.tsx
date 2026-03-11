import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

function cirToLat(text:string){

const map:any={
"А":"A","Б":"B","В":"V","Г":"G","Д":"D","Ђ":"Đ","Е":"E","Ж":"Ž","З":"Z","И":"I","Ј":"J","К":"K","Л":"L","Љ":"Lj","М":"M","Н":"N","Њ":"Nj","О":"O","П":"P","Р":"R","С":"S","Т":"T","Ћ":"Ć","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Č","Џ":"Dž","Ш":"Š",
"а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"đ","е":"e","ж":"ž","з":"z","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"ć","у":"u","ф":"f","х":"h","ц":"c","ч":"č","џ":"dž","ш":"š"
}

return text.replace(/[А-я]/g,(l)=>map[l]||l)

}

export const dynamic = "force-dynamic"

export default async function BiographyPage({ params }: any) {

  const artistSlug = params.artist

  const artistData = await prisma.artist.findUnique({
    where: { slug: artistSlug }
  })

  if (!artistData) notFound()

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
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        {artistData.name}
      </h1>
      <a
  href={`/pesme/${artistData.category}/${artistData.slug}`}
  className="text-blue-500 underline block mb-6"
>
  → Pogledaj pesme izvođača
</a>

      {/* BIOGRAFIJA */}
      <div style={{ marginBottom: "40px", whiteSpace: "pre-line" }}>
        {cirToLat(artistData.bio || "Biografija nije dostupna.")}
      </div>

      {/* DISKOGRAFIJA */}
      {artistData.discography && (
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "10px" }}>
            Diskografija
          </h2>

          <div style={{ whiteSpace: "pre-line" }}>
            {Array.isArray(artistData.discography) && (
  <div className="space-y-1">
    {artistData.discography.map((item: any, i: number) => {
       const text = String(item)

      const match = text.match(/(\d{4})/)
      const year = match ? match[0] : ""
      const album = text.replace(/\(\d{4}\)/, "").trim()

      return (
        <div key={i} className="flex gap-4">
          <div className="w-16 text-gray-400">{year}</div>
          <div>{album}</div>
        </div>
      )
    })}
  </div>
)}
          </div>
        </div>
      )}

    </div>
  )
}