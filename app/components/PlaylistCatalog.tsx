import Link from "next/link"
import { catalogEntry } from "@/lib/playlists/catalog"
import { catalogPage, catalogPageNumber } from "@/lib/playlists/catalog-server"
import { difficultyExplanation } from "@/lib/music/difficulty"
import { playlistSongHref } from "@/lib/navigation/parent"
import UiText, { CategoryLabel } from "./UiText"
import SongDifficulty from "./SongDifficulty"
import styles from "./PlaylistClient.module.css"
import difficultyStyles from "./SongDifficulty.module.css"

export default async function PlaylistCatalog({ slug, page = "1", category }: { slug: string; page?: string; category?: string }) {
  const entry = catalogEntry(slug)!
  const selectedCategory = ["domace", "strane", "narodne"].includes(category ?? "") ? category : undefined
  const { songs, total, pages, current } = await catalogPage(slug, selectedCategory ?? null, catalogPageNumber(page))
  const href = (p: number, cat?: string) => `/plejliste/${slug}?page=${p}${cat ? "&category=" + cat : ""}`
  return <section className={styles.page}>
    <h1 className={entry.level ? `${styles.title} ${difficultyStyles.label}` : styles.title} data-difficulty={entry.level ?? undefined}><UiText text={entry.title} /></h1>
    <p className={styles.notice}><UiText text={difficultyExplanation} /></p>
    <nav className={styles.actions} aria-label="Kategorije">
      {[undefined, "domace", "strane", "narodne"].map(cat => <Link key={cat ?? "all"} className={styles.button} aria-current={cat === selectedCategory ? "page" : undefined} href={href(1, cat)}>
        {cat ? <CategoryLabel value={cat} /> : <UiText text="Sve kategorije" />}
      </Link>)}
    </nav>
    <p className={styles.notice}><UiText text="Pronadjeno {count} pesama." values={{ count: total }} /></p>
    {!songs.length && <p><UiText text="Nema pesama u ovom izboru." /></p>}
    {songs.map(song => <div key={song.id} className={styles.row}>
      <Link href={playlistSongHref(song, href(current, selectedCategory))} translate="no"><span className={styles.muted}>{song.artist.name}</span>{" - "}{song.title}</Link>
      <span className={styles.level}><SongDifficulty level={song.level} /></span>
    </div>)}
    {pages > 1 && <nav className={styles.pagination} aria-label="Stranice">
      {current > 1 && <Link className={styles.button} href={href(current - 1, selectedCategory)}><UiText text="Prethodna" /></Link>}
      <span>{current} / {pages}</span>
      {current < pages && <Link className={styles.button} href={href(current + 1, selectedCategory)}><UiText text="Sledeca" /></Link>}
    </nav>}
  </section>
}
