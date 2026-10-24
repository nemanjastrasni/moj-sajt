import { groupDiscography } from "@/lib/discography"
import ArtistWikiCredit from "./ArtistWikiCredit"
import UiText from "./UiText"
import styles from "./ArtistDiscography.module.css"

export default function ArtistDiscography({ artistId, value }: { artistId: string; value: unknown }) {
  const groups = groupDiscography(value)
  const headingId = `discography-${artistId}`
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}><UiText text="Diskografija" /></h2>
      {groups.length === 0 ? (
        <p className={styles.empty}><UiText text="Diskografija jos nije dostupna." /></p>
      ) : groups.map(group => (
        <div key={group.kind} className={styles.group}>
          <h3><UiText text={group.label} /></h3>
          <table className={styles.table}>
            <caption className={styles.srOnly}><UiText text={group.label} /></caption>
            <thead><tr><th scope="col"><UiText text="Godina" /></th><th scope="col"><UiText text="Album" /></th></tr></thead>
            <tbody>{group.albums.map(album => (
              <tr key={`${album.title}|${album.year}`}>
                <td className={styles.year}>{album.year || "\u2014"}</td>
                <th scope="row">{album.title}</th>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
      <ArtistWikiCredit artistId={artistId} field="discography" value={value} />
    </section>
  )
}
