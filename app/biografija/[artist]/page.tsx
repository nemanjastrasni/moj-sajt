import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function BiographyPage({ params }: any) {
  const { artist } = await params

  const artistData = await prisma.artist.findFirst({
    where: { slug: artist },
  })

  if (!artistData) notFound()

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
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
            {artistData.discography}
          </div>
        </div>
      )}
    </div>
  )
}