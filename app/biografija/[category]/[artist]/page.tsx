import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

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

      {/* BIOGRAFIJA */}
      <div style={{ marginBottom: "40px", whiteSpace: "pre-line" }}>
        {artistData.bio || "Biografija nije dostupna."}
      </div>

      {/* DISKOGRAFIJA */}
      {artistData.discography && (
        <div>
          <h2 style={{ fontSize: "22px", marginBottom: "10px" }}>
            Diskografija
          </h2>

          <div style={{ whiteSpace: "pre-line" }}>
            {typeof artistData.discography === "string"
              ? artistData.discography
              : JSON.stringify(artistData.discography, null, 2)}
          </div>
        </div>
      )}

    </div>
  )
}