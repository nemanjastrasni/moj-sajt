import ArtistImage from "./ArtistImage"
import ArtistPhotoCredit from "./ArtistPhotoCredit"
import styles from "./ArtistMedia.module.css"

export default function ArtistHeader({ name, image }: { name: string; image: string | null }) {
  return (
    <>
      <header className={styles.artistHeader}>
        <ArtistImage src={image} name={name} variant="portrait" priority />
        <h1>{name}</h1>
      </header>
      <ArtistPhotoCredit image={image} />
    </>
  )
}
