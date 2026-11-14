import DiscographyTable from "./DiscographyTable"
import ArtistWikiCredit from "./ArtistWikiCredit"
import UiText from "./UiText"
import styles from "./ArtistDiscography.module.css"

export default function ArtistDiscography({ artistId, value }: { artistId: string; value: unknown }) {
  const headingId = `discography-${artistId}`
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}><UiText text="Diskografija" /></h2>
      <DiscographyTable value={value} />
      <ArtistWikiCredit artistId={artistId} field="discography" value={value} />
    </section>
  )
}
