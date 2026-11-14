import { groupDiscography } from "@/lib/discography"
import UiText from "./UiText"
import styles from "./ArtistDiscography.module.css"

export default function DiscographyTable({ value }: { value: unknown }) {
  const groups = groupDiscography(value)
  return groups.length === 0 ? <p className={styles.empty}><UiText text="Diskografija jos nije dostupna." /></p> : <>{groups.map(group => (
    <div key={group.key} className={styles.group} data-discography-group={group.kind}>
      <h3>{group.section && <>{group.section} — </>}<UiText text={group.label} /></h3>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{group.section} <UiText text={group.label} /></caption>
        <thead><tr><th scope="col"><UiText text="Godina" /></th><th scope="col"><UiText text={group.kind === "single" ? "Singl" : "Album"} /></th></tr></thead>
        <tbody>{group.albums.map(album => <tr key={JSON.stringify([album.title, album.year, album.publisher])}>
          <td className={styles.year}>{album.year || "\u2014"}</td>
          <th scope="row">{album.title}{album.publisher && <span className={styles.publisher}><UiText text="Izdavač" />: {album.publisher}</span>}</th>
        </tr>)}</tbody>
      </table>
    </div>
  ))}</>
}
