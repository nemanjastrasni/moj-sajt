import Link from "next/link"
import { catalogEntry } from "@/lib/playlists/catalog-model"
import { catalogPage, catalogPageNumber } from "@/lib/playlists/catalog-server"
import { difficultyExplanation } from "@/lib/music/difficultyModel"
import { playlistSongHref } from "@/lib/navigation/parent"
import UiText, { CategoryLabel } from "./UiText"
import SongDifficulty from "./SongDifficulty"
import styles from "./PlaylistClient.module.css"
import difficultyStyles from "./SongDifficulty.module.css"
import { playlistCatalogContent } from "@/lib/seo/playlistContent"
import { catalogBrowseHref } from "@/lib/playlists/catalog-url"
import GuideText from "./GuideText"

export default async function PlaylistCatalog({ slug, page = "1", category }: { slug: string; page?: string; category?: string }) {
  const entry = catalogEntry(slug)!
  const copy = playlistCatalogContent(slug)
  const selectedCategory = ["domace", "strane", "narodne"].includes(category ?? "") ? category : undefined
  const { songs, total, pages, current } = await catalogPage(slug, selectedCategory ?? null, catalogPageNumber(page))
  const href = (p: number, cat?: string) => catalogBrowseHref(slug, p, cat)
  return <section className={styles.page}>
    <h1 className={entry.level ? `${styles.title} ${difficultyStyles.label}` : styles.title} data-difficulty={entry.level ?? undefined}>{copy ? <GuideText text={copy.heading} /> : <UiText text={entry.title} />}</h1>
    {copy && <p className={styles.notice}><GuideText text={copy.intro} /></p>}
    <p className={styles.notice}><UiText text={difficultyExplanation} /></p>
    <nav className={styles.actions} aria-label="Kategorije">
      {[undefined, "domace", "strane", "narodne"].map(cat => <Link key={cat ?? "all"} prefetch={false} className={styles.button} aria-current={cat === selectedCategory ? "page" : undefined} href={href(1, cat)}>
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
      {current > 1 && <Link prefetch={false} className={styles.button} href={href(current - 1, selectedCategory)}><UiText text="Prethodna" /></Link>}
      <span>{current} / {pages}</span>
      {current < pages && <Link prefetch={false} className={styles.button} href={href(current + 1, selectedCategory)}><UiText text="Sledeca" /></Link>}
    </nav>}
    {copy && <nav className={styles.actions} aria-label="Vodiči za sviranje">
      <Link href="/akordi" prefetch={false} className={styles.button}><GuideText text={{ sr: "Dijagrami akorda", en: "Chord diagrams" }} /></Link>
      <Link href="/vodici/kako-se-citaju-akordi-za-gitaru" prefetch={false} className={styles.button}><GuideText text={{ sr: "Kako se čitaju akordi", en: "How to read chords" }} /></Link>
      <Link href="/vodici/vezbanje-promene-akorda" prefetch={false} className={styles.button}><GuideText text={{ sr: "Vežbanje promene hvatova", en: "Practise chord changes" }} /></Link>
    </nav>}
  </section>
}
