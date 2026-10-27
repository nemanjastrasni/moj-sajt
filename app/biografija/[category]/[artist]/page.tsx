import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import BioText from "@/app/biografija/components/BioText"
import ArtistPhotoCredit from "@/app/components/ArtistPhotoCredit"
import ArtistWikiCredit from "@/app/components/ArtistWikiCredit"
import ArtistDiscography from "@/app/components/ArtistDiscography"
import ArtistImage from "@/app/components/ArtistImage"
import { getArtistImage } from "@/lib/artistPhotos"
import styles from "@/app/components/ArtistMedia.module.css"
import AdminPageActions from "@/app/components/AdminPageActions"
import { artistContentVersion } from "@/lib/adminContent/server"
import { BackNavigationTarget } from "@/app/components/BackNavigation"
import { artistIndexHref } from "@/lib/navigation/parent"
import { biographyText } from "@/lib/biographies/catalog"
import UiText from "@/app/components/UiText"

function cirToLat(text: string) {
  const map: any = {
    "А":"A","Б":"B","В":"V","Г":"G","Д":"D","Ђ":"Đ","Е":"E","Ж":"Ž","З":"Z","И":"I","Ј":"J","К":"K","Л":"L","Љ":"Lj","М":"M","Н":"N","Њ":"Nj","О":"O","П":"P","Р":"R","С":"S","Т":"T","Ћ":"Ć","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Č","Џ":"Dž","Ш":"Š",
    "а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"đ","е":"e","ж":"ž","з":"z","и":"i","ј":"j","к":"k","л":"l","љ":"lj","м":"m","н":"n","њ":"nj","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"ć","у":"u","ф":"f","х":"h","ц":"c","ч":"č","џ":"dž","ш":"š"
  }

  return text.replace(/[А-я]/g, (l) => map[l] || l)
}

export const dynamic = "force-dynamic"

export default async function BiographyPage({ params }: any) {
  const { artist: artistSlug, category } = await params

  const artistData = await prisma.artist.findUnique({
    where: { slug: artistSlug }
  })

  if (!artistData) notFound()
  const image = getArtistImage(artistData)
  const biography = biographyText(artistData.bio) || biographyText(artistData.bioShort)

  return (
    <div className={styles.page}>
      <BackNavigationTarget pathname={`/biografija/${encodeURIComponent(category)}/${encodeURIComponent(artistSlug)}`} href={artistIndexHref("biografija", category, artistData.name)} />

      {/* SLIKA */}
      {image && <ArtistImage src={image} name={artistData.name} variant="portrait" priority />}

      {/* IME */}
      <ArtistPhotoCredit image={image} />
      <h1 style={{ fontSize: "32px", marginBottom: "20px" }}>
        {artistData.name}
      </h1>
      <AdminPageActions kind="artist" id={artistData.id} name={artistData.name} editHref={`/admin/artists/${encodeURIComponent(artistData.id)}/edit?from=bio`} biography={Boolean(artistData.bio || artistData.bioShort)} version={artistContentVersion(artistData)} />

      <a
        href={`/pesme/${artistData.category}/${artistData.slug}`}
        className="text-blue-500 underline block mb-6"
      >
        <UiText text="Idi na pesme izvođača" />
      </a>

      {/* BIOGRAFIJA */}
      <div style={{ marginBottom: "40px" }}>
        {biography ? <BioText text={cirToLat(biography)} /> : <p><UiText text="Biografija nije dostupna." /></p>}
        {biographyText(artistData.bio) && <ArtistWikiCredit artistId={artistData.id} field="bio" value={artistData.bio} />}
      </div>

      {/* DISKOGRAFIJA */}
      <ArtistDiscography artistId={artistData.id} value={artistData.discography} />

    </div>
  )
}
